import re
import time
import json
import asyncio
from functools import partial
from typing import AsyncGenerator, Dict, Any
from groq import Groq
from tools import AgentTools, TOOL_SCHEMAS


class AgentLoop:
    HIGH_RISK_KEYWORDS = ("delete", "remove", "purchase", "buy", "pay", "submit", "send", "confirm order")

    def __init__(self, groq_client: Groq, bridge_url: str, max_steps: int = 20):
        self.client = groq_client
        self.bridge_url = bridge_url
        self.tools = AgentTools(bridge_url)
        self.max_iterations = max(1, min(max_steps, 100))
        self.max_retries_per_action = 2

    async def run_task(self, task: str) -> AsyncGenerator[Dict[str, Any], None]:
        """Run the agentic loop for a given task."""
        messages = [
            {
                "role": "system",
                "content": f"""You are an autonomous Browser Automation Agent. You must execute tasks deterministically by calling tools.

Hard requirements:
- Use ONLY the provided tool-calling interface.
- 🚫 NEVER output text like '<function=...>' or 'Call tool...'. 
- 🚫 NEVER use XML tags, brackets, or pseudo-code to call tools.
- Output ONLY two things: 1. Your concise reasoning (thought), 2. The actual tool call via the API.
- Always begin with get_page_state before action planning.
- Never interact with the bridge_url directly ({self.bridge_url}).

Example of CORRECT behavior:
Thought: I need to see the current page content first.
[The model then triggers a native tool call to get_page_state]

Stop conditions:
- Task complete -> provide final result.
- Blocked by missing credentials, confirmation, unavailable element, or bridge error -> report blocked reason.
- Max steps reached ({self.max_iterations}) -> report blocked reason.

Runtime:
- bridge_url: {self.bridge_url}
"""
            },
            {
                "role": "user",
                "content": task
            }
        ]

        iteration = 0
        tool_failures: Dict[str, int] = {}
        while iteration < self.max_iterations:
            iteration += 1

            try:
                # Get response from Groq with retry logic
                max_api_retries = 3
                api_retry_count = 0
                response = None
                
                while api_retry_count < max_api_retries:
                    try:
                        response = self.client.chat.completions.create(
                            model="llama-3.3-70b-versatile",
                            messages=messages,
                            tools=TOOL_SCHEMAS,
                            tool_choice="auto",
                            max_tokens=1024
                        )
                        break # Success
                    except Exception as e:
                        # Safety Net: Catch 400 errors with failed_generation hallucinations
                        error_str = str(e)
                        if "400" in error_str and "failed_generation" in error_str:
                            # Try to extract <function=tool_name|null> or <function=tool_name{...}>
                            match = re.search(r"<function=(\w+)(?:\|null|\s*(\{.*?\}))?", error_str)
                            if match:
                                tool_name = match.group(1)
                                try:
                                    args_str = match.group(2)
                                    tool_args = json.loads(args_str) if args_str else {}
                                    # We found a hallucinated tool call, let's treat it as valid!
                                    yield {
                                        "type": "thought",
                                        "content": f"🛠️ Rescued tool call from hallucinated format: {tool_name}"
                                    }
                                    # Create a cleaned tool call object for history
                                    rescued_tool_call = {
                                        'id': f'call_{int(time.time())}',
                                        'type': 'function',
                                        'function': {
                                            'name': tool_name,
                                            'arguments': json.dumps(tool_args)
                                        }
                                    }
                                    
                                    # Create a dummy message object to satisfy the execution loop
                                    class DummyMessage:
                                        def __init__(self, tc):
                                            self.content = "I will proceed with the requested action."
                                            # Create object-like access for the execution loop
                                            self.tool_calls = [
                                                type('obj', (object,), {
                                                    'id': tc['id'],
                                                    'function': type('obj', (object,), tc['function'])
                                                })
                                            ]
                                    message = DummyMessage(rescued_tool_call)
                                    break # Success via rescue
                                except Exception:
                                    pass

                        if "rate_limit_reached" in error_str.lower() or "429" in error_str:
                            api_retry_count += 1
                            wait_time = api_retry_count * 5
                            yield {
                                "type": "thought",
                                "content": f"⚠️ Rate limit reached. Waiting {wait_time}s before retrying (Attempt {api_retry_count}/{max_api_retries})..."
                            }
                            time.sleep(wait_time)
                            continue
                        
                        # Log non-rate-limit errors to help debugging
                        yield {
                            "type": "thought",
                            "content": f"❌ API Error: {error_str[:100]}..."
                        }
                        raise e 
