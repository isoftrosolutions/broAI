# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**broAI** is an autonomous browser agent workspace. A FastAPI backend drives a Playwright browser using Groq (LLaMA 3.3 70B) for inference, streaming every agent thought and action to the frontend via Server-Sent Events. There is also a Chrome extension (Manifest V3) that surfaces the same UI in a browser side panel.

## Commands

### Setup
```bash
# Install Python dependencies (run from project root)
pip install -r backend/requirements.txt
playwright install chromium

# Set API key
# Edit backend/.env and set: GROQ_API_KEY=your_key_here
```

### Run the backend
```bash
# Must be run from the project root (not from backend/)
python backend/main.py
```
The server starts at `http://localhost:8000`. The frontend is served at `/` and the extension UI at `/extension-ui`.

### Test the Groq API connection
```bash
cd backend && python test_api.py
```

### Load the Chrome extension
In Chrome, go to `chrome://extensions`, enable Developer Mode, click "Load unpacked", and select the `extension/` folder.

## Architecture

### Request flow

```
User (frontend or extension)
  → POST /task  →  AgentLoop (agent.py)
                     → Groq API (LLM inference with TOOL_SCHEMAS)
                     → AgentTools (tools.py, sync HTTP)
                         → POST /action  →  BrowserBridge (browser_bridge.py)
                                              → Playwright page
  ← SSE stream ← AgentLoop yields events (thought / tool_call / tool_result / done / error)
```

### Key modules

| File | Role |
|---|---|
| `backend/main.py` | FastAPI app: mounts static files, owns the `BrowserBridge` singleton, `/task` SSE endpoint, `/action` proxy, `/snapshot` |
| `backend/agent.py` | `AgentLoop` — async generator that drives the Groq reasoning loop, executes tools, enforces `max_steps`, blocks high-risk actions |
| `backend/browser_bridge.py` | `BrowserBridge` — async Playwright wrapper; first tries to connect to an existing Chrome on CDP port 9222, otherwise launches headless Chromium; serializes all page operations with an `asyncio.Lock` |
| `backend/tools.py` | `AgentTools` (sync httpx calls back to `/action`) + `TOOL_SCHEMAS` (Groq function-calling definitions) |
| `frontend/index.html` | Single-file Alpine.js + Tailwind CDN UI; no build step |
| `extension/` | Chrome Manifest V3 extension; `background.js` opens the side panel; `index.html` talks to `localhost:8000` |

### Important design details

- **Self-referential HTTP**: `AgentTools` in `tools.py` calls back to the same FastAPI server (`bridge_url`, default `http://localhost:8000/action`). The agent loop never touches Playwright directly; it always goes through the HTTP bridge.
- **Sync tools in async loop**: `AgentTools` methods are synchronous. `AgentLoop._execute_tool` runs them in a thread pool via `loop.run_in_executor` to avoid blocking the event loop.
- **High-risk guard**: `AgentLoop._is_high_risk_action` intercepts `click`, `type`, and `open_url` calls whose arguments contain keywords like `delete`, `purchase`, `buy`, etc., and emits a `confirmation_required` event before halting.
- **Hallucination rescue**: `agent.py` catches Groq 400 `failed_generation` errors, parses `<function=tool_name{...}>` from the error body, and continues execution rather than crashing.
- **Chrome CDP mode**: If Chrome is already running with `--remote-debugging-port=9222`, `BrowserBridge` attaches to that real browser session instead of launching a fresh Chromium. Override the Chrome executable path with `BROAI_CHROME_PATH` env var.
- **Static file serving**: `main.py` mounts `frontend/` at `/static` and `extension/` at `/ext-static`. The working directory when starting the server must be the project root.

### SSE event types

| Type | Meaning |
|---|---|
| `thought` | LLM reasoning text |
| `tool_call` | About to execute a browser tool |
| `tool_result` | Result returned from the browser |
| `confirmation_required` | High-risk action blocked, needs user approval |
| `done` | Task finished (or blocked at max steps) |
| `error` | Tool or agent loop error |

## Configuration

`backend/.env` — only required key:
```
GROQ_API_KEY=your_groq_key_here
```

The `.env` file is **not** in `.gitignore` — take care not to commit real keys.
