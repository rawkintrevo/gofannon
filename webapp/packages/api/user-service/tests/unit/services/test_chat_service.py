"""Unit tests for chat service."""
from __future__ import annotations

import json
import tempfile
from datetime import datetime, timedelta
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock, patch

import pytest

from services.chat_service import ChatService


pytestmark = pytest.mark.unit


class _DummyMessage:
    def __init__(self, content: str):
        self.content = content
        self.tool_calls = None


class _DummyChoice:
    def __init__(self, message, finish_reason="stop"):
        self.message = message
        self.finish_reason = finish_reason


class _DummyUsage:
    def dict(self):
        return {"prompt_tokens": 10, "completion_tokens": 20, "total_tokens": 30}


class _DummyResponse:
    def __init__(self, content: str, model: str = "gpt-3.5-turbo"):
        self.choices = [_DummyChoice(_DummyMessage(content))]
        self.model = model
        self.usage = _DummyUsage()


@pytest.fixture
def temp_storage():
    """Create a temporary storage directory for tests."""
    with tempfile.TemporaryDirectory() as tmpdir:
        yield tmpdir


@pytest.fixture
def chat_service(temp_storage):
    """Create a ChatService instance with temporary storage."""
    return ChatService(storage_dir=temp_storage)


@pytest.mark.asyncio
async def test_create_chat_ticket(chat_service, temp_storage):
    """Test creating a chat ticket."""
    messages = [{"role": "user", "content": "Hello"}]
    model = "gpt-3.5-turbo"
    config = {"temperature": 0.7}
    session_id = "test-session"

    with patch("services.chat_service.acompletion", new_callable=AsyncMock) as mock_acompletion:
        mock_acompletion.return_value = _DummyResponse("Hi there!")

        ticket_id = await chat_service.create_chat_ticket(
            session_id=session_id,
            messages=messages,
            model=model,
            config=config
        )

    assert ticket_id is not None
    assert isinstance(ticket_id, str)

    # Verify ticket file exists
    ticket_path = Path(temp_storage) / f"{ticket_id}.json"
    assert ticket_path.exists()

    # Verify ticket contents
    with open(ticket_path) as f:
        ticket_data = json.load(f)

    assert ticket_data["id"] == ticket_id
    assert ticket_data["session_id"] == session_id
    assert ticket_data["status"] == "processing"
    assert ticket_data["model"] == model
    assert ticket_data["messages"] == messages
    assert ticket_data["config"] == config


@pytest.mark.asyncio
async def test_process_chat_success(chat_service, temp_storage):
    """Test successful chat processing."""
    messages = [{"role": "user", "content": "Test message"}]
    model = "gpt-4"
    config = {"temperature": 0.5}
    session_id = "test-session"

    with patch("services.chat_service.acompletion", new_callable=AsyncMock) as mock_acompletion:
        mock_acompletion.return_value = _DummyResponse("Test response", model="gpt-4")

        ticket_id = await chat_service.create_chat_ticket(
            session_id=session_id,
            messages=messages,
            model=model,
            config=config
        )

        # Wait for processing to complete
        if ticket_id in chat_service.active_tasks:
            await chat_service.active_tasks[ticket_id]

    # Verify ticket status
    ticket_data = await chat_service.get_ticket_status(ticket_id)

    assert ticket_data["status"] == "completed"
    assert ticket_data["response"]["content"] == "Test response"
    assert ticket_data["response"]["model"] == "gpt-4"
    assert ticket_data["response"]["usage"] is not None
    assert ticket_data["response"]["finish_reason"] == "stop"
    assert "completed_at" in ticket_data


@pytest.mark.asyncio
async def test_process_chat_failure(chat_service, temp_storage):
    """Test chat processing with error."""
    messages = [{"role": "user", "content": "Test"}]
    model = "gpt-3.5-turbo"
    config = {}
    session_id = "test-session"

    with patch("services.chat_service.acompletion", new_callable=AsyncMock) as mock_acompletion:
        mock_acompletion.side_effect = Exception("API Error")

        ticket_id = await chat_service.create_chat_ticket(
            session_id=session_id,
            messages=messages,
            model=model,
            config=config
        )

        # Wait for processing to complete
        if ticket_id in chat_service.active_tasks:
            await chat_service.active_tasks[ticket_id]

    # Verify ticket status shows failure
    ticket_data = await chat_service.get_ticket_status(ticket_id)

    assert ticket_data["status"] == "failed"
    assert ticket_data["error"] == "API Error"
    assert "completed_at" in ticket_data


