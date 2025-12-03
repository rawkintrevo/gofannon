"""Firebase-native user service endpoints implemented as callable functions."""
from __future__ import annotations

import traceback
from datetime import datetime
from typing import Any, Dict

import firebase_admin
from firebase_functions import https_fn, options as firebase_options

from config import settings
from config.routes_config import RouterConfig, resolve_router_configs
from dependencies import (
    _execute_agent_code,
    deploy_agent,
    fetch_spec_content,
    get_agent_deployment,
    get_available_providers,
    undeploy_agent,
    list_deployments as list_deployments_logic,
    process_chat,
    require_admin_access,
    run_deployed_agent as run_deployed_agent_logic,
)
from models.agent import (
    Agent,
    CreateAgentRequest,
    DeployedApi,
    GenerateCodeRequest,
    GenerateCodeResponse,
    RunCodeRequest,
    RunCodeResponse,
)
from models.chat import ChatRequest, ChatResponse, ProviderConfig
from models.demo import CreateDemoAppRequest, DemoApp, GenerateDemoCodeRequest, GenerateDemoCodeResponse
from models.user import User
from services.database_service import get_database_service
from services.mcp_client_service import get_mcp_client_service
from services.observability_service import ObservabilityService, get_observability_service, get_sanitized_request_data
from services.user_service import get_user_service


# Firebase initialization
if not firebase_admin._apps:
    firebase_admin.initialize_app()

# Shared deployment options for all callable endpoints
FUNCTION_DEPLOYMENT_OPTIONS = {
    "cpu": 1,
    "memory": firebase_options.MemoryOption.GB_1,
    "timeout_sec": 540,
}


class ServiceContext:
    """Container for services used by callable endpoints."""

    def __init__(self) -> None:
        self.db_service = get_database_service(settings)
        self.user_service = get_user_service(self.db_service)
        self.logger = get_observability_service()
        self.mcp_client_service = get_mcp_client_service()


SERVICE_CONTEXT = ServiceContext()


def ensure_authenticated(request: https_fn.CallableRequest) -> Dict[str, Any]:
    """Ensure the request is authenticated and return user info."""
    if settings.APP_ENV != "firebase":
        return {"uid": "local-dev-user"}

    if not request.auth:
        raise https_fn.HttpsError(code=https_fn.FunctionsErrorCode.UNAUTHENTICATED, message="Not authenticated")

    return request.auth


def ensure_admin_access(request: https_fn.CallableRequest) -> None:
    if settings.ADMIN_PANEL_ENABLED and request.auth:
        claims = request.auth.get("token", {}) if isinstance(request.auth, dict) else {}
        if claims.get("admin"):
            return
    try:
        require_admin_access()
    except Exception as exc:  # noqa: BLE001
        raise https_fn.HttpsError(code=https_fn.FunctionsErrorCode.PERMISSION_DENIED, message=str(exc)) from exc


async def run_with_error_handling(coro):
    try:
        return await coro
    except https_fn.HttpsError:
        raise
    except Exception as exc:  # noqa: BLE001
        traceback.print_exc()
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.INTERNAL,
            message=str(exc),
        ) from exc


@https_fn.on_call(**FUNCTION_DEPLOYMENT_OPTIONS)
def read_root(request: https_fn.CallableRequest) -> Dict[str, str]:
    return {"Hello": "World", "Service": "User-Service"}


@https_fn.on_call(**FUNCTION_DEPLOYMENT_OPTIONS)
async def log_client_event(request: https_fn.CallableRequest) -> Dict[str, str]:
    user = ensure_authenticated(request)
    payload = request.data or {}
    logger: ObservabilityService = SERVICE_CONTEXT.logger
    metadata = payload.get("metadata") or {}
    metadata.update({"user_agent": request.raw_request.headers.get("user-agent") if request.raw_request else None})
    logger.log(
        event_type=payload.get("eventType", "unknown"),
        message=payload.get("message", ""),
        level=payload.get("level", "INFO"),
        service="webui",
        user_id=user.get("uid", "anonymous"),
        metadata=metadata,
    )
    return {"status": "logged"}


@https_fn.on_call(**FUNCTION_DEPLOYMENT_OPTIONS)
def get_providers_callable(_: https_fn.CallableRequest):
    return get_available_providers()


@https_fn.on_call(**FUNCTION_DEPLOYMENT_OPTIONS)
def get_provider_config_callable(request: https_fn.CallableRequest):
    provider = (request.data or {}).get("provider")
    available = get_available_providers()
    if provider not in available:
        raise https_fn.HttpsError(code=https_fn.FunctionsErrorCode.NOT_FOUND, message="Provider not found or not configured")
    return available[provider]


@https_fn.on_call(**FUNCTION_DEPLOYMENT_OPTIONS)
def get_provider_models_callable(request: https_fn.CallableRequest):
    provider = (request.data or {}).get("provider")
    available = get_available_providers()
    if provider not in available:
        raise https_fn.HttpsError(code=https_fn.FunctionsErrorCode.NOT_FOUND, message="Provider not found or not configured")
    return list(available[provider]["models"].keys())


@https_fn.on_call(**FUNCTION_DEPLOYMENT_OPTIONS)
def get_model_config_callable(request: https_fn.CallableRequest):
    provider = (request.data or {}).get("provider")
    model = (request.data or {}).get("model")
    available = get_available_providers()
    if provider not in available or model not in available[provider]["models"]:
        raise https_fn.HttpsError(code=https_fn.FunctionsErrorCode.NOT_FOUND, message="Provider or model not found")
    return available[provider]["models"][model]


@https_fn.on_call(**FUNCTION_DEPLOYMENT_OPTIONS)
def get_current_user_profile_callable(request: https_fn.CallableRequest) -> User:
    user = ensure_authenticated(request)
    return SERVICE_CONTEXT.user_service.get_user(user.get("uid", "anonymous"), user)


@https_fn.on_call(**FUNCTION_DEPLOYMENT_OPTIONS)
def list_all_users_callable(request: https_fn.CallableRequest):
    ensure_admin_access(request)
    return SERVICE_CONTEXT.user_service.list_users()


@https_fn.on_call(**FUNCTION_DEPLOYMENT_OPTIONS)
def update_user_allowances_callable(request: https_fn.CallableRequest):
    ensure_admin_access(request)
    data = request.data or {}
    user_id = data.get("userId")
    return SERVICE_CONTEXT.user_service.update_user_usage_info(
        user_id,
        monthly_allowance=data.get("monthlyAllowance"),
        allowance_reset_date=data.get("allowanceResetDate"),
        spend_remaining=data.get("spendRemaining"),
    )


@https_fn.on_call(**FUNCTION_DEPLOYMENT_OPTIONS)
def set_monthly_allowance_callable(request: https_fn.CallableRequest):
    user = ensure_authenticated(request)
    data = request.data or {}
    return SERVICE_CONTEXT.user_service.set_monthly_allowance(user.get("uid", "anonymous"), data.get("monthlyAllowance"), user)


@https_fn.on_call(**FUNCTION_DEPLOYMENT_OPTIONS)
def set_allowance_reset_date_callable(request: https_fn.CallableRequest):
    user = ensure_authenticated(request)
    data = request.data or {}
    return SERVICE_CONTEXT.user_service.set_reset_date(user.get("uid", "anonymous"), data.get("allowanceResetDate"), user)


@https_fn.on_call(**FUNCTION_DEPLOYMENT_OPTIONS)
def reset_allowance_callable(request: https_fn.CallableRequest):
    user = ensure_authenticated(request)
    return SERVICE_CONTEXT.user_service.reset_allowance(user.get("uid", "anonymous"), user)


@https_fn.on_call(**FUNCTION_DEPLOYMENT_OPTIONS)
def update_spend_remaining_callable(request: https_fn.CallableRequest):
    user = ensure_authenticated(request)
    data = request.data or {}
    return SERVICE_CONTEXT.user_service.update_spend_remaining(user.get("uid", "anonymous"), data.get("spendRemaining"), user)


@https_fn.on_call(**FUNCTION_DEPLOYMENT_OPTIONS)
def add_usage_entry_callable(request: https_fn.CallableRequest):
    user = ensure_authenticated(request)
    data = request.data or {}
    return SERVICE_CONTEXT.user_service.add_usage(
        user.get("uid", "anonymous"),
        data.get("responseCost"),
        data.get("metadata"),
        user,
    )


@https_fn.on_call(**FUNCTION_DEPLOYMENT_OPTIONS)
async def chat_callable(request: https_fn.CallableRequest):
    user = ensure_authenticated(request)
    chat_request = ChatRequest(**(request.data or {}))
    ticket_id = chat_request.ticket_id or ""
    if not ticket_id:
        ticket_id = chat_request.dict().get("ticket_id") or chat_request.dict(by_alias=True).get("ticket_id") or ""
    if not ticket_id:
        ticket_id = str(datetime.utcnow().timestamp()).replace(".", "-")

    await run_with_error_handling(process_chat(ticket_id, chat_request, user, request.raw_request))
    return ChatResponse(ticket_id=ticket_id, status="pending").dict()


@https_fn.on_call(**FUNCTION_DEPLOYMENT_OPTIONS)
def get_chat_status_callable(request: https_fn.CallableRequest):
    ensure_authenticated(request)
    data = request.data or {}
    ticket_id = data.get("ticketId")
    db = SERVICE_CONTEXT.db_service
    ticket_data = db.get("tickets", ticket_id)
    return ChatResponse(
        ticket_id=ticket_data.get("_id", ticket_id),
        status=ticket_data["status"],
        result=ticket_data.get("result"),
        error=ticket_data.get("error"),
    ).dict()


@https_fn.on_call(**FUNCTION_DEPLOYMENT_OPTIONS)
def update_session_config_callable(request: https_fn.CallableRequest):
    ensure_authenticated(request)
    data = request.data or {}
    session_id = data.get("sessionId")
    config = ProviderConfig(**data.get("config", {}))
    db = SERVICE_CONTEXT.db_service
    try:
        session_doc = db.get("sessions", session_id)
    except Exception:
        session_doc = {"created_at": datetime.utcnow().isoformat()}
    session_doc["provider_config"] = config.dict()
    session_doc["updated_at"] = datetime.utcnow().isoformat()
    db.save("sessions", session_id, session_doc)
    return {"message": "Configuration updated", "session_id": session_id}


@https_fn.on_call(**FUNCTION_DEPLOYMENT_OPTIONS)
def get_session_config_callable(request: https_fn.CallableRequest):
    ensure_authenticated(request)
    session_id = (request.data or {}).get("sessionId")
    session_doc = SERVICE_CONTEXT.db_service.get("sessions", session_id)
    return session_doc.get("provider_config")


@https_fn.on_call(**FUNCTION_DEPLOYMENT_OPTIONS)
def delete_session_callable(request: https_fn.CallableRequest):
    ensure_authenticated(request)
    session_id = (request.data or {}).get("sessionId")
    SERVICE_CONTEXT.db_service.delete("sessions", session_id)
    return {"message": "Session deleted"}


@https_fn.on_call(**FUNCTION_DEPLOYMENT_OPTIONS)
def health_check_callable(_: https_fn.CallableRequest):
    return {"status": "healthy", "service": "user-service"}


@https_fn.on_call(**FUNCTION_DEPLOYMENT_OPTIONS)
async def create_agent_callable(request: https_fn.CallableRequest):
    user = ensure_authenticated(request)
    req = CreateAgentRequest(**(request.data or {}))
    db = SERVICE_CONTEXT.db_service
    logger = SERVICE_CONTEXT.logger
    agent = Agent(**req.model_dump(by_alias=True))
    saved_doc = db.save("agents", agent.id, agent.model_dump(by_alias=True, mode="json"))
    agent.rev = saved_doc.get("rev")
    logger.log(
        "INFO",
        "user_action",
        f"Agent '{agent.name}' created.",
        metadata={"agent_id": agent.id, "agent_name": agent.name, "request": get_sanitized_request_data(request.raw_request)},
    )
    return agent.model_dump()


@https_fn.on_call(**FUNCTION_DEPLOYMENT_OPTIONS)
async def list_agents_callable(request: https_fn.CallableRequest):
    ensure_authenticated(request)
    db = SERVICE_CONTEXT.db_service
    agents = [Agent(**doc).model_dump() for doc in db.list_all("agents")]
    SERVICE_CONTEXT.logger.log("INFO", "user_action", "Listed all agents.", metadata={"request": get_sanitized_request_data(request.raw_request)})
    return agents


@https_fn.on_call(**FUNCTION_DEPLOYMENT_OPTIONS)
def get_agent_callable(request: https_fn.CallableRequest):
    ensure_authenticated(request)
    agent_id = (request.data or {}).get("agentId")
    agent_doc = SERVICE_CONTEXT.db_service.get("agents", agent_id)
    return Agent(**agent_doc).model_dump()


