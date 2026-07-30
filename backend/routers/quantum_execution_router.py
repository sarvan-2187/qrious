from fastapi import APIRouter
from fastapi.responses import JSONResponse
from models.quantum_execution_model import (
    QuantumExecuteRequest,
    QuantumExecuteResponse,
    QuantumDebugRequest,
    QuantumDebugResponse,
    ExecuteResults,
    DebugStep,
)
from services.quantum_execution_service import quantum_execution_service

router = APIRouter(prefix="/api/quantum", tags=["Quantum Execution"])


@router.post("/execute")
async def quantum_execute(request: QuantumExecuteRequest):
    result = quantum_execution_service.execute(
        language=request.language,
        code=request.code,
        shots=request.options.shots,
    )

    if not result.get("success"):
        return JSONResponse(
            status_code=400,
            content={
                "success": False,
                "error": result.get("error", "Execution failed"),
                "errorLine": result.get("errorLine"),
            },
        )

    raw_results = result.get("results", {})
    return {
        "success": True,
        "results": {
            "counts": raw_results.get("counts", {}),
            "statevector": raw_results.get("statevector"),
            "executionTime": raw_results.get("executionTime", 0),
        },
    }


@router.post("/debug")
async def quantum_debug(request: QuantumDebugRequest):
    result = quantum_execution_service.debug(
        language=request.language,
        code=request.code,
    )

    if not result.get("success"):
        return JSONResponse(
            status_code=400,
            content={
                "success": False,
                "error": result.get("error", "Debug failed"),
                "errorLine": result.get("errorLine"),
            },
        )

    return {
        "success": True,
        "trace": result.get("trace", []),
        "circuitDiagram": result.get("circuitDiagram"),
    }
