import pytest


@pytest.mark.asyncio
async def test_health(client):
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"


@pytest.mark.asyncio
async def test_chat_empty_message(client):
    response = await client.post("/api/v1/chat", json={"message": ""})
    assert response.status_code == 422  # Validation error


@pytest.mark.asyncio
async def test_agent_status(client):
    response = await client.get("/api/v1/status")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ready"


@pytest.mark.asyncio
async def test_create_and_list_sessions(client):
    create_res = await client.post(
        "/api/v1/sessions", json={"user_id": "test_user_1", "title": "Test Chat"}
    )
    assert create_res.status_code == 200
    session_data = create_res.json()
    assert session_data["title"] == "Test Chat"
    assert session_data["user_id"] == "test_user_1"

    list_res = await client.get("/api/v1/sessions")
    assert list_res.status_code == 200
    sessions = list_res.json()
    assert len(sessions) == 1
    assert sessions[0]["id"] == session_data["id"]


@pytest.mark.asyncio
async def test_chat_endpoint(client):
    response = await client.post(
        "/api/v1/chat",
        json={"message": "Hello AI Agent", "user_id": "test_user_1"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "response" in data
    assert "session_id" in data