@https_fn.on_call(**FUNCTION_DEPLOYMENT_OPTIONS)
def delete_agent_callable(request: https_fn.CallableRequest):
    ensure_authenticated(request)
    agent_id = (request.data or {}).get("agentId")
    SERVICE_CONTEXT.db_service.delete("agents", agent_id)
    SERVICE_CONTEXT.logger.log("INFO", "user_action", f"Agent '{agent_id}' deleted.", metadata={"agent_id": agent_id, "request": get_sanitized_request_data(request.raw_request)})
    return {"status": "deleted"}


@https_fn.on_call(**FUNCTION_DEPLOYMENT_OPTIONS)
async def list_mcp_tools_callable(request: https_fn.CallableRequest):
    ensure_authenticated(request)
    data = request.data or {}
    tools = await SERVICE_CONTEXT.mcp_client_service.list_tools_for_server(data.get("mcp_url"), data.get("auth_token"))
    return {"mcp_url": data.get("mcp_url"), "tools": tools}


@https_fn.on_call(**FUNCTION_DEPLOYMENT_OPTIONS)
async def generate_agent_code_callable(request: https_fn.CallableRequest):
    ensure_authenticated(request)
    req = GenerateCodeRequest(**(request.data or {}))
    from agent_factory import generate_agent_code as generate_code_function

    code = await generate_code_function(req)
    return GenerateCodeResponse(**code.model_dump()).model_dump()


@https_fn.on_call(**FUNCTION_DEPLOYMENT_OPTIONS)
async def fetch_spec_from_url_callable(request: https_fn.CallableRequest):
    ensure_authenticated(request)
    data = request.data or {}
    return await fetch_spec_content(data.get("url"))


@https_fn.on_call(**FUNCTION_DEPLOYMENT_OPTIONS)
async def deploy_agent_route_callable(request: https_fn.CallableRequest):
    ensure_authenticated(request)
    agent_id = (request.data or {}).get("agentId")
    return await deploy_agent(agent_id, SERVICE_CONTEXT.db_service)


@https_fn.on_call(**FUNCTION_DEPLOYMENT_OPTIONS)
async def undeploy_agent_route_callable(request: https_fn.CallableRequest):
    ensure_authenticated(request)
    agent_id = (request.data or {}).get("agentId")
    await undeploy_agent(agent_id, SERVICE_CONTEXT.db_service)
    return {"status": "undeployed"}


@https_fn.on_call(**FUNCTION_DEPLOYMENT_OPTIONS)
async def get_agent_deployment_route_callable(request: https_fn.CallableRequest):
    ensure_authenticated(request)
    agent_id = (request.data or {}).get("agentId")
    return await get_agent_deployment(agent_id, SERVICE_CONTEXT.db_service)


@https_fn.on_call(**FUNCTION_DEPLOYMENT_OPTIONS)
async def list_deployments_route_callable(request: https_fn.CallableRequest):
    ensure_authenticated(request)
    deployments = await list_deployments_logic(SERVICE_CONTEXT.db_service)
    return [DeployedApi(**dep).model_dump() for dep in deployments]


@https_fn.on_call(**FUNCTION_DEPLOYMENT_OPTIONS)
async def run_agent_code_callable(request: https_fn.CallableRequest):
    ensure_authenticated(request)
    req = RunCodeRequest(**(request.data or {}))
    logger = SERVICE_CONTEXT.logger
    logger.log("INFO", "user_action", "Attempting to run agent code in sandbox.", metadata={"request": get_sanitized_request_data(request.raw_request)})
    try:
        result = await _execute_agent_code(
            code=req.code,
            input_dict=req.input_dict,
            tools=req.tools,
            gofannon_agents=req.gofannon_agents,
            db=SERVICE_CONTEXT.db_service,
        )
        logger.log("INFO", "sandbox_run", "Agent code executed successfully.", metadata={"request": get_sanitized_request_data(request.raw_request)})
        return RunCodeResponse(result=result).model_dump()
    except Exception as exc:  # noqa: BLE001
        tb_str = traceback.format_exc()
        logger.log("ERROR", "sandbox_run_failure", f"Error running agent code: {exc}", metadata={"traceback": tb_str, "request": get_sanitized_request_data(request.raw_request)})
        raise https_fn.HttpsError(code=https_fn.FunctionsErrorCode.INTERNAL, message=str(exc)) from exc


@https_fn.on_call(**FUNCTION_DEPLOYMENT_OPTIONS)
async def run_deployed_agent_route_callable(request: https_fn.CallableRequest):
    ensure_authenticated(request)
    data = request.data or {}
    friendly_name = data.get("friendlyName")
    input_dict = data.get("input", {})
    return await run_deployed_agent_logic(friendly_name, input_dict, SERVICE_CONTEXT.db_service)


