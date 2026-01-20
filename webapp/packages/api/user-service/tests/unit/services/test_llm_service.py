"""Unit tests for LLM service."""
from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import Mock

import pytest

from services import llm_service


pytestmark = pytest.mark.unit


class _DummyMessage:
    def __init__(self, content: str):
        self.content = content
        self.tool_calls = None


class _DummyChoice:
    def __init__(self, message):
        self.message = message


class _DummyResponse:
    def __init__(self, content: str, total_cost: float = 0.0):
        self.choices = [_DummyChoice(_DummyMessage(content))]
        self.usage = SimpleNamespace(total_cost=total_cost)


@pytest.mark.asyncio
async def test_call_llm_acompletion_success(monkeypatch):
    async def fake_acompletion(**_kwargs):
        return _DummyResponse("hello", total_cost=1.23)

    monkeypatch.setattr(llm_service.litellm, "acompletion", fake_acompletion)
    monkeypatch.setattr(llm_service, "get_observability_service", lambda: Mock())

    user_service = Mock()

    content, thoughts = await llm_service.call_llm(
        provider="openai",
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": "hi"}],
        parameters={},
        user_service=user_service,
        user_id="user-1",
    )

    assert content == "hello"
    assert thoughts is None
    user_service.require_allowance.assert_called_once_with("user-1", basic_info=None)
    user_service.add_usage.assert_called_once_with("user-1", 1.23, basic_info=None)


@pytest.mark.asyncio
async def test_call_llm_acompletion_error(monkeypatch):
    async def fake_acompletion(**_kwargs):
        raise RuntimeError("boom")

    observability = Mock()
    monkeypatch.setattr(llm_service.litellm, "acompletion", fake_acompletion)
    monkeypatch.setattr(llm_service, "get_observability_service", lambda: observability)

    user_service = Mock()

    with pytest.raises(RuntimeError, match="boom"):
        await llm_service.call_llm(
            provider="openai",
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": "hi"}],
            parameters={},
            user_service=user_service,
            user_id="user-2",
        )

    observability.log_exception.assert_called_once()


class _DummyDelta:
    def __init__(self, content: str):
        self.content = content


class _DummyStreamChoice:
    def __init__(self, delta):
        self.delta = delta


class _DummyStreamChunk:
    def __init__(self, content: str):
        self.choices = [_DummyStreamChoice(_DummyDelta(content))]


@pytest.mark.asyncio
async def test_stream_llm_success(monkeypatch):
    """Test successful streaming LLM call."""
    chunks_to_yield = [
        _DummyStreamChunk("Hello"),
        _DummyStreamChunk(" "),
        _DummyStreamChunk("World"),
    ]

    # For streaming, litellm.acompletion returns an awaitable that resolves
    # to an async generator, so we need to return an awaitable
    async def async_gen():
        for chunk in chunks_to_yield:
            yield chunk

    async def fake_acompletion(**_kwargs):
        return async_gen()

    monkeypatch.setattr(llm_service.litellm, "acompletion", fake_acompletion)
    monkeypatch.setattr(llm_service, "get_observability_service", lambda: Mock())

    user_service = Mock()

    received_chunks = []
    async for chunk in llm_service.stream_llm(
        provider="openai",
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": "hi"}],
        parameters={},
        user_service=user_service,
        user_id="user-1",
    ):
        received_chunks.append(chunk)

    assert len(received_chunks) == 3
    assert received_chunks[0].choices[0].delta.content == "Hello"
    assert received_chunks[1].choices[0].delta.content == " "
    assert received_chunks[2].choices[0].delta.content == "World"
    user_service.require_allowance.assert_called_once_with("user-1", basic_info=None)


@pytest.mark.asyncio
async def test_stream_llm_error(monkeypatch):
    """Test streaming LLM call with error."""
    async def fake_acompletion(**_kwargs):
        raise RuntimeError("stream error")

    observability = Mock()
    monkeypatch.setattr(llm_service.litellm, "acompletion", fake_acompletion)
    monkeypatch.setattr(llm_service, "get_observability_service", lambda: observability)

    user_service = Mock()

    with pytest.raises(RuntimeError, match="stream error"):
        async for _ in llm_service.stream_llm(
            provider="openai",
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": "hi"}],
            parameters={},
            user_service=user_service,
            user_id="user-2",
        ):
            pass

    observability.log_exception.assert_called_once()


@pytest.mark.asyncio
async def test_stream_llm_filters_none_params(monkeypatch):
    """Test that stream_llm filters out None values from parameters."""
    call_kwargs = {}

    async def async_gen():
        yield _DummyStreamChunk("test")

    async def fake_acompletion(**kwargs):
        call_kwargs.update(kwargs)
        return async_gen()

    monkeypatch.setattr(llm_service.litellm, "acompletion", fake_acompletion)
    monkeypatch.setattr(llm_service, "get_observability_service", lambda: Mock())
    monkeypatch.setattr(llm_service, "get_user_service", lambda _: Mock())
    monkeypatch.setattr(llm_service, "get_database_service", lambda _: Mock())

    async for _ in llm_service.stream_llm(
        provider="openai",
        model="gpt-4",
        messages=[{"role": "user", "content": "test"}],
        parameters={"temperature": 0.7, "top_p": None, "max_tokens": 100},
    ):
        pass

    # None values should be filtered out
    assert "temperature" in call_kwargs
    assert call_kwargs["temperature"] == 0.7
    assert "top_p" not in call_kwargs
    assert "max_tokens" in call_kwargs
    assert call_kwargs["stream"] is True
