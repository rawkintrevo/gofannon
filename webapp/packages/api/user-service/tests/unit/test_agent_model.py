"""Unit tests for agent models."""
from __future__ import annotations

import pytest
from pydantic import ValidationError
from datetime import datetime

from models.agent import (
    SwaggerSpec,
    GenerateCodeRequest,
    GenerateCodeResponse,
    CreateAgentRequest,
    UpdateAgentRequest,
    Agent,
    RunCodeRequest,
    RunCodeResponse,
    Deployment,
    DeployedApi,
)
from models.chat import ProviderConfig


pytestmark = pytest.mark.unit


def test_swagger_spec():
    """Test SwaggerSpec model."""
    spec = SwaggerSpec(name="api", content="openapi: 3.0.0")
    assert spec.name == "api"
    assert spec.content == "openapi: 3.0.0"


def test_generate_code_request():
    """Test GenerateCodeRequest model."""
    model_config = ProviderConfig(
        provider="openai",
        model="gpt-4",
        parameters={}
    )

    req = GenerateCodeRequest(
        tools={"mcp": ["tool1"]},
        description="Test agent",
        inputSchema={"type": "object"},
        outputSchema={"type": "string"},
        modelConfig=model_config
    )

    assert req.tools == {"mcp": ["tool1"]}
    assert req.description == "Test agent"
    assert req.input_schema == {"type": "object"}
    assert req.output_schema == {"type": "string"}
    assert req.composer_model_config.provider == "openai"
    assert req.invokable_models is None
    assert req.swagger_specs is None
    assert req.gofannon_agents is None
    assert req.built_in_tools == []


def test_generate_code_request_with_all_fields():
    """Test GenerateCodeRequest with all optional fields."""
    model_config = ProviderConfig(
        provider="anthropic",
        model="claude-3",
        parameters={"temperature": 0.7}
    )

    invokable = [
        ProviderConfig(provider="openai", model="gpt-3.5-turbo", parameters={})
    ]

    swagger_specs = [
        SwaggerSpec(name="api1", content="spec1")
    ]

    req = GenerateCodeRequest(
        tools={"mcp": ["tool1", "tool2"]},
        description="Complex agent",
        inputSchema={"type": "object", "properties": {}},
        outputSchema={"type": "object"},
        modelConfig=model_config,
        invokableModels=invokable,
        swaggerSpecs=swagger_specs,
        gofannonAgents=["agent1"],
        builtInTools=["web_search"]
    )

    assert req.invokable_models == invokable
    assert req.swagger_specs == swagger_specs
    assert req.gofannon_agents == ["agent1"]
    assert req.built_in_tools == ["web_search"]


def test_generate_code_response():
    """Test GenerateCodeResponse model."""
    resp = GenerateCodeResponse(
        code="def main(): pass",
        friendlyName="my-agent",
        docstring="This is my agent",
        thoughts={"reasoning": "test"}
    )

    assert resp.code == "def main(): pass"
    assert resp.friendly_name == "my-agent"
    assert resp.docstring == "This is my agent"
    assert resp.thoughts == {"reasoning": "test"}


def test_create_agent_request_minimal():
    """Test CreateAgentRequest with minimal fields."""
    req = CreateAgentRequest(
        name="test-agent",
        description="A test agent",
        code="def main(): pass"
    )

    assert req.name == "test-agent"
    assert req.description == "A test agent"
    assert req.code == "def main(): pass"
    assert req.docstring is None
    assert req.friendly_name is None
    assert req.tools == {}
    assert req.swagger_specs == []
    assert req.gofannon_agents == []


def test_create_agent_request_full():
    """Test CreateAgentRequest with all fields."""
    model_config = ProviderConfig(
        provider="openai",
        model="gpt-4",
        parameters={}
    )

    req = CreateAgentRequest(
        name="full-agent",
        description="Full agent",
        code="def main(): return 42",
        docstring="Full docstring",
        friendlyName="full-agent-friendly",
        tools={"mcp": ["tool1"]},
        swaggerSpecs=[SwaggerSpec(name="api", content="spec")],
        inputSchema={"type": "object"},
        outputSchema={"type": "number"},
        invokableModels=[model_config],
        gofannonAgents=["agent1"],
        composerThoughts={"key": "value"},
        composerModelConfig=model_config
    )

    assert req.name == "full-agent"
    assert req.friendly_name == "full-agent-friendly"
    assert req.composer_thoughts == {"key": "value"}
    assert req.composer_model_config == model_config


