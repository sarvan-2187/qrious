# backend/tests/test_error_responses_keep_cors.py
from fastapi.testclient import TestClient

import main

# TestClient is deliberately NOT used as a context manager: that would run the
# lifespan (Mongo connect + seeding). Only the middleware stack is under test.
_client = TestClient(main.app)


@main.app.get("/_test_boom")
async def _boom():
    raise ImportError("cannot import name 'BaseHTTPResponse' from 'urllib3.response'")


def test_unhandled_exception_still_answers_with_cors():
    """A 500 without Access-Control-Allow-Origin is discarded by the browser and
    surfaces as a bare "Network Error" with nothing for the UI to show — which
    is exactly how a qBraid SDK ImportError hid itself in production."""
    response = _client.get("/_test_boom", headers={"Origin": "https://qrious.dpdns.org"})

    assert response.status_code == 500
    assert response.headers.get("access-control-allow-origin") == "https://qrious.dpdns.org"
    assert "detail" in response.json()


if __name__ == "__main__":
    test_unhandled_exception_still_answers_with_cors()
    print("ok")
