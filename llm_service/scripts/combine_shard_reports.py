"""Combine the 4 per-shard eval reports (outputs/eval_report_v1_shardNof4.json)
into one overall base-vs-tuned summary.

Run once all 4 shards have finished: `python scripts/combine_shard_reports.py`.
Shards are equal-sized (evaluate.py's make_shards partitions the pool evenly),
so a plain average across the 4 reports' numbers gives the full-test-set
result - no row-count weighting needed.
"""

import glob
import json
import sys
from pathlib import Path

REPORT_GLOB = "outputs/eval_report_v1_shard*of4.json"
OUT_PATH = Path("outputs/eval_report_v1_combined.json")


def avg(values: list[float]) -> float:
    return round(sum(values) / len(values), 3)


def avg_by_category(dicts: list[dict]) -> dict:
    categories = set().union(*dicts)
    return {cat: avg([d[cat] for d in dicts if cat in d]) for cat in sorted(categories)}


def combine(reports: list[dict]) -> dict:
    code = [r["code_pass_at_1"] for r in reports]
    qa = [r["qa_judge_score_1to5"] for r in reports]
    instr = [r["instruction_following"]["compliance_rate"] for r in reports]

    code_base, code_tuned = avg([c["base_overall"] for c in code]), avg([c["tuned_overall"] for c in code])
    qa_base, qa_tuned = avg([q["base_overall"] for q in qa]), avg([q["tuned_overall"] for q in qa])

    return {
        "total_code_rows": sum(r["n_code_rows"] for r in reports),
        "total_qa_rows": sum(r["n_qa_rows"] for r in reports),
        "code_pass_at_1": {
            "base_overall": code_base,
            "tuned_overall": code_tuned,
            "improvement": round(code_tuned - code_base, 3),
            "base_by_category": avg_by_category([c["base_by_category"] for c in code]),
            "tuned_by_category": avg_by_category([c["tuned_by_category"] for c in code]),
        },
        "qa_judge_score_1to5": {
            "base_overall": qa_base,
            "tuned_overall": qa_tuned,
            "improvement": round(qa_tuned - qa_base, 3),
            "base_by_category": avg_by_category([q["base_by_category"] for q in qa]),
            "tuned_by_category": avg_by_category([q["tuned_by_category"] for q in qa]),
        },
        "instruction_following_compliance_rate": avg(instr),
    }


def selfcheck() -> None:
    dummy = [
        {
            "n_code_rows": 10, "n_qa_rows": 2,
            "code_pass_at_1": {"base_overall": 0.1, "tuned_overall": 0.3, "base_by_category": {"a": 0.1}, "tuned_by_category": {"a": 0.3}},
            "qa_judge_score_1to5": {"base_overall": 2.0, "tuned_overall": 3.0, "base_by_category": {"a": 2.0}, "tuned_by_category": {"a": 3.0}},
            "instruction_following": {"compliance_rate": 1.0},
        },
        {
            "n_code_rows": 10, "n_qa_rows": 2,
            "code_pass_at_1": {"base_overall": 0.3, "tuned_overall": 0.5, "base_by_category": {"a": 0.3}, "tuned_by_category": {"a": 0.5}},
            "qa_judge_score_1to5": {"base_overall": 2.0, "tuned_overall": 4.0, "base_by_category": {"a": 2.0}, "tuned_by_category": {"a": 4.0}},
            "instruction_following": {"compliance_rate": 0.8},
        },
    ]
    result = combine(dummy)
    assert result["total_code_rows"] == 20
    assert result["code_pass_at_1"]["base_overall"] == 0.2
    assert result["code_pass_at_1"]["tuned_overall"] == 0.4
    assert result["code_pass_at_1"]["improvement"] == 0.2
    assert result["qa_judge_score_1to5"]["tuned_overall"] == 3.5
    assert result["instruction_following_compliance_rate"] == 0.9
    print("selfcheck OK")


def main() -> None:
    paths = sorted(glob.glob(REPORT_GLOB))
    if len(paths) != 4:
        raise SystemExit(
            f"Expected 4 shard reports matching {REPORT_GLOB}, found {len(paths)}: {paths}\n"
            "Run all 4 shards first (python scripts/evaluate.py --shard 1..4)."
        )
    reports = [json.loads(Path(p).read_text(encoding="utf-8")) for p in paths]
    summary = combine(reports)

    OUT_PATH.write_text(json.dumps(summary, indent=2, ensure_ascii=False), encoding="utf-8")
    print(json.dumps(summary, indent=2, ensure_ascii=False))
    print(f"\nSaved combined summary to {OUT_PATH}")


if __name__ == "__main__":
    if "--selfcheck" in sys.argv:
        selfcheck()
    else:
        main()
