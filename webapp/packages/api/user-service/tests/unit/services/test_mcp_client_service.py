"""Unit tests for MCP client service."""
from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch
from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from httpx import HTTPStatusError, Response

from services.mcp_client_service import McpClientService


pytestmark = pytest.mark.unit


@pytest.fixture
def mcp_service():
    """Create an McpClientService instance for tests."""
    return McpClientService()


@pytest.mark.asyncio
async def test_list_tools_for_server_success(mcp_service):
    """Test successfully listing tools from an MCP server."""
    # Mock Tool objects
    mock_tool1 = SimpleNamespace(name="tool1", description="First tool")
    mock_tool2 = SimpleNamespace(name="tool2", description="Second tool")
    mock_tools = [mock_tool1, mock_tool2]

    # Mock Client
    mock_client = MagicMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=None)
    mock_client.list_tools = AsyncMock(return_value=mock_tools)

    with patch("services.mcp_client_service.Client", return_value=mock_client):
        tools = await mcp_service.list_tools_for_server("https://example.com/mcp")

    assert len(tools) == 2
    assert tools[0] == {"name": "tool1", "description": "First tool"}
    assert tools[1] == {"name": "tool2", "description": "Second tool"}


@pytest.mark.asyncio
async def test_list_tools_for_server_with_auth(mcp_service):
    """Test listing tools with authentication token."""
    mock_tool = SimpleNamespace(name="secure_tool", description="Secure tool")
    mock_tools = [mock_tool]

    mock_client = MagicMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=None)
    mock_client.list_tools = AsyncMock(return_value=mock_tools)

    with patch("services.mcp_client_service.Client", return_value=mock_client) as mock_client_class:
        with patch("services.mcp_client_service.BearerAuth") as mock_bearer_auth:
            mock_auth = MagicMock()
            mock_bearer_auth.return_value = mock_auth

            tools = await mcp_service.list_tools_for_server(
                "https://secure.example.com/mcp",
                auth_token="secret-token"
            )

            # Verify BearerAuth was created with the token
            mock_bearer_auth.assert_called_once_with(token="secret-token")
            # Verify Client was created with auth
            mock_client_class.assert_called_once_with("https://secure.example.com/mcp", auth=mock_auth)

    assert len(tools) == 1
    assert tools[0]["name"] == "secure_tool"


@pytest.mark.asyncio
async def test_list_tools_for_server_invalid_url(mcp_service):
    """Test listing tools with invalid URL scheme."""
    with pytest.raises(HTTPException) as exc_info:
        await mcp_service.list_tools_for_server("ftp://invalid.com/mcp")

    assert exc_info.value.status_code == 400
    assert "Invalid MCP server URL scheme" in exc_info.value.detail


@pytest.mark.asyncio
async def test_list_tools_for_server_http_status_error(mcp_service):
    """Test handling HTTP status errors."""
    mock_response = Response(status_code=404, text="Not Found")
    http_error = HTTPStatusError("Not Found", request=MagicMock(), response=mock_response)

    mock_client = MagicMock()
    mock_client.__aenter__ = AsyncMock(side_effect=http_error)
    mock_client.__aexit__ = AsyncMock(return_value=None)

    with patch("services.mcp_client_service.Client", return_value=mock_client):
        with pytest.raises(HTTPException) as exc_info:
            await mcp_service.list_tools_for_server("https://example.com/mcp")

    assert exc_info.value.status_code == 404
    assert "Failed to connect to MCP server" in exc_info.value.detail


@pytest.mark.asyncio
async def test_list_tools_for_server_generic_error(mcp_service):
    """Test handling generic exceptions."""
    mock_client = MagicMock()
    mock_client.__aenter__ = AsyncMock(side_effect=Exception("Connection timeout"))
    mock_client.__aexit__ = AsyncMock(return_value=None)

    with patch("services.mcp_client_service.Client", return_value=mock_client):
        with pytest.raises(HTTPException) as exc_info:
            await mcp_service.list_tools_for_server("https://example.com/mcp")

    assert exc_info.value.status_code == 500
    assert "Connection timeout" in exc_info.value.detail


@pytest.mark.asyncio
async def test_list_tools_for_server_empty_tools(mcp_service):
    """Test listing tools when server has no tools."""
    mock_tools = []

    mock_client = MagicMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=None)
    mock_client.list_tools = AsyncMock(return_value=mock_tools)

    with patch("services.mcp_client_service.Client", return_value=mock_client):
        tools = await mcp_service.list_tools_for_server("https://example.com/mcp")

    assert len(tools) == 0
    assert tools == []


@pytest.mark.asyncio
async def test_list_tools_with_http_url(mcp_service):
    """Test listing tools with http:// URL (should be allowed)."""
    mock_tool = SimpleNamespace(name="tool", description="A tool")
    mock_tools = [mock_tool]

    mock_client = MagicMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=None)
    mock_client.list_tools = AsyncMock(return_value=mock_tools)

    with patch("services.mcp_client_service.Client", return_value=mock_client):
        tools = await mcp_service.list_tools_for_server("http://localhost:8000/mcp")

    assert len(tools) == 1


def test_get_mcp_client_service():
    """Test the singleton getter function."""
    from services.mcp_client_service import get_mcp_client_service

    service1 = get_mcp_client_service()
    service2 = get_mcp_client_service()

    assert service1 is service2  # Should return the same instance
    assert isinstance(service1, McpClientService)
