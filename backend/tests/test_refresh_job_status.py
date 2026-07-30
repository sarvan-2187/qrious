# backend/tests/test_refresh_job_status.py
import asyncio
from unittest.mock import patch

from routers.qroute_router import _refresh_job_status


class FakeCollection:
    def __init__(self):
        self.updated_with = None

    async def update_one(self, filter_, update):
        self.updated_with = (filter_, update)


class FakeDB:
    def __init__(self):
        self.quantum_hw_jobs = FakeCollection()


class FakeAdapter:
    def __init__(self, result=None, error=None):
        self._result = result
        self._error = error

    def get_job_result(self, provider_job_id, device_id):
        if self._error:
            raise self._error
        return self._result


def test_refresh_job_status_skips_terminal_jobs():
    db = FakeDB()
    doc = {"_id": "job1", "status": "completed", "provider": "ibm", "device_id": "d1", "qbraid_job_qrn": "q1"}

    result = asyncio.run(_refresh_job_status(db, doc))

    assert result is doc
    assert db.quantum_hw_jobs.updated_with is None


def test_refresh_job_status_updates_from_live_provider_result():
    db = FakeDB()
    doc = {"_id": "job1", "status": "queued", "provider": "ibm", "device_id": "d1", "qbraid_job_qrn": "q1"}
    fake_result = {
        "status": "completed",
        "counts": {"00": 512, "11": 512},
        "cost": 1.5,
        "estimated_cost": 1.2,
        "error_message": None,
        "status_detail": None,
    }

    with patch("routers.qroute_router.get_adapter", return_value=FakeAdapter(fake_result)):
        result = asyncio.run(_refresh_job_status(db, doc))

    assert result["status"] == "completed"
    assert result["result"] == {"00": 512, "11": 512}
    filter_, update = db.quantum_hw_jobs.updated_with
    assert filter_ == {"_id": "job1"}
    assert update["$set"]["status"] == "completed"


def test_refresh_job_status_swallows_provider_errors():
    db = FakeDB()
    doc = {"_id": "job1", "status": "queued", "provider": "ibm", "device_id": "d1", "qbraid_job_qrn": "q1"}

    with patch("routers.qroute_router.get_adapter", side_effect=RuntimeError("provider unreachable")):
        result = asyncio.run(_refresh_job_status(db, doc))

    assert result["status"] == "queued"
    assert db.quantum_hw_jobs.updated_with is None
