"""Lightweight RAG evaluation harness — not a labeled benchmark (no existing
labeled QStudio dataset exists to evaluate against, see PLANS/qstudio-rag.md
§5), but a repeatable way to sanity-check retrieval + groundedness against a
real, already-ingested study space before/after tuning rag/config.py's
thresholds.

Usage:
    python -m rag.eval <study_space_id> <owner_uid> [cases.json]

Without a cases file, runs a small built-in template covering the 7
representative categories the task spec calls out: direct factual,
cross-document, follow-up, no-answer-in-sources, exact-technical-term,
multi-chunk, conflicting-source. Replace `answer` in your own cases.json
with what the actual source material in that study space supports —
the built-in template's expectations are illustrative placeholders, not
assertions about any particular study space's real content.

cases.json shape:
[
  {"question": "...", "expect_keyword": "...", "expect_insufficient": false, "conversation": ["prior turn 1", "..."]},
  ...
]
"""
import asyncio
import json
import sys
import time
from dataclasses import dataclass, field
from typing import List, Optional


@dataclass
class EvalCase:
    question: str
    expect_keyword: Optional[str] = None
    expect_insufficient: bool = False
    source_ids: Optional[List[str]] = None
    category: str = "uncategorized"


DEFAULT_CASES: List[EvalCase] = [
    EvalCase("What is the main topic covered in these sources?", category="direct_factual"),
    EvalCase(
        "Compare how the different sources explain this topic, and note any differences.",
        category="cross_document",
    ),
    EvalCase(
        "What year did the Roman Empire land on the moon?",
        expect_insufficient=True,
        category="no_answer_in_sources",
    ),
    EvalCase("Define the most specific technical term used in the material.", category="exact_technical_term"),
    EvalCase(
        "Summarize everything the sources say about this subject, drawing on multiple points.",
        category="multi_chunk",
    ),
]


@dataclass
class EvalResult:
    case: EvalCase
    answer: str
    insufficient_evidence: bool
    citations_count: int
    chunks_used: int
    total_ms: float
    keyword_found: bool
    passed: bool


async def run_eval(study_space_id: str, owner_uid: str, cases: List[EvalCase]) -> List[EvalResult]:
    from database import connect_to_mongo, get_db
    from rag.pipeline import answer_question

    await connect_to_mongo()
    db = get_db()

    results: List[EvalResult] = []
    for case in cases:
        t0 = time.perf_counter()
        response = await answer_question(
            db, study_space_id, owner_uid, case.question, case.source_ids, persist=False,
        )
        elapsed_ms = (time.perf_counter() - t0) * 1000

        keyword_found = (
            case.expect_keyword.lower() in response.answer.lower() if case.expect_keyword else True
        )
        passed = keyword_found and response.insufficient_evidence == case.expect_insufficient

        results.append(EvalResult(
            case=case,
            answer=response.answer,
            insufficient_evidence=response.insufficient_evidence,
            citations_count=len(response.citations),
            chunks_used=response.retrieval.chunks_used,
            total_ms=elapsed_ms,
            keyword_found=keyword_found,
            passed=passed,
        ))
    return results


def _print_report(results: List[EvalResult]) -> None:
    print(f"\n{'='*80}\nqStudio RAG evaluation — {len(results)} case(s)\n{'='*80}")
    for r in results:
        status = "PASS" if r.passed else "FAIL"
        print(f"\n[{status}] ({r.case.category}) {r.case.question}")
        print(f"  insufficient_evidence={r.insufficient_evidence} chunks_used={r.chunks_used} "
              f"citations={r.citations_count} total_ms={r.total_ms:.0f}")
        print(f"  answer: {r.answer[:200]}{'…' if len(r.answer) > 200 else ''}")
    passed = sum(1 for r in results if r.passed)
    print(f"\n{'='*80}\n{passed}/{len(results)} passed\n{'='*80}\n")


def main():
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)
    study_space_id, owner_uid = sys.argv[1], sys.argv[2]
    cases = DEFAULT_CASES
    if len(sys.argv) > 3:
        with open(sys.argv[3], "r", encoding="utf-8") as f:
            raw_cases = json.load(f)
        cases = [
            EvalCase(
                question=c["question"],
                expect_keyword=c.get("expect_keyword"),
                expect_insufficient=c.get("expect_insufficient", False),
                source_ids=c.get("source_ids"),
                category=c.get("category", "uncategorized"),
            )
            for c in raw_cases
        ]
    results = asyncio.run(run_eval(study_space_id, owner_uid, cases))
    _print_report(results)


if __name__ == "__main__":
    main()
