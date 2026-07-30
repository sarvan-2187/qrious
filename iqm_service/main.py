import os

from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel

import iqm_client

IQM_SERVICE_SECRET = os.getenv("IQM_SERVICE_SECRET")

app = FastAPI(
    title="Qrious IQM Resonance Service",
    description="Internal, HTTP-triggered wrapper around IQM Resonance (qiskit-iqm). "
    "Not user-facing — backend/services/quantum_providers/iqm_adapter.py is the only caller.",
)


def _check_secret(x_internal_secret: str) -> None:
    if not IQM_SERVICE_SECRET or x_internal_secret != IQM_SERVICE_SECRET:
        raise HTTPException(status_code=401, detail="Invalid internal secret")


class JobRequest(BaseModel):
    qasm: str
    device_id: str
    shots: int = 1024


@app.get("/health")
async def health():
    return {"status": "healthy"}


@app.get("/devices")
async def list_devices(x_internal_secret: str = Header(...)):
    _check_secret(x_internal_secret)
    return iqm_client.list_devices()


@app.post("/jobs")
async def submit_job(payload: JobRequest, x_internal_secret: str = Header(...)):
    _check_secret(x_internal_secret)
    try:
        provider_job_id = iqm_client.submit_job(payload.qasm, payload.device_id, payload.shots)
    except iqm_client.InsufficientCreditsError as e:
        raise HTTPException(status_code=402, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"IQM Resonance job submission failed: {str(e)}")
    return {"provider_job_id": provider_job_id}


@app.get("/jobs/{provider_job_id}")
async def get_job(provider_job_id: str, device_id: str, x_internal_secret: str = Header(...)):
    _check_secret(x_internal_secret)
    try:
        return iqm_client.get_job_result(provider_job_id, device_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"IQM Resonance job lookup failed: {str(e)}")
