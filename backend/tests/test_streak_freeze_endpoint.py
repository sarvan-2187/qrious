import asyncio

from routers.streak import consume_freeze_token


class _FakeStreaks:
    def __init__(self, doc):
        self._doc = doc

    async def find_one_and_update(self, query, update, return_document=None):
        if self._doc.get("freeze_tokens", 0) <= 0:
            return None
        self._doc["freeze_tokens"] += update["$inc"]["freeze_tokens"]
        return self._doc


class _FakeDB:
    def __init__(self, doc):
        self.streaks = _FakeStreaks(doc)


def test_consume_freeze_token_endpoint_succeeds_when_tokens_available(monkeypatch):
    db = _FakeDB({"firebase_uid": "user_1", "freeze_tokens": 2})
    monkeypatch.setattr("routers.streak.get_db", lambda: db)

    result = asyncio.run(consume_freeze_token(user={"firebase_uid": "user_1"}))
    assert result["data"]["success"] is True
    assert result["data"]["freeze_tokens_remaining"] == 1


def test_consume_freeze_token_endpoint_fails_gracefully_when_none_left(monkeypatch):
    db = _FakeDB({"firebase_uid": "user_1", "freeze_tokens": 0})
    monkeypatch.setattr("routers.streak.get_db", lambda: db)

    result = asyncio.run(consume_freeze_token(user={"firebase_uid": "user_1"}))
    assert result["data"]["success"] is False
