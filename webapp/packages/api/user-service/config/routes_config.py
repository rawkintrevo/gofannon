import importlib
import os
from dataclasses import dataclass
from typing import List, Optional

from fastapi import APIRouter


@dataclass
class RouterConfig:
    router: APIRouter
    prefix: str = ""
    tags: Optional[List[str]] = None


def _import_router(router_ref: str) -> APIRouter:
    if ':' not in router_ref:
        raise ValueError(
            f"Router reference '{router_ref}' must be in the form 'module:attribute' to be imported."
        )

    module_path, attr = router_ref.split(':', 1)
    module = importlib.import_module(module_path)
    router = getattr(module, attr)
    if not isinstance(router, APIRouter):
        raise ValueError(
            f"Attribute '{attr}' loaded from '{module_path}' is not an APIRouter instance."
        )
    return router


def resolve_router_configs(default_configs: List[RouterConfig]) -> List[RouterConfig]:
    override_module = os.getenv('APP_ROUTER_CONFIG')

    if not override_module:
        return list(default_configs)

    module = importlib.import_module(override_module)
    config_entries = getattr(module, 'ROUTER_CONFIGS', None)
    mode = getattr(module, 'ROUTER_CONFIG_MODE', 'append')

    if not config_entries:
        return list(default_configs)

    loaded_configs: List[RouterConfig] = []
    for entry in config_entries:
        if isinstance(entry, RouterConfig):
            loaded_configs.append(entry)
            continue

        if isinstance(entry, dict):
            router_value = entry.get('router')
            router_instance = _import_router(router_value) if isinstance(router_value, str) else router_value
            loaded_configs.append(
                RouterConfig(
                    router=router_instance,
                    prefix=entry.get('prefix', ''),
                    tags=entry.get('tags'),
                )
            )

    if mode == 'replace':
        return loaded_configs

    return [*default_configs, *loaded_configs]
