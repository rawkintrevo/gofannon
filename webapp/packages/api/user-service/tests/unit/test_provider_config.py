"""Unit tests for provider configuration data."""
from __future__ import annotations

import pytest

from config import provider_config


pytestmark = pytest.mark.unit


def test_provider_config_contains_expected_entries():
    config = provider_config.PROVIDER_CONFIG

    assert config["openai"]["api_key_env_var"] == "OPENAI_API_KEY"
    assert "gpt-5.2" in config["openai"]["models"]

    assert config["anthropic"]["api_key_env_var"] == "ANTHROPIC_API_KEY"
    assert "claude-opus-4-20250514" in config["anthropic"]["models"]

    assert config["gemini"]["api_key_env_var"] == "GEMINI_API_KEY"
    assert config["gemini"]["models"]

    assert "ollama" in config
    assert "llama2" in config["ollama"]["models"]
    assert "temperature" in config["ollama"]["models"]["llama2"]["parameters"]
