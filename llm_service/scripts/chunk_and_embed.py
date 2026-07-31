"""Chunk Qiskit/documentation's docs/learning trees and embed into a local
Qdrant collection (IMPLEMENTATION_PLAN.md Section 6, Phase 4).

Scope decision made after inspecting the actual scraped repo, not assumed:
docs/api/<package>/ keeps full historical snapshots in versioned subdirs
(e.g. docs/api/qiskit/2.4/, .../1.0/, ...) alongside the current version at
the top level - 9454/11360 mdx files under docs/ are OLD-VERSION duplicates
(83%). Only non-versioned (current) files are chunked; the old versions
would just add stale, near-duplicate content and actively hurt retrieval
(Section 11's "hallucinated/outdated APIs" risk, not help it).

Chunk size is targeted in characters (~1600, cap 2400), not tokens: the
embedder has its own tokenizer separate from Qwen3's, and character count is
a cheap, good-enough proxy for the ~300-400 token target in Section 6
without loading a second tokenizer just to make chunking decisions. This
also keeps chunks comfortably under bge-small-en-v1.5's 512-token context.

Split into two pieces so the scheduled refresh (Section 7) doesn't need a
network-reachable vector DB:

  --build-corpus   Scrape-independent: walks the already-scraped repo, hashes
                    each eligible file's content, and only re-chunks files
                    whose hash changed since the last run (tracked in
                    rag/corpus/manifest.json) - correct even on a shallow
                    clone, where `git diff <old_sha> <new_sha>` isn't
                    possible because the old commit's objects aren't present.
                    Writes rag/corpus/chunks.jsonl + manifest.json, both
                    small enough to commit to git directly (plain text,
                    reviewable diffs) - this is what the GitHub Actions
                    workflow runs, with zero ML dependencies (no torch/
                    transformers/qdrant-client needed just to chunk text).
  --embed-from-corpus  Reads rag/corpus/chunks.jsonl, embeds with
                    BAAI/bge-small-en-v1.5 (dense, 384-dim) via
                    `sentence-transformers`, and upserts into a fresh local
                    Qdrant collection, then atomically swaps the `qiskit_docs`
                    alias to it (Section 7's zero-downtime reindex) so
                    retrieval never sees a half-updated index. Run this
                    locally/at serve time, not in CI.

No args runs both in sequence (the full local pipeline in one command).
"""

import hashlib
import json
import re
import subprocess
from datetime import datetime, timezone
from pathlib import Path

from tqdm import tqdm

DOCS_ROOT = Path("rag/qiskit-api-docs")
CORPUS_DIR = Path("rag/corpus")
CHUNKS_PATH = CORPUS_DIR / "chunks.jsonl"
MANIFEST_PATH = CORPUS_DIR / "manifest.json"
SCAN_DIRS = ["docs", "learning"]
CHUNK_TARGET_CHARS = 1600
CHUNK_HARD_MAX_CHARS = 2400

EMBED_MODEL = "BAAI/bge-small-en-v1.5"
EMBED_DIM = 384
EMBED_BATCH_SIZE = 64
QDRANT_PATH = "rag/qdrant_storage"
COLLECTION_ALIAS = "qiskit_docs"

VERSIONED_DIR_RE = re.compile(r"(^|[/\\])\d+\.\d+(\.\d+)?([/\\]|$)")
HEADING_RE = re.compile(r"^#{2,4}\s+")
FRONTMATTER_RE = re.compile(r"^---\n(.*?)\n---\n(.*)$", re.DOTALL)


def is_eligible_path(path: Path) -> bool:
    """Excludes numbered version snapshots (docs/api/qiskit/2.4/...), the
    `dev/` tree (unreleased nightly build - its APIs may not exist in the
    installed release), and release-notes changelogs. The latter was found
    experimentally, not assumed: retrieval verification on 10 known-answer
    queries showed release-notes pages (e.g. "Qiskit 0.39 release notes")
    outranking the actual API reference page for "how do I use X" queries -
    changelogs densely list API names/params in short entries, which creates
    deceptively high semantic similarity without being the right content
    type to answer a usage question."""
    if VERSIONED_DIR_RE.search(str(path)):
        return False
    if "dev" in path.parts or "release-notes" in path.parts:
        return False
    return True