# Re-raise if not a rate limit error

                if not response:
                    raise Exception("Failed to get response from Groq after multiple retries.")

                message = response.choices[0].message

                # Add the assistant's message to conversation
                messages.append({
                    "role": "assistant",
                    "content": message.content,
                    "tool_calls": message.tool_calls
                })

                # Stream thought if present
                if message.content:
                    yield {
                        "type": "thought",
                        "content": message.content
                    }

                # Check if there are tool calls
                if not message.tool_calls:
                    # No more tools to call, we're done
                    yield {
                        "type": "done",
                        "content": message.content or "Task completed successfully"
                    }
                    break

                # Execute tool calls
                for tool_call in message.tool_calls:
                    tool_name = tool_call.function.name
                    try:
                        tool_args = json.loads(tool_call.function.arguments) or {}
                    except Exception:
                        tool_args = {}
                    if self._is_high_risk_action(tool_name, tool_args):
                        reason = f"Confirmation required before risky action: {tool_name} {tool_args}"
                        yield {
                            "type": "confirmation_required",
                            "content": reason
                        }
                        yield {
                            "type": "done",
                            "content": f"blocked: {reason}"
                        }
                        return

                    yield {
                        "type": "tool_call",
                        "content": f"Calling {tool_name} with args: {tool_args}"
                    }

                    try:
                        # Execute the tool
                        result = await self._execute_tool(tool_name, tool_args)
                        key = f"{tool_name}:{json.dumps(tool_args, sort_keys=True)}"
                        if isinstance(result, dict) and result.get("ok") is False:
                            tool_failures[key] = tool_failures.get(key, 0) + 1
                            if tool_failures[key] > self.max_retries_per_action:
                                blocked = (
                                    f"blocked: action failed repeatedly ({tool_name}) "
                                    f"after {self.max_retries_per_action + 1} attempts"
                                )
                                messages.append({
                                    "role": "tool",
                                    "content": blocked,
                                    "tool_call_id": tool_call.id
                                })
                                yield {"type": "error", "content": blocked}
                                yield {"type": "done", "content": blocked}
                                return

                        # Add tool result to messages
                        messages.append({
                            "role": "tool",
                            "content": str(result),
                            "tool_call_id": tool_call.id
                        })

                        yield {
                            "type": "tool_result",
                            "content": str(result)
                        }

                    except Exception as e:
                        error_msg = f"Error executing {tool_name}: {str(e)}"
                        messages.append({
                            "role": "tool",
                            "content": error_msg,
                            "tool_call_id": tool_call.id
                        })

                        yield {
                            "type": "error",
                            "content": error_msg
                        }

            except Exception as e:
                yield {
                    "type": "error",
                    "content": f"Agent loop error: {str(e)}"
                }
                break

        if iteration >= self.max_iterations:
            yield {
                "type": "done",
                "content": f"blocked: max_steps reached ({self.max_iterations})"
            }

    async def _execute_tool(self, tool_name: str, args: Dict[str, Any]) -> Any:
        """Execute a tool with given arguments."""
        method = getattr(self.tools, tool_name, None)
        if not method:
            raise ValueError(f"Unknown tool: {tool_name}")

        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, partial(method, **args))

    def _is_high_risk_action(self, tool_name: str, args: Dict[str, Any]) -> bool:
        if tool_name not in {"click", "type", "open_url"}:
            return False
        flattened = f"{tool_name} {json.dumps(args).lower()}"
        return any(keyword in flattened for keyword in self.HIGH_RISK_KEYWORDS)
