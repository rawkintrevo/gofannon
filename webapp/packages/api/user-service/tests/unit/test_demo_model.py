"""Unit tests for demo models."""
from __future__ import annotations

import pytest
from datetime import datetime

from models.demo import (
    GenerateDemoCodeRequest,
    GenerateDemoCodeResponse,
    CreateDemoAppRequest,
    DemoApp,
)
from models.chat import ProviderConfig
from models.agent import DeployedApi


pytestmark = pytest.mark.unit


@pytest.fixture
def sample_provider_config():
    """Create a sample ProviderConfig for tests."""
    return ProviderConfig(
        provider="openai",
        model="gpt-4",
        parameters={"temperature": 0.7}
    )


@pytest.fixture
def sample_deployed_api():
    """Create a sample DeployedApi for tests."""
    return DeployedApi(
        friendlyName="weather-api",
        agentId="agent-123",
        description="Get weather information",
        inputSchema={"type": "object", "properties": {"city": {"type": "string"}}},
        outputSchema={"type": "object", "properties": {"temp": {"type": "number"}}}
    )


def test_generate_demo_code_request(sample_provider_config, sample_deployed_api):
    """Test GenerateDemoCodeRequest model."""
    req = GenerateDemoCodeRequest(
        userPrompt="Create a weather dashboard",
        selectedApis=[sample_deployed_api],
        modelConfig=sample_provider_config
    )

    assert req.user_prompt == "Create a weather dashboard"
    assert len(req.selected_apis) == 1
    assert req.composer_model_config.provider == "openai"
    assert req.built_in_tools == []


def test_generate_demo_code_request_with_built_in_tools(sample_provider_config, sample_deployed_api):
    """Test GenerateDemoCodeRequest with built-in tools."""
    req = GenerateDemoCodeRequest(
        userPrompt="Create a search app",
        selectedApis=[sample_deployed_api],
        modelConfig=sample_provider_config,
        builtInTools=["web_search", "calculator"]
    )

    assert req.built_in_tools == ["web_search", "calculator"]


def test_generate_demo_code_response():
    """Test GenerateDemoCodeResponse model."""
    resp = GenerateDemoCodeResponse(
        html="<div>Hello</div>",
        css=".app { color: blue; }",
        js="console.log('test');",
        thoughts={"reasoning": "Simple app"}
    )

    assert resp.html == "<div>Hello</div>"
    assert resp.css == ".app { color: blue; }"
    assert resp.js == "console.log('test');"
    assert resp.thoughts == {"reasoning": "Simple app"}


def test_generate_demo_code_response_defaults():
    """Test GenerateDemoCodeResponse with default values."""
    resp = GenerateDemoCodeResponse()

    assert resp.html == ""
    assert resp.css == ""
    assert resp.js == ""
    assert resp.thoughts is None


def test_create_demo_app_request(sample_provider_config, sample_deployed_api):
    """Test CreateDemoAppRequest model."""
    generated_code = GenerateDemoCodeResponse(
        html="<div>App</div>",
        css="body { margin: 0; }",
        js="const app = {};"
    )

    req = CreateDemoAppRequest(
        name="my-demo",
        description="A test demo app",
        selectedApis=[sample_deployed_api],
        modelConfig=sample_provider_config,
        userPrompt="Build a demo",
        generatedCode=generated_code,
        composerThoughts={"step": "planning"}
    )

    assert req.name == "my-demo"
    assert req.description == "A test demo app"
    assert len(req.selected_apis) == 1
    assert req.user_prompt == "Build a demo"
    assert req.generated_code.html == "<div>App</div>"
    assert req.composer_thoughts == {"step": "planning"}


def test_create_demo_app_request_minimal(sample_provider_config, sample_deployed_api):
    """Test CreateDemoAppRequest with minimal fields."""
    generated_code = GenerateDemoCodeResponse()

    req = CreateDemoAppRequest(
        name="minimal-demo",
        selectedApis=[sample_deployed_api],
        modelConfig=sample_provider_config,
        userPrompt="Simple demo",
        generatedCode=generated_code
    )

    assert req.name == "minimal-demo"
    assert req.description is None
    assert req.composer_thoughts is None


def test_demo_app(sample_provider_config, sample_deployed_api):
    """Test DemoApp model with auto-generated fields."""
    generated_code = GenerateDemoCodeResponse(
        html="<h1>Demo</h1>",
        css="h1 { color: red; }",
        js="alert('demo');"
    )

    demo = DemoApp(
        name="test-demo",
        description="Test description",
        selectedApis=[sample_deployed_api],
        modelConfig=sample_provider_config,
        userPrompt="Create test",
        generatedCode=generated_code
    )

    assert demo.name == "test-demo"
    assert demo.id is not None  # Auto-generated UUID
    assert isinstance(demo.id, str)
    assert demo.rev is None
    assert isinstance(demo.created_at, datetime)
    assert isinstance(demo.updated_at, datetime)


def test_demo_app_with_custom_id(sample_provider_config, sample_deployed_api):
    """Test DemoApp with custom ID and rev."""
    generated_code = GenerateDemoCodeResponse()

    demo = DemoApp(
        name="custom-demo",
        selectedApis=[sample_deployed_api],
        modelConfig=sample_provider_config,
        userPrompt="Test",
        generatedCode=generated_code,
        _id="custom-demo-id",
        _rev="1-abc"
    )

    assert demo.id == "custom-demo-id"
    assert demo.rev == "1-abc"


def test_demo_app_camel_case_aliases(sample_provider_config, sample_deployed_api):
    """Test DemoApp accepts camelCase field names."""
    generated_code = GenerateDemoCodeResponse()

    demo = DemoApp(
        name="camel-demo",
        selectedApis=[sample_deployed_api],
        modelConfig=sample_provider_config,
        userPrompt="Test camelCase",
        generatedCode=generated_code,
        composerThoughts={"test": "thoughts"}
    )

    # Verify the fields are accessible with snake_case
    assert demo.composer_thoughts == {"test": "thoughts"}
    assert demo.selected_apis == [sample_deployed_api]
    assert demo.user_prompt == "Test camelCase"


def test_demo_app_inherits_from_create_request(sample_provider_config, sample_deployed_api):
    """Test that DemoApp inherits all fields from CreateDemoAppRequest."""
    generated_code = GenerateDemoCodeResponse()

    demo = DemoApp(
        name="inherited-demo",
        description="Inheritance test",
        selectedApis=[sample_deployed_api],
        modelConfig=sample_provider_config,
        userPrompt="Testing inheritance",
        generatedCode=generated_code
    )

    # Should have all CreateDemoAppRequest fields
    assert hasattr(demo, 'name')
    assert hasattr(demo, 'description')
    assert hasattr(demo, 'selected_apis')
    assert hasattr(demo, 'composer_model_config')
    assert hasattr(demo, 'user_prompt')
    assert hasattr(demo, 'generated_code')
    assert hasattr(demo, 'composer_thoughts')

    # Plus DemoApp-specific fields
    assert hasattr(demo, 'id')
    assert hasattr(demo, 'rev')
    assert hasattr(demo, 'created_at')
    assert hasattr(demo, 'updated_at')
