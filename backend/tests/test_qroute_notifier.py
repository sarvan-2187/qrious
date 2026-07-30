import asyncio
from unittest.mock import AsyncMock, patch

from services import qroute_notifier


class FakeUsersCollection:
    def __init__(self, user_doc):
        self._user_doc = user_doc

    async def find_one(self, filter_):
        return self._user_doc


class FakeJobsCollection:
    def __init__(self):
        self.updates = []

    async def update_one(self, filter_, update):
        self.updates.append((filter_, update))


class FakeDB:
    def __init__(self, user_doc):
        self.users = FakeUsersCollection(user_doc)
        self.quantum_hw_jobs = FakeJobsCollection()


def _job(**overrides):
    doc = {
        "_id": "job1",
        "status": "completed",
        "provider": "ibm",
        "device_id": "ibm_marrakesh",
        "user_id": "507f1f77bcf86cd799439011",
        "error_message": None,
    }
    doc.update(overrides)
    return doc


def test_maybe_notify_sends_email_for_newly_completed_real_hardware_job():
    db = FakeDB({"email": "student@example.com"})
    doc = _job()

    with patch("services.qroute_notifier._is_simulator_device", new=AsyncMock(return_value=False)), \
         patch("services.qroute_notifier.get_adapter") as mock_get_adapter, \
         patch("services.qroute_notifier.email_service.send_email", new=AsyncMock()) as mock_send:
        mock_get_adapter.return_value.display_name = "IBM Quantum Cloud"
        asyncio.run(qroute_notifier._maybe_notify(db, doc))

    mock_send.assert_awaited_once()
    args = mock_send.call_args[0]
    assert args[0] == "student@example.com"
    assert "completed" in args[1].lower()
    assert db.quantum_hw_jobs.updates == [({"_id": "job1"}, {"$set": {"email_sent": True}})]


def test_maybe_notify_skips_non_terminal_jobs():
    db = FakeDB({"email": "student@example.com"})
    doc = _job(status="running")

    with patch("services.qroute_notifier.email_service.send_email", new=AsyncMock()) as mock_send:
        asyncio.run(qroute_notifier._maybe_notify(db, doc))

    mock_send.assert_not_awaited()
    assert db.quantum_hw_jobs.updates == []


def test_maybe_notify_skips_already_emailed_jobs():
    db = FakeDB({"email": "student@example.com"})
    doc = _job(email_sent=True)

    with patch("services.qroute_notifier._is_simulator_device", new=AsyncMock(return_value=False)), \
         patch("services.qroute_notifier.email_service.send_email", new=AsyncMock()) as mock_send:
        asyncio.run(qroute_notifier._maybe_notify(db, doc))

    mock_send.assert_not_awaited()


def test_maybe_notify_skips_simulator_devices():
    db = FakeDB({"email": "student@example.com"})
    doc = _job()

    with patch("services.qroute_notifier._is_simulator_device", new=AsyncMock(return_value=True)), \
         patch("services.qroute_notifier.email_service.send_email", new=AsyncMock()) as mock_send:
        asyncio.run(qroute_notifier._maybe_notify(db, doc))

    mock_send.assert_not_awaited()


def test_maybe_notify_skips_and_logs_when_no_email_on_file():
    db = FakeDB(None)
    doc = _job()

    with patch("services.qroute_notifier._is_simulator_device", new=AsyncMock(return_value=False)), \
         patch("services.qroute_notifier.email_service.send_email", new=AsyncMock()) as mock_send:
        asyncio.run(qroute_notifier._maybe_notify(db, doc))

    mock_send.assert_not_awaited()
    assert db.quantum_hw_jobs.updates == []


def test_maybe_notify_uses_failed_subject_and_includes_error():
    db = FakeDB({"email": "student@example.com"})
    doc = _job(status="failed", error_message="Queue timeout")

    with patch("services.qroute_notifier._is_simulator_device", new=AsyncMock(return_value=False)), \
         patch("services.qroute_notifier.get_adapter") as mock_get_adapter, \
         patch("services.qroute_notifier.email_service.send_email", new=AsyncMock()) as mock_send:
        mock_get_adapter.return_value.display_name = "IBM Quantum Cloud"
        asyncio.run(qroute_notifier._maybe_notify(db, doc))

    args = mock_send.call_args[0]
    assert "failed" in args[1].lower()
    assert "Queue timeout" in args[2]


def test_maybe_notify_does_not_mark_sent_when_smtp_raises():
    db = FakeDB({"email": "student@example.com"})
    doc = _job()

    with patch("services.qroute_notifier._is_simulator_device", new=AsyncMock(return_value=False)), \
         patch("services.qroute_notifier.get_adapter") as mock_get_adapter, \
         patch("services.qroute_notifier.email_service.send_email", new=AsyncMock(side_effect=RuntimeError("SMTP connection refused"))) as mock_send:
        mock_get_adapter.return_value.display_name = "IBM Quantum Cloud"
        asyncio.run(qroute_notifier._maybe_notify(db, doc))

    mock_send.assert_awaited_once()
    assert db.quantum_hw_jobs.updates == []
