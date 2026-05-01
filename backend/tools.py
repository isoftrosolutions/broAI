import time
from typing import Any, Dict, Optional

import httpx


class AgentTools:
    def __init__(self, bridge_url: str):
        self.bridge_url = bridge_url.rstrip("/")
        self.timeout_seconds = 20

    def _post_action(self, action: str, payload: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        body = {"action": action, "payload": payload or {}}
        try:
            with httpx.Client(timeout=self.timeout_seconds) as client:
                response = client.post(f"{self.bridge_url}/action", json=body)
                response.raise_for_status()
                return response.json()
        except Exception as exc:
            return {
                "ok": False,
                "error": str(exc),
                "action": action,
                "bridge_url": self.bridge_url,
            }

    def get_page_state(self) -> Dict[str, Any]:
        return self._post_action("get_page_state")

    def open_url(self, url: str) -> Dict[str, Any]:
        return self._post_action("open_url", {"url": url})

    def click(self, selector: str) -> Dict[str, Any]:
        return self._post_action("click", {"selector": selector})

    def type(self, selector: str, text: str) -> Dict[str, Any]:
        return self._post_action("type", {"selector": selector, "text": text})

    def scroll(self, direction: Optional[str] = None, pixels: Optional[int] = None) -> Dict[str, Any]:
        payload: Dict[str, Any] = {}
        if direction:
            payload["direction"] = direction
        if pixels is not None:
            payload["pixels"] = pixels
        return self._post_action("scroll", payload)

    def extract(self, selector: str) -> Dict[str, Any]:
        return self._post_action("extract", {"selector": selector})

    def wait(self, seconds: int) -> Dict[str, Any]:
        bounded = max(1, min(seconds, 30))
        time.sleep(bounded)
        return {"ok": True, "slept_seconds": bounded}

    def back(self) -> Dict[str, Any]:
        return self._post_action("back")

    def forward(self) -> Dict[str, Any]:
        return self._post_action("forward")


# Tool definitions for Groq function calling
TOOL_SCHEMAS = [
    {
        "type": "function",
        "function": {
            "name": "get_page_state",
            "description": "Get current browser page state including URL, title, and visible elements",
            "parameters": {
                "type": "object",
                "properties": {}
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "open_url",
            "description": "Navigate browser to a URL",
            "parameters": {
                "type": "object",
                "properties": {
                    "url": {"type": "string", "description": "Absolute URL to open"}
                },
                "required": ["url"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "click",
            "description": "Click a visible UI element",
            "parameters": {
                "type": "object",
                "properties": {
                    "selector": {"type": "string", "description": "Stable selector or text-based selector"}
                },
                "required": ["selector"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "type",
            "description": "Type text into a form field",
            "parameters": {
                "type": "object",
                "properties": {
                    "selector": {"type": "string", "description": "Input selector"},
                    "text": {"type": "string", "description": "Text to type"}
                },
                "required": ["selector", "text"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "scroll",
            "description": "Scroll page by direction or pixel amount",
            "parameters": {
                "type": "object",
                "properties": {
                    "direction": {
                        "type": "string",
                        "enum": ["up", "down"],
                        "description": "Scroll direction"
                    },
                    "pixels": {"type": "integer", "description": "Pixels to scroll"}
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "extract",
            "description": "Extract visible text/content from a selector",
            "parameters": {
                "type": "object",
                "properties": {
                    "selector": {"type": "string", "description": "Selector to extract from"}
                },
                "required": ["selector"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "wait",
            "description": "Wait to allow UI/network to settle",
            "parameters": {
                "type": "object",
                "properties": {
                    "seconds": {"type": "integer", "description": "Number of seconds to wait"}
                },
                "required": ["seconds"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "back",
            "description": "Go back in browser history",
            "parameters": {
                "type": "object",
                "properties": {}
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "forward",
            "description": "Go forward in browser history",
            "parameters": {
                "type": "object",
                "properties": {}
            }
        }
    }
]
