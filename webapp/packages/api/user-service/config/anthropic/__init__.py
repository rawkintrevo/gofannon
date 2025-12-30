# Anthropic Claude models configuration

models = {
    # === Claude 4 family (latest) ===
    "claude-sonnet-4-20250514": {
        "returns_thoughts": False,
        "parameters": {
            "temperature": {
                "type": "float",
                "default": 0.7,
                "min": 0.0,
                "max": 1.0,
                "description": "Controls randomness"
            },
            "max_tokens": {
                "type": "integer",
                "default": 4096,
                "min": 1,
                "max": 8192,
                "description": "Maximum tokens in response"
            },
            "top_p": {
                "type": "float",
                "default": 1.0,
                "min": 0.0,
                "max": 1.0,
                "description": "Nucleus sampling"
            },
        }
    },

    # === Claude 3.5 family ===
    "claude-3-5-sonnet-20241022": {
        "returns_thoughts": False,
        "parameters": {
            "temperature": {
                "type": "float",
                "default": 0.7,
                "min": 0.0,
                "max": 1.0,
                "description": "Controls randomness"
            },
            "max_tokens": {
                "type": "integer",
                "default": 4096,
                "min": 1,
                "max": 8192,
                "description": "Maximum tokens in response"
            },
            "top_p": {
                "type": "float",
                "default": 1.0,
                "min": 0.0,
                "max": 1.0,
                "description": "Nucleus sampling"
            },
        }
    },
    "claude-3-5-sonnet-20240620": {
        "returns_thoughts": False,
        "parameters": {
            "temperature": {
                "type": "float",
                "default": 0.7,
                "min": 0.0,
                "max": 1.0,
                "description": "Controls randomness"
            },
            "max_tokens": {
                "type": "integer",
                "default": 4096,
                "min": 1,
                "max": 8192,
                "description": "Maximum tokens in response"
            },
        }
    },
    "claude-3-5-haiku-20241022": {
        "returns_thoughts": False,
        "parameters": {
            "temperature": {
                "type": "float",
                "default": 0.7,
                "min": 0.0,
                "max": 1.0,
                "description": "Controls randomness"
            },
            "max_tokens": {
                "type": "integer",
                "default": 4096,
                "min": 1,
                "max": 8192,
                "description": "Maximum tokens in response"
            },
        }
    },

    # === Claude 3 family ===
    "claude-3-opus-20240229": {
        "returns_thoughts": False,
        "parameters": {
            "temperature": {
                "type": "float",
                "default": 0.7,
                "min": 0.0,
                "max": 1.0,
                "description": "Controls randomness"
            },
            "max_tokens": {
                "type": "integer",
                "default": 4096,
                "min": 1,
                "max": 4096,
                "description": "Maximum tokens in response"
            },
            "top_p": {
                "type": "float",
                "default": 1.0,
                "min": 0.0,
                "max": 1.0,
                "description": "Nucleus sampling"
            },
        }
    },
    "claude-3-sonnet-20240229": {
        "returns_thoughts": False,
        "parameters": {
            "temperature": {
                "type": "float",
                "default": 0.7,
                "min": 0.0,
                "max": 1.0,
                "description": "Controls randomness"
            },
            "max_tokens": {
                "type": "integer",
                "default": 4096,
                "min": 1,
                "max": 4096,
                "description": "Maximum tokens in response"
            },
        }
    },
    "claude-3-haiku-20240307": {
        "returns_thoughts": False,
        "parameters": {
            "temperature": {
                "type": "float",
                "default": 0.7,
                "min": 0.0,
                "max": 1.0,
                "description": "Controls randomness"
            },
            "max_tokens": {
                "type": "integer",
                "default": 4096,
                "min": 1,
                "max": 4096,
                "description": "Maximum tokens in response"
            },
        }
    },
}