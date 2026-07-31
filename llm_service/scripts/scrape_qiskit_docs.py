"""Shallow, sparse clone of Qiskit/documentation's docs/learning trees into
rag/qiskit-api-docs/ (IMPLEMENTATION_PLAN.md Section 7, one-time v1 pull).

Uses `--filter=blob:none --sparse` + `sparse-checkout set docs learning` so
disk usage stays proportional to the doc text we actually need, skipping
`public/` (images/screenshots) and repo tooling (.github, scripts, etc.) that
the dataset's own `source` column never references. Verified via the
dataset's source paths (Section 2): all real hits are under docs/ or learning/.

Re-run to refresh: if the destination already looks like a clone, this does
a shallow re-fetch of the latest commit instead of re-cloning from scratch.
Incremental diffing against the previously-indexed commit sha (Section 7) is
Phase 5's job, not this script's - this is the one-time/refresh full pull.
"""

import subprocess
from pathlib import Path

REPO_URL = "https://github.com/Qiskit/documentation.git"
DEST = Path("rag/qiskit-api-docs")
SPARSE_PATHS = ["docs", "learning"]


def run(*args: str, cwd: Path | None = None) -> str:
    result = subprocess.run(args, cwd=cwd, check=True, capture_output=True, text=True)
    return result.stdout.strip()


def main() -> None:
    if (DEST / ".git").exists():
        print(f"{DEST} is already a clone - fetching latest...")
        run("git", "fetch", "--depth", "1", "origin", "main", cwd=DEST)
        run("git", "reset", "--hard", "origin/main", cwd=DEST)
    else:
        DEST.mkdir(parents=True, exist_ok=True)
        print(f"Cloning {REPO_URL} (sparse: {SPARSE_PATHS}) into {DEST}...")
        run("git", "clone", "--depth", "1", "--filter=blob:none", "--sparse", REPO_URL, str(DEST))
        run("git", "sparse-checkout", "set", *SPARSE_PATHS, cwd=DEST)

    sha = run("git", "rev-parse", "HEAD", cwd=DEST)
    n_files = sum(1 for p in DEST.rglob("*") if p.is_file() and ".git" not in p.parts)
    print(f"Scraped {DEST} at commit {sha} ({n_files} files).")


if __name__ == "__main__":
    main()
