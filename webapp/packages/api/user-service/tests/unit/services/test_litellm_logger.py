"""Unit tests for LiteLLM logger."""
from __future__ import annotations

import json
from unittest.mock import MagicMock, patch

import pytest

from services.litellm_logger import (
    ObservabilityLiteLLMLogger,
    _get_logging_mode,
    ensure_litellm_logging,
)


pytestmark = pytest.mark.unit


def test_get_logging_mode_default(monkeypatch):
    """Test default logging mode is NONE."""
    monkeypatch.delenv("LITELLM_LOGGING_MODE", raising=False)
    assert _get_logging_mode() == "NONE"


def test_get_logging_mode_all(monkeypatch):
    """Test logging mode set to ALL."""
    monkeypatch.setenv("LITELLM_LOGGING_MODE", "ALL")
    assert _get_logging_mode() == "ALL"


def test_get_logging_mode_cost_only(monkeypatch):
    """Test logging mode set to COST_ONLY."""
    monkeypatch.setenv("LITELLM_LOGGING_MODE", "COST_ONLY")
    assert _get_logging_mode() == "COST_ONLY"


def test_get_logging_mode_invalid(monkeypatch):
    """Test invalid logging mode defaults to NONE."""
    monkeypatch.setenv("LITELLM_LOGGING_MODE", "INVALID")
    assert _get_logging_mode() == "NONE"


def test_get_logging_mode_case_insensitive(monkeypatch):
    """Test logging mode is case-insensitive."""
    monkeypatch.setenv("LITELLM_LOGGING_MODE", "all")
    assert _get_logging_mode() == "ALL"


@pytest.mark.asyncio
async def test_logger_async_log_success(monkeypatch):
    """Test async_log_success_event."""
    monkeypatch.setenv("LITELLM_LOGGING_MODE", "ALL")

    mock_observability = MagicMock()
    with patch("services.litellm_logger.get_observability_service", return_value=mock_observability):
        logger = ObservabilityLiteLLMLogger()

        kwargs = {
            "standard_logging_object": {
                "status": "success",
                "model": "gpt-4",
                "response_cost": 0.01
            }
        }

        await logger.async_log_success_event(kwargs, None, None, None)

        mock_observability.log.assert_called_once()
        call_args = mock_observability.log.call_args[1]
        assert call_args["level"] == "INFO"
        assert call_args["event_type"] == "litellm_call"
        assert "status: success" in call_args["message"]


@pytest.mark.asyncio
async def test_logger_async_log_failure(monkeypatch):
    """Test async_log_failure_event."""
    monkeypatch.setenv("LITELLM_LOGGING_MODE", "ALL")

    mock_observability = MagicMock()
    with patch("services.litellm_logger.get_observability_service", return_value=mock_observability):
        logger = ObservabilityLiteLLMLogger()

        kwargs = {
            "standard_logging_object": {
                "status": "failure",
                "error": "API error"
            }
        }

        await logger.async_log_failure_event(kwargs, None, None, None)

        mock_observability.log.assert_called_once()
        call_args = mock_observability.log.call_args[1]
        assert call_args["level"] == "ERROR"


@pytest.mark.asyncio
async def test_logger_none_mode(monkeypatch):
    """Test logger does nothing when mode is NONE."""
    monkeypatch.setenv("LITELLM_LOGGING_MODE", "NONE")

    mock_observability = MagicMock()
    with patch("services.litellm_logger.get_observability_service", return_value=mock_observability):
        logger = ObservabilityLiteLLMLogger()

        kwargs = {"standard_logging_object": {"status": "success"}}
        await logger.async_log_success_event(kwargs, None, None, None)

        mock_observability.log.assert_not_called()


@pytest.mark.asyncio
async def test_logger_cost_only_mode(monkeypatch):
    """Test logger only logs cost information in COST_ONLY mode."""
    monkeypatch.setenv("LITELLM_LOGGING_MODE", "COST_ONLY")

    mock_observability = MagicMock()
    with patch("services.litellm_logger.get_observability_service", return_value=mock_observability):
        logger = ObservabilityLiteLLMLogger()

        kwargs = {
            "standard_logging_object": {
                "status": "success",
                "model": "gpt-4",
                "messages": ["hidden"],
                "response_cost": 0.05,
                "cost_breakdown": {"input": 0.03, "output": 0.02}
            }
        }

        await logger.async_log_success_event(kwargs, None, None, None)

        mock_observability.log.assert_called_once()
        call_args = mock_observability.log.call_args[1]
        metadata = call_args["metadata"]["standardLoggingPayload"]

        # Should only have cost fields
        assert "response_cost" in metadata
        assert "cost_breakdown" in metadata
        # Should not have other fields
        assert "model" not in metadata
        assert "messages" not in metadata


@pytest.mark.asyncio
async def test_logger_handles_missing_payload(monkeypatch):
    """Test logger handles missing standard_logging_object."""
    monkeypatch.setenv("LITELLM_LOGGING_MODE", "ALL")

    mock_observability = MagicMock()
    with patch("services.litellm_logger.get_observability_service", return_value=mock_observability):
        logger = ObservabilityLiteLLMLogger()

        kwargs = {}  # No standard_logging_object
        await logger.async_log_success_event(kwargs, None, None, None)

        # Should not call log if no payload
        mock_observability.log.assert_not_called()


@pytest.mark.asyncio
async def test_logger_handles_serialization_error(monkeypatch):
    """Test logger handles serialization errors gracefully."""
    monkeypatch.setenv("LITELLM_LOGGING_MODE", "ALL")

    mock_observability = MagicMock()
    with patch("services.litellm_logger.get_observability_service", return_value=mock_observability):
        logger = ObservabilityLiteLLMLogger()

        # Create an object that can't be serialized normally
        class NonSerializable:
            def __str__(self):
                raise Exception("Cannot serialize")

        kwargs = {
            "standard_logging_object": {
                "status": "success",
                "bad_field": NonSerializable()
            }
        }

        # Should not raise an exception
        await logger.async_log_success_event(kwargs, None, None, None)

        # Should still call log with error message
        mock_observability.log.assert_called_once()


def test_ensure_litellm_logging_none_mode(monkeypatch):
    """Test ensure_litellm_logging does nothing when mode is NONE."""
    monkeypatch.setenv("LITELLM_LOGGING_MODE", "NONE")

    import services.litellm_logger as logger_module
    logger_module._configured_logger = False

    with patch.object(logger_module, "litellm") as mock_litellm:
        mock_litellm.callbacks = []
        ensure_litellm_logging()

        # Should not add any callbacks
        assert len(mock_litellm.callbacks) == 0


def test_ensure_litellm_logging_adds_logger(monkeypatch):
    """Test ensure_litellm_logging adds logger when needed."""
    monkeypatch.setenv("LITELLM_LOGGING_MODE", "ALL")

    import services.litellm_logger as logger_module
    logger_module._configured_logger = False

    with patch.object(logger_module, "litellm") as mock_litellm:
        with patch("services.litellm_logger.get_observability_service"):
            mock_litellm.callbacks = []
            ensure_litellm_logging()

            # Should add ObservabilityLiteLLMLogger
            assert len(mock_litellm.callbacks) == 1
            assert isinstance(mock_litellm.callbacks[0], ObservabilityLiteLLMLogger)


def test_ensure_litellm_logging_idempotent(monkeypatch):
    """Test ensure_litellm_logging only adds logger once."""
    monkeypatch.setenv("LITELLM_LOGGING_MODE", "ALL")

    import services.litellm_logger as logger_module

    with patch.object(logger_module, "litellm") as mock_litellm:
        with patch("services.litellm_logger.get_observability_service"):
            # Add a logger manually
            existing_logger = ObservabilityLiteLLMLogger()
            mock_litellm.callbacks = [existing_logger]

            # Reset the flag to test idempotency
            logger_module._configured_logger = False

            ensure_litellm_logging()

            # Should not add another logger
            assert len(mock_litellm.callbacks) == 1
            assert mock_litellm.callbacks[0] is existing_logger
