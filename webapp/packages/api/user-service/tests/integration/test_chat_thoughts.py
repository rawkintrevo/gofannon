import time
from unittest.mock import Mock

import pytest
from fastapi.testclient import TestClient

import dependencies as dependencies_module
from app_factory import create_app
from services.database_service.memory import MemoryDBService


pytestmark = pytest.mark.integration


def _wait_for_ticket(client: TestClient, ticket_id: str, attempts: int = 5) -> dict:
    response_data = None
    for _ in range(attempts):
        response = client.get(f"/chat/{ticket_id}")
        if response.status_code == 200:
            response_data = response.json()
            if response_data.get("status") == "completed":
                return response_data
        time.sleep(0.01)
    return response_data or {}


@pytest.mark.parametrize(
    ("provider", "model", "expected_thoughts"),
    [
        ("openai", "gpt-5", {"summary": ["openai thoughts"]}),
        ("anthropic", "claude-opus-4-5-20251101", {"anthropic_thoughts": ["thinking"]}),
        ("gemini", "gemini-2.5-pro", {"reasoning": "gemini thoughts"}),
    ],
)
def test_chat_returns_thoughts_for_provider(monkeypatch, provider, model, expected_thoughts):
    memory_db = MemoryDBService()
    fake_logger = Mock()
    fake_logger.log = Mock()
    fake_logger.log_exception = Mock()

    async def fake_call_llm(
        provider: str,
        model: str,
        messages,
        parameters,
        tools=None,
        user_service=None,
        user_id=None,
        user_basic_info=None,
    ):
        return f"{provider} response", expected_thoughts

    monkeypatch.setattr(dependencies_module, "get_database_service", lambda settings: memory_db)
    monkeypatch.setattr(dependencies_module, "get_observability_service", lambda: fake_logger)
    monkeypatch.setattr(dependencies_module, "call_llm", fake_call_llm)

    app = create_app()
    client = TestClient(app)

    response = client.post(
        "/chat",
        json={
            "messages": [{"role": "user", "content": "Hello"}],
            "provider": provider,
            "model": model,
            "parameters": {},
        },
    )
    assert response.status_code == 200
    ticket_id = response.json()["ticket_id"]

    ticket_data = _wait_for_ticket(client, ticket_id)

    assert ticket_data.get("status") == "completed"
    assert ticket_data["result"]["thoughts"] == expected_thoughts