def discover_files() -> list[Path]:
    files = []
    for d in SCAN_DIRS:
        for ext in ("*.mdx", "*.md", "*.ipynb"):
            files.extend((DOCS_ROOT / d).rglob(ext))
    return sorted(p for p in files if is_eligible_path(p))


def notebook_to_text(path: Path) -> str:
    nb = json.loads(path.read_text(encoding="utf-8"))
    parts = []
    for cell in nb["cells"]:
        src = "".join(cell["source"])
        if not src.strip():
            continue
        if cell["cell_type"] == "code":
            parts.append(f"```python\n{src}\n```")
        elif cell["cell_type"] == "markdown":
            parts.append(src)
    return "\n\n".join(parts)


def read_text(path: Path) -> str:
    if path.suffix == ".ipynb":
        return notebook_to_text(path)
    return path.read_text(encoding="utf-8")


def strip_frontmatter(text: str) -> tuple[dict, str]:
    m = FRONTMATTER_RE.match(text)
    if not m:
        return {}, text
    meta = {}
    for line in m.group(1).split("\n"):
        if ":" in line:
            k, _, v = line.partition(":")
            meta[k.strip()] = v.strip().strip('"')
    return meta, m.group(2)


def split_into_sections(body: str) -> list[str]:
    """Split on h2-h4 headings; keep the h1/intro as its own leading section."""
    lines = body.split("\n")
    sections, current = [], []
    for line in lines:
        if HEADING_RE.match(line) and current:
            sections.append("\n".join(current))
            current = [line]
        else:
            current.append(line)
    if current:
        sections.append("\n".join(current))
    return [s for s in sections if s.strip()]


def split_respecting_code_fences(text: str, target: int = CHUNK_TARGET_CHARS, hard_max: int = CHUNK_HARD_MAX_CHARS) -> list[str]:
    """Greedily pack blocks up to ~target chars; a fenced ```...``` block is
    always kept atomic (never split across chunks), even if that pushes a
    chunk past hard_max."""
    blocks, buf, lines, i = [], [], text.split("\n"), 0
    while i < len(lines):
        line = lines[i]
        if line.strip().startswith("```"):
            if buf:
                blocks.append("\n".join(buf))
                buf = []
            fence = [line]
            i += 1
            while i < len(lines) and not lines[i].strip().startswith("```"):
                fence.append(lines[i])
                i += 1
            if i < len(lines):
                fence.append(lines[i])
                i += 1
            blocks.append("\n".join(fence))
        else:
            buf.append(line)
            i += 1
    if buf:
        blocks.append("\n".join(buf))

    chunks, cur = [], ""
    for block in blocks:
        if not block.strip():
            continue
        if not cur:
            cur = block
        elif len(cur) + len(block) + 2 <= target:
            cur += "\n\n" + block
        else:
            chunks.append(cur)
            cur = block
        if len(cur) > hard_max:
            chunks.append(cur)
            cur = ""
    if cur:
        chunks.append(cur)
    return chunks


def doc_type_for(path: Path) -> str:
    parts = path.parts
    if "api" in parts:
        return "api_reference"
    if "tutorials" in parts:
        return "tutorial"
    return "guide"


def url_for(path: Path) -> str:
    rel = path.relative_to(DOCS_ROOT).with_suffix("")
    return f"https://quantum.cloud.ibm.com/{str(rel).replace(chr(92), '/')}"


def chunk_file(path: Path, commit_sha: str, text: str | None = None) -> list[dict]:
    if text is None:
        text = read_text(path)
    meta, body = strip_frontmatter(text)
    symbol = meta.get("python_api_name") or meta.get("title") or path.stem
    doc_type = doc_type_for(path)
    rel_path = str(path.relative_to(DOCS_ROOT)).replace("\\", "/")
    url = url_for(path)

    chunks = []
    for section in split_into_sections(body):
        chunks.extend(split_respecting_code_fences(section))

    return [
        {
            "text": chunk,
            "doc_path": rel_path,
            "symbol": symbol,
            "doc_type": doc_type,
            "qiskit_version": "latest",
            "source_repo": "Qiskit/documentation",
            "commit_sha": commit_sha,
            "chunk_index": i,
            "url": url,
        }
        for i, chunk in enumerate(chunks)
        if chunk.strip()
    ]


