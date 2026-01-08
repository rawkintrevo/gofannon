"""Unit tests for chat models."""
from __future__ import annotations

import pytest
from pydantic import ValidationError

from models.chat import (
    ChatMessage,
    ChatRequest,
    ChatResponse,
    ChatStatus,
    ProviderConfig,
    SessionData,
    _ensure_mutually_exclusive,
)


pytestmark = pytest.mark.unit


def test_chat_message_valid():
    """Test creating a valid ChatMessage."""
    msg = ChatMessage(role="user", content="Hello")
    assert msg.role == "user"
    assert msg.content == "Hello"


def test_chat_message_invalid_role():
    """Test ChatMessage with invalid role."""
    with pytest.raises(ValidationError):
        ChatMessage(role="invalid", content="Hello")


def test_chat_request_defaults():
    """Test ChatRequest with default values."""
    messages = [ChatMessage(role="user", content="Test")]
    req = ChatRequest(messages=messages)

    assert req.provider == "openai"
    assert req.model == "gpt-3.5-turbo"
    assert req.parameters == {}
    assert req.stream is False
    assert req.built_in_tools == []


def test_chat_request_with_parameters():
    """Test ChatRequest with custom parameters."""
    messages = [ChatMessage(role="user", content="Test")]
    params = {"temperature": 0.7, "max_tokens": 100}
    req = ChatRequest(
        messages=messages,
        provider="anthropic",
        model="claude-3",
        parameters=params,
        stream=True,
        built_in_tools=["web_search"]
    )

    assert req.provider == "anthropic"
    assert req.model == "claude-3"
    assert req.parameters == params
    assert req.stream is True
    assert req.built_in_tools == ["web_search"]


def test_chat_request_with_camel_case_alias():
    """Test ChatRequest accepts camelCase field names."""
    messages = [ChatMessage(role="user", content="Test")]
    req = ChatRequest(
        messages=messages,
        builtInTools=["tool1", "tool2"]
    )

    assert req.built_in_tools == ["tool1", "tool2"]


def test_chat_response():
    """Test ChatResponse model."""
    resp = ChatResponse(
        ticket_id="test-123",
        status=ChatStatus.COMPLETED,
        result={"content": "Hello", "model": "gpt-4"},
    )

    assert resp.ticket_id == "test-123"
    assert resp.status == ChatStatus.COMPLETED
    assert resp.result["content"] == "Hello"
    assert resp.error is None


def test_chat_status_enum():
    """Test ChatStatus enum values."""
    assert ChatStatus.PENDING == "pending"
    assert ChatStatus.PROCESSING == "processing"
    assert ChatStatus.COMPLETED == "completed"
    assert ChatStatus.FAILED == "failed"


def test_provider_config():
    """Test ProviderConfig model."""
    config = ProviderConfig(
        provider="openai",
        model="gpt-4",
        parameters={"temperature": 0.5}
    )

    assert config.provider == "openai"
    assert config.model == "gpt-4"
    assert config.parameters == {"temperature": 0.5}
    assert config.built_in_tool is None


def test_provider_config_with_camel_case():
    """Test ProviderConfig with camelCase alias."""
    config = ProviderConfig(
        provider="anthropic",
        model="claude-3",
        parameters={},
        builtInTool="search"
    )

    assert config.built_in_tool == "search"


def test_session_data():
    """Test SessionData model."""
    config = ProviderConfig(
        provider="openai",
        model="gpt-4",
        parameters={}
    )
    session = SessionData(
        session_id="sess-123",
        provider_config=config,
        created_at="2024-01-01T00:00:00",
        updated_at="2024-01-01T01:00:00"
    )

    assert session.session_id == "sess-123"
    assert session.provider_config.provider == "openai"
    assert session.created_at == "2024-01-01T00:00:00"
    assert session.updated_at == "2024-01-01T01:00:00"


def test_session_data_without_config():
    """Test SessionData without provider config."""
    session = SessionData(
        session_id="sess-456",
        created_at="2024-01-01T00:00:00",
        updated_at="2024-01-01T00:00:00"
    )

    assert session.session_id == "sess-456"
    assert session.provider_config is None


def test_ensure_mutually_exclusive_no_conflict():
    """Test _ensure_mutually_exclusive with no conflicts."""
    # This should not raise an error
    _ensure_mutually_exclusive("openai", "gpt-4", {"temperature": 0.7})


def test_ensure_mutually_exclusive_with_conflict(monkeypatch):
    """Test _ensure_mutually_exclusive detects conflicts."""
    # Mock PROVIDER_CONFIG with mutually exclusive parameters
    mock_config = {
        "test-provider": {
            "models": {
                "test-model": {
                    "parameters": {
                        "temperature": {
                            "mutually_exclusive_with": ["top_p"]
                        },
                        "top_p": {
                            "mutually_exclusive_with": ["temperature"]
                        }
                    }
                }
            }
        }
    }

    import models.chat
    monkeypatch.setattr(models.chat, "PROVIDER_CONFIG", mock_config)

    # This should raise an error
    with pytest.raises(ValueError, match="mutually exclusive"):
        _ensure_mutually_exclusive(
            "test-provider",
            "test-model",
            {"temperature": 0.7, "top_p": 0.9}
        )


def test_chat_request_validates_mutually_exclusive(monkeypatch):
    """Test ChatRequest validates mutually exclusive parameters."""
    # Mock PROVIDER_CONFIG
    mock_config = {
        "openai": {
            "models": {
                "gpt-4": {
                    "parameters": {
                        "temperature": {
                            "mutually_exclusive_with": ["top_p"]
                        }
                    }
                }
            }
        }
    }

    import models.chat
    monkeypatch.setattr(models.chat, "PROVIDER_CONFIG", mock_config)

    messages = [ChatMessage(role="user", content="Test")]

    # This should raise an error during validation
    with pytest.raises(ValidationError):
        ChatRequest(
            messages=messages,
            provider="openai",
            model="gpt-4",
            parameters={"temperature": 0.7, "top_p": 0.9}
        )


def test_provider_config_validates_mutually_exclusive(monkeypatch):
    """Test ProviderConfig validates mutually exclusive parameters."""
    # Mock PROVIDER_CONFIG
    mock_config = {
        "anthropic": {
            "models": {
                "claude-3": {
                    "parameters": {
                        "temperature": {
                            "mutually_exclusive_with": ["top_k"]
                        }
                    }
                }
            }
        }
    }

    import models.chat
    monkeypatch.setattr(models.chat, "PROVIDER_CONFIG", mock_config)

    # This should raise an error during validation
    with pytest.raises(ValidationError):
        ProviderConfig(
            provider="anthropic",
            model="claude-3",
            parameters={"temperature": 1.0, "top_k": 50}
        )