def test_update_agent_request():
    """Test UpdateAgentRequest allows partial updates."""
    req = UpdateAgentRequest(
        name="updated-name",
        description="updated description"
    )

    assert req.name == "updated-name"
    assert req.description == "updated description"
    assert req.code is None
    assert req.docstring is None


def test_update_agent_request_with_camel_case():
    """Test UpdateAgentRequest accepts camelCase aliases."""
    req = UpdateAgentRequest(
        friendlyName="new-friendly",
        swaggerSpecs=[SwaggerSpec(name="api", content="spec")],
        gofannonAgents=["agent2"]
    )

    assert req.friendly_name == "new-friendly"
    assert len(req.swagger_specs) == 1
    assert req.gofannon_agents == ["agent2"]


def test_agent_model():
    """Test Agent model with auto-generated fields."""
    agent = Agent(
        name="my-agent",
        description="Test agent",
        code="def main(): pass"
    )

    assert agent.name == "my-agent"
    assert agent.id is not None  # Auto-generated UUID
    assert isinstance(agent.id, str)
    assert agent.rev is None
    assert isinstance(agent.created_at, datetime)
    assert isinstance(agent.updated_at, datetime)


def test_agent_with_custom_id():
    """Test Agent with custom ID and rev."""
    agent = Agent(
        name="my-agent",
        description="Test",
        code="pass",
        _id="custom-id",
        _rev="1-abc"
    )

    assert agent.id == "custom-id"
    assert agent.rev == "1-abc"


def test_run_code_request():
    """Test RunCodeRequest model."""
    req = RunCodeRequest(
        code="def main(x): return x * 2",
        inputDict={"x": 5},
        tools={"mcp": ["tool1"]}
    )

    assert req.code == "def main(x): return x * 2"
    assert req.input_dict == {"x": 5}
    assert req.tools == {"mcp": ["tool1"]}
    assert req.gofannon_agents == []


def test_run_code_request_with_gofannon_agents():
    """Test RunCodeRequest with gofannon agents."""
    req = RunCodeRequest(
        code="pass",
        inputDict={},
        tools={},
        gofannonAgents=["agent1", "agent2"]
    )

    assert req.gofannon_agents == ["agent1", "agent2"]


def test_run_code_response_success():
    """Test RunCodeResponse for successful execution."""
    resp = RunCodeResponse(result={"output": 42}, error=None)

    assert resp.result == {"output": 42}
    assert resp.error is None


def test_run_code_response_error():
    """Test RunCodeResponse for error case."""
    resp = RunCodeResponse(result=None, error="Division by zero")

    assert resp.result is None
    assert resp.error == "Division by zero"


def test_deployment():
    """Test Deployment model."""
    deployment = Deployment(
        _id="my-deployment",
        agentId="agent-123",
        _rev="1-xyz"
    )

    assert deployment.id == "my-deployment"
    assert deployment.agent_id == "agent-123"
    assert deployment.rev == "1-xyz"


def test_deployment_without_rev():
    """Test Deployment without revision."""
    deployment = Deployment(
        _id="deployment-id",
        agentId="agent-456"
    )

    assert deployment.id == "deployment-id"
    assert deployment.agent_id == "agent-456"
    assert deployment.rev is None


def test_deployed_api():
    """Test DeployedApi model."""
    api = DeployedApi(
        friendlyName="weather-api",
        agentId="agent-789",
        description="Get weather data",
        inputSchema={"type": "object", "properties": {"city": {"type": "string"}}},
        outputSchema={"type": "object", "properties": {"temp": {"type": "number"}}}
    )

    assert api.friendly_name == "weather-api"
    assert api.agent_id == "agent-789"
    assert api.description == "Get weather data"
    assert "city" in api.input_schema["properties"]
    assert "temp" in api.output_schema["properties"]


def test_model_config_inheritance():
    """Test that Agent inherits model_config from CreateAgentRequest."""
    agent = Agent(
        name="test",
        description="test",
        code="pass"
    )

    # Should be able to serialize with aliases
    data = agent.model_dump(by_alias=True)
    assert "_id" in data
    assert "createdAt" in data or "created_at" in data