def selfcheck() -> None:
    assert is_eligible_path(Path("docs/api/qiskit/circuit.mdx"))
    assert not is_eligible_path(Path("docs/api/qiskit/2.4/circuit.mdx"))
    assert not is_eligible_path(Path("docs/api/qiskit-ibm-runtime/0.46/foo.mdx"))
    assert not is_eligible_path(Path("docs/api/qiskit/dev/qiskit.visualization.plot_histogram.mdx"))
    assert not is_eligible_path(Path("docs/api/qiskit/release-notes/0.39.mdx"))

    meta, body = strip_frontmatter("---\ntitle: Foo\ndescription: Bar\n---\n# Foo\ntext")
    assert meta == {"title": "Foo", "description": "Bar"}
    assert body == "# Foo\ntext"

    sections = split_into_sections("# Title\nintro\n## A\ntext a\n### B\ntext b")
    assert len(sections) == 3
    assert sections[0].startswith("# Title")
    assert sections[1].startswith("## A")
    assert sections[2].startswith("### B")

    # a code fence must never be split even when it alone exceeds target
    long_code = "```python\n" + ("x = 1\n" * 500) + "```"
    text = f"para one\n\n{long_code}\n\npara two"
    chunks = split_respecting_code_fences(text, target=50, hard_max=100)
    assert any(long_code in c for c in chunks), "fenced code block was split"
    joined = "\n\n".join(chunks)
    assert joined.count("```") == 2  # exactly one open+close pair, not fragmented

    assert doc_type_for(Path("rag/qiskit-api-docs/docs/api/qiskit/circuit.mdx")) == "api_reference"
    assert doc_type_for(Path("rag/qiskit-api-docs/docs/tutorials/chsh-inequality.ipynb")) == "tutorial"
    assert doc_type_for(Path("rag/qiskit-api-docs/docs/guides/composer.mdx")) == "guide"

    assert content_hash("abc") == content_hash("abc")
    assert content_hash("abc") != content_hash("abd")

    print("selfcheck OK")


# --------------------------------------------------------------------------
# Corpus building (incremental, no ML deps - what CI runs)
# --------------------------------------------------------------------------

def get_commit_sha() -> str:
    result = subprocess.run(["git", "rev-parse", "HEAD"], cwd=DOCS_ROOT, capture_output=True, text=True, check=True)
    return result.stdout.strip()


def content_hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def load_manifest() -> dict[str, str]:
    if MANIFEST_PATH.exists():
        return json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    return {}


def load_existing_chunks_by_doc() -> dict[str, list[dict]]:
    by_doc: dict[str, list[dict]] = {}
    if CHUNKS_PATH.exists():
        for line in CHUNKS_PATH.read_text(encoding="utf-8").splitlines():
            if line.strip():
                chunk = json.loads(line)
                by_doc.setdefault(chunk["doc_path"], []).append(chunk)
    return by_doc


