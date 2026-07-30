from fastapi import APIRouter, Depends, HTTPException
from typing import List

from services.qforge.models import BuildGraph, ValidateResponse, ScoreBreakdown
from services.qforge.report_builder import build_score_report

router = APIRouter(prefix="/api/v1/qforge", tags=["qforge"])

@router.post("/validate", response_model=ValidateResponse)
async def validate_build(graph: BuildGraph):
    # Just run a lightweight check (e.g. for immediate builder feedback)
    report = build_score_report(graph)
    return ValidateResponse(
        valid=len(report.failures) == 0,
        messages=report.failures + report.warnings
    )

@router.post("/score", response_model=ScoreBreakdown)
async def score_build(graph: BuildGraph):
    report = build_score_report(graph)
    return report

@router.post("/builds")
async def save_build(graph: BuildGraph):
    # Phase 1: simple mock of saving to mongo
    # In reality we'd connect to the db and do something like:
    # await db.qforge_builds.insert_one(graph.dict())
    return {"status": "success", "message": "Build saved."}