@https_fn.on_call(**FUNCTION_DEPLOYMENT_OPTIONS)
async def generate_demo_app_code_callable(request: https_fn.CallableRequest):
    ensure_authenticated(request)
    req = GenerateDemoCodeRequest(**(request.data or {}))
    from agent_factory.demo_factory import generate_demo_code

    try:
        code_response = await generate_demo_code(req)
        return code_response.model_dump()
    except Exception as exc:  # noqa: BLE001
        raise https_fn.HttpsError(code=https_fn.FunctionsErrorCode.INTERNAL, message=f"Error generating demo code: {exc}") from exc


@https_fn.on_call(**FUNCTION_DEPLOYMENT_OPTIONS)
async def create_demo_app_callable(request: https_fn.CallableRequest):
    ensure_authenticated(request)
    req = CreateDemoAppRequest(**(request.data or {}))
    db = SERVICE_CONTEXT.db_service
    demo_app = DemoApp(**req.model_dump(by_alias=True))
    saved_doc = db.save("demos", demo_app.id, demo_app.model_dump(by_alias=True, mode="json"))
    demo_app.rev = saved_doc.get("rev")
    return demo_app.model_dump()


@https_fn.on_call(**FUNCTION_DEPLOYMENT_OPTIONS)
async def list_demo_apps_callable(request: https_fn.CallableRequest):
    ensure_authenticated(request)
    return [DemoApp(**doc).model_dump() for doc in SERVICE_CONTEXT.db_service.list_all("demos")]


@https_fn.on_call(**FUNCTION_DEPLOYMENT_OPTIONS)
def get_demo_app_callable(request: https_fn.CallableRequest):
    ensure_authenticated(request)
    demo_id = (request.data or {}).get("demoId")
    doc = SERVICE_CONTEXT.db_service.get("demos", demo_id)
    return DemoApp(**doc).model_dump()


@https_fn.on_call(**FUNCTION_DEPLOYMENT_OPTIONS)
async def update_demo_app_callable(request: https_fn.CallableRequest):
    ensure_authenticated(request)
    data = request.data or {}
    demo_id = data.get("demoId")
    req = CreateDemoAppRequest(**data)
    db = SERVICE_CONTEXT.db_service
    updated_model = DemoApp(_id=demo_id, **req.model_dump(by_alias=True))
    saved_doc = db.save("demos", demo_id, updated_model.model_dump(by_alias=True, mode="json"))
    updated_model.rev = saved_doc.get("rev")
    return updated_model.model_dump()


@https_fn.on_call(**FUNCTION_DEPLOYMENT_OPTIONS)
def delete_demo_app_callable(request: https_fn.CallableRequest):
    ensure_authenticated(request)
    demo_id = (request.data or {}).get("demoId")
    SERVICE_CONTEXT.db_service.delete("demos", demo_id)
    return {"status": "deleted"}


# Apply router configuration hooks (for compatibility with existing extension points)
RESOLVED_ROUTERS = resolve_router_configs([RouterConfig(router=None)])
__all__ = [
    "read_root",
    "log_client_event",
    "get_providers_callable",
    "get_provider_config_callable",
    "get_provider_models_callable",
    "get_model_config_callable",
    "get_current_user_profile_callable",
    "list_all_users_callable",
    "update_user_allowances_callable",
    "set_monthly_allowance_callable",
    "set_allowance_reset_date_callable",
    "reset_allowance_callable",
    "update_spend_remaining_callable",
    "add_usage_entry_callable",
    "chat_callable",
    "get_chat_status_callable",
    "update_session_config_callable",
    "get_session_config_callable",
    "delete_session_callable",
    "health_check_callable",
    "create_agent_callable",
    "list_agents_callable",
    "get_agent_callable",
    "delete_agent_callable",
    "list_mcp_tools_callable",
    "generate_agent_code_callable",
    "fetch_spec_from_url_callable",
    "deploy_agent_route_callable",
    "undeploy_agent_route_callable",
    "get_agent_deployment_route_callable",
    "list_deployments_route_callable",
    "run_agent_code_callable",
    "run_deployed_agent_route_callable",
    "generate_demo_app_code_callable",
    "create_demo_app_callable",
    "list_demo_apps_callable",
    "get_demo_app_callable",
    "update_demo_app_callable",
    "delete_demo_app_callable",
]