def build_corpus() -> None:
    """Incremental by content hash, not `git diff <old_sha> <new_sha>`: the
    scrape is a shallow/sparse clone, so the previous commit's objects
    usually aren't present locally to diff against. Comparing each file's
    hash to what's recorded in manifest.json works regardless of clone depth
    and is what actually determines "did this file change", which is the
    real question - not "did the commit sha change" (every scrape gets a new
    sha even when zero doc content changed)."""
    sha = get_commit_sha()
    old_manifest = load_manifest()
    old_chunks_by_doc = load_existing_chunks_by_doc()

    files = discover_files()
    new_manifest: dict[str, str] = {}
    by_doc: dict[str, list[dict]] = {}
    n_reused = n_rechunked = 0

    for f in tqdm(files, desc="building corpus"):
        rel_path = str(f.relative_to(DOCS_ROOT)).replace("\\", "/")
        text = read_text(f)
        h = content_hash(text)
        new_manifest[rel_path] = h

        if old_manifest.get(rel_path) == h and rel_path in old_chunks_by_doc:
            by_doc[rel_path] = old_chunks_by_doc[rel_path]
            n_reused += 1
        else:
            by_doc[rel_path] = chunk_file(f, sha, text=text)
            n_rechunked += 1

    CORPUS_DIR.mkdir(parents=True, exist_ok=True)
    with open(CHUNKS_PATH, "w", encoding="utf-8") as fh:
        for rel_path in sorted(by_doc):
            for chunk in by_doc[rel_path]:
                fh.write(json.dumps(chunk, ensure_ascii=False) + "\n")
    MANIFEST_PATH.write_text(json.dumps(new_manifest, indent=2, sort_keys=True), encoding="utf-8")

    n_removed = len(set(old_manifest) - set(new_manifest))
    total_chunks = sum(len(v) for v in by_doc.values())
    print(
        f"Corpus built at commit {sha}: {len(files)} files "
        f"({n_rechunked} changed/new, {n_reused} unchanged, {n_removed} removed), "
        f"{total_chunks} chunks -> {CHUNKS_PATH}"
    )


# --------------------------------------------------------------------------
# Embedding + Qdrant (requires sentence-transformers/qdrant-client; run
# locally/at serve time, never in CI)
# --------------------------------------------------------------------------

def load_corpus_chunks() -> list[dict]:
    if not CHUNKS_PATH.exists():
        raise SystemExit(f"{CHUNKS_PATH} not found - run --build-corpus first.")
    return [json.loads(line) for line in CHUNKS_PATH.read_text(encoding="utf-8").splitlines() if line.strip()]


def embed_and_upsert_from_corpus() -> None:
    from qdrant_client import QdrantClient, models
    from sentence_transformers import SentenceTransformer

    chunks = load_corpus_chunks()
    model = SentenceTransformer(EMBED_MODEL)
    client = QdrantClient(path=QDRANT_PATH)

    new_collection = f"qiskit_docs_{datetime.now(timezone.utc):%Y%m%d%H%M%S}"
    client.create_collection(
        collection_name=new_collection,
        vectors_config=models.VectorParams(size=EMBED_DIM, distance=models.Distance.COSINE),
    )

    for i in tqdm(range(0, len(chunks), EMBED_BATCH_SIZE), desc="embedding+upserting"):
        batch = chunks[i : i + EMBED_BATCH_SIZE]
        vectors = model.encode([c["text"] for c in batch], normalize_embeddings=True, show_progress_bar=False)
        client.upsert(
            collection_name=new_collection,
            points=[
                models.PointStruct(id=i + j, vector=vectors[j].tolist(), payload=batch[j])
                for j in range(len(batch))
            ],
        )

    # zero-downtime swap (Section 7): only repoint the alias once the new
    # collection is fully populated, so retrieval never sees a half-updated index
    old_collection = next(
        (a.collection_name for a in client.get_aliases().aliases if a.alias_name == COLLECTION_ALIAS),
        None,
    )
    ops = [models.CreateAliasOperation(create_alias=models.CreateAlias(collection_name=new_collection, alias_name=COLLECTION_ALIAS))]
    if old_collection:
        ops.insert(0, models.DeleteAliasOperation(delete_alias=models.DeleteAlias(alias_name=COLLECTION_ALIAS)))
    client.update_collection_aliases(change_aliases_operations=ops)

    if old_collection and old_collection != new_collection:
        client.delete_collection(old_collection)

    print(f"Alias '{COLLECTION_ALIAS}' -> '{new_collection}' ({client.count(new_collection).count} points).")
    if old_collection:
        print(f"Removed old collection '{old_collection}'.")


def main() -> None:
    build_corpus()
    embed_and_upsert_from_corpus()


if __name__ == "__main__":
    import sys

    if "--selfcheck" in sys.argv:
        selfcheck()
    elif "--count" in sys.argv:
        files = discover_files()
        print(f"{len(files)} current-version files eligible for chunking (mdx/md/ipynb, docs/+learning/).")
    elif "--build-corpus" in sys.argv:
        build_corpus()
    elif "--embed-from-corpus" in sys.argv:
        embed_and_upsert_from_corpus()
    else:
        main()
