import asyncio
import base64
import hashlib

import pytest
from bson import ObjectId
from fastapi import HTTPException
from livekit import api as lk_api

from routers.educator import list_modules, list_lessons, _safe_filename, ALLOWED_RESOURCE_TYPES
from routers.live import livekit_webhook
from live_service import LIVEKIT_API_KEY, LIVEKIT_API_SECRET


def _fake_user(uid):
    return {"firebase_uid": uid, "role": "learner"}


class _FakeCursor:
    def __init__(self, docs):
        self._docs = docs

    def sort(self, *a, **k):
        return self

    async def to_list(self, length=None):
        return self._docs


class _Collection:
    def __init__(self, docs):
        self._docs = docs

    def find_one(self, query):
        async def _run():
            for d in self._docs:
                if all(d.get(k) == v for k, v in query.items()):
                    return d
            return None
        return _run()

    def find(self, query):
        matched = [d for d in self._docs if all(d.get(k) == v for k, v in query.items())]
        return _FakeCursor(matched)


class _FakeDB:
    def __init__(self, courses=None, enrollments=None, modules=None, lessons=None):
        self.courses = _Collection(courses or [])
        self.enrollments = _Collection(enrollments or [])
        self.modules = _Collection(modules or [])
        self.lessons = _Collection(lessons or [])


# --------------------------------------------------------------------------
# list_modules / list_lessons IDOR fix
# --------------------------------------------------------------------------

def test_list_modules_rejects_unenrolled_stranger(monkeypatch):
    course_id = ObjectId()
    db = _FakeDB(courses=[{"_id": course_id, "owner_uid": "owner_1", "status": "draft"}])
    monkeypatch.setattr("routers.educator.get_db", lambda: db)
    monkeypatch.setattr("routers.default.get_db", lambda: db)

    with pytest.raises(HTTPException) as exc:
        asyncio.run(list_modules(str(course_id), user=_fake_user("stranger")))
    assert exc.value.status_code == 403


def test_list_modules_allows_enrolled_student(monkeypatch):
    course_id = ObjectId()
    module_id = ObjectId()
    db = _FakeDB(
        courses=[{"_id": course_id, "owner_uid": "owner_1", "status": "published"}],
        enrollments=[{"student_uid": "student_1", "course_id": course_id}],
        modules=[{"_id": module_id, "course_id": course_id, "title": "M1", "order": 1}],
    )
    monkeypatch.setattr("routers.educator.get_db", lambda: db)
    monkeypatch.setattr("routers.default.get_db", lambda: db)

    result = asyncio.run(list_modules(str(course_id), user=_fake_user("student_1")))
    assert len(result) == 1
    assert result[0].id == str(module_id)


def test_list_lessons_rejects_stranger_via_module_lookup(monkeypatch):
    course_id = ObjectId()
    module_id = ObjectId()
    db = _FakeDB(
        courses=[{"_id": course_id, "owner_uid": "owner_1", "status": "draft"}],
        modules=[{"_id": module_id, "course_id": course_id, "title": "M1", "order": 1}],
    )
    monkeypatch.setattr("routers.educator.get_db", lambda: db)
    monkeypatch.setattr("routers.default.get_db", lambda: db)

    with pytest.raises(HTTPException) as exc:
        asyncio.run(list_lessons(str(module_id), user=_fake_user("stranger")))
    assert exc.value.status_code == 403


def test_list_lessons_allows_course_owner(monkeypatch):
    course_id = ObjectId()
    module_id = ObjectId()
    lesson_id = ObjectId()
    db = _FakeDB(
        courses=[{"_id": course_id, "owner_uid": "owner_1", "status": "draft"}],
        modules=[{"_id": module_id, "course_id": course_id, "title": "M1", "order": 1}],
        lessons=[{"_id": lesson_id, "module_id": module_id, "title": "L1", "order": 1}],
    )
    monkeypatch.setattr("routers.educator.get_db", lambda: db)
    monkeypatch.setattr("routers.default.get_db", lambda: db)

    result = asyncio.run(list_lessons(str(module_id), user=_fake_user("owner_1")))
    assert len(result) == 1
    assert result[0].id == str(lesson_id)


# --------------------------------------------------------------------------
# Resource upload key sanitization
# --------------------------------------------------------------------------

def test_safe_filename_strips_path_traversal():
    assert ".." not in _safe_filename("../../etc/passwd")
    assert "/" not in _safe_filename("../../etc/passwd")


def test_safe_filename_preserves_normal_names():
    assert _safe_filename("lecture 01.pdf") == "lecture_01.pdf"


def test_allowed_resource_types_matches_frontend_contract():
    assert ALLOWED_RESOURCE_TYPES == {"video", "ppt", "notes", "cheatsheet", "interactive_lab"}


# --------------------------------------------------------------------------
# LiveKit webhook signature verification
# --------------------------------------------------------------------------

class _FakeWebhookRequest:
    def __init__(self, body_bytes: bytes, auth_header: str = ""):
        self._body = body_bytes
        self.headers = {"Authorization": auth_header} if auth_header else {}

    async def body(self):
        return self._body


def test_webhook_rejects_forged_request_with_no_signature():
    body = b'{"event": "egress_ended", "egressInfo": {"egressId": "EG_forged"}}'
    with pytest.raises(HTTPException) as exc:
        asyncio.run(livekit_webhook(_FakeWebhookRequest(body)))
    assert exc.value.status_code == 401


def test_webhook_accepts_correctly_signed_request(monkeypatch):
    body_str = '{"event": "egress_ended", "egressInfo": {"egressId": "EG_real"}}'
    sha256_b64 = base64.b64encode(hashlib.sha256(body_str.encode()).digest()).decode()
    token = lk_api.AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET).with_sha256(sha256_b64).to_jwt()

    class _FakeDBForWebhook:
        class _LiveSessions:
            async def update_one(self, *a, **k):
                _FakeDBForWebhook.updated = True
        live_sessions = _LiveSessions()

    monkeypatch.setattr("routers.live.get_db", lambda: _FakeDBForWebhook())

    result = asyncio.run(livekit_webhook(_FakeWebhookRequest(body_str.encode(), token)))
    assert result == {"received": True}
    assert _FakeDBForWebhook.updated is True
