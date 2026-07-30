from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

def test_algorithms_requires_auth():
    response = client.get("/api/v1/algorithms/")
    assert response.status_code == 401

def test_circuits_requires_auth():
    response = client.get("/api/v1/circuits/")
    assert response.status_code == 401

def test_code_execute_requires_auth():
    response = client.post("/api/v1/code/execute", json={"source_code": "print(1)"})
    assert response.status_code == 401