@pytest.mark.asyncio
async def test_get_ticket_status_not_found(chat_service):
    """Test getting status for non-existent ticket."""
    result = await chat_service.get_ticket_status("non-existent-ticket")
    assert result is None


@pytest.mark.asyncio
async def test_stream_chat_success(chat_service):
    """Test streaming chat completion."""
    messages = [{"role": "user", "content": "Hello"}]
    model = "gpt-3.5-turbo"
    config = {"temperature": 0.7}
    session_id = "test-session"

    # Create mock streaming response
    class MockDelta:
        def __init__(self, content):
            self.content = content

    class MockStreamChoice:
        def __init__(self, delta):
            self.delta = delta

    class MockChunk:
        def __init__(self, content):
            self.choices = [MockStreamChoice(MockDelta(content))]

    async def mock_stream():
        yield MockChunk("Hello")
        yield MockChunk(" there")
        yield MockChunk("!")

    with patch("services.chat_service.acompletion", new_callable=AsyncMock) as mock_acompletion:
        mock_acompletion.return_value = mock_stream()

        chunks = []
        async for chunk in chat_service.stream_chat(
            session_id=session_id,
            messages=messages,
            model=model,
            config=config
        ):
            chunks.append(chunk)

    assert len(chunks) == 4  # 3 content chunks + 1 done
    assert chunks[0] == {"type": "content", "data": "Hello"}
    assert chunks[1] == {"type": "content", "data": " there"}
    assert chunks[2] == {"type": "content", "data": "!"}
    assert chunks[3] == {"type": "done", "data": None}


@pytest.mark.asyncio
async def test_stream_chat_error(chat_service):
    """Test streaming chat with error."""
    messages = [{"role": "user", "content": "Test"}]
    model = "gpt-3.5-turbo"
    config = {}
    session_id = "test-session"

    with patch("services.chat_service.acompletion", new_callable=AsyncMock) as mock_acompletion:
        mock_acompletion.side_effect = Exception("Stream error")

        chunks = []
        async for chunk in chat_service.stream_chat(
            session_id=session_id,
            messages=messages,
            model=model,
            config=config
        ):
            chunks.append(chunk)

    assert len(chunks) == 1
    assert chunks[0]["type"] == "error"
    assert chunks[0]["data"] == "Stream error"


def test_cleanup_old_tickets(chat_service, temp_storage):
    """Test cleanup of old ticket files."""
    # Create some test tickets with different ages
    now = datetime.utcnow()
    old_time = now - timedelta(hours=25)
    recent_time = now - timedelta(hours=1)

    # Old ticket
    old_ticket = {
        "id": "old-ticket",
        "created_at": old_time.isoformat(),
        "status": "completed"
    }
    old_path = Path(temp_storage) / "old-ticket.json"
    with open(old_path, 'w') as f:
        json.dump(old_ticket, f)

    # Recent ticket
    recent_ticket = {
        "id": "recent-ticket",
        "created_at": recent_time.isoformat(),
        "status": "processing"
    }
    recent_path = Path(temp_storage) / "recent-ticket.json"
    with open(recent_path, 'w') as f:
        json.dump(recent_ticket, f)

    # Run cleanup
    chat_service.cleanup_old_tickets(max_age_hours=24)

    # Old ticket should be deleted
    assert not old_path.exists()

    # Recent ticket should still exist
    assert recent_path.exists()


def test_cleanup_handles_invalid_files(chat_service, temp_storage):
    """Test that cleanup handles invalid/corrupted ticket files gracefully."""
    # Create an invalid JSON file
    invalid_path = Path(temp_storage) / "invalid.json"
    with open(invalid_path, 'w') as f:
        f.write("not valid json{")

    # Should not raise an exception
    chat_service.cleanup_old_tickets(max_age_hours=24)

    # Invalid file should still exist (we skip it)
    assert invalid_path.exists()
