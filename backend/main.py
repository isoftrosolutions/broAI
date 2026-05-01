import asyncio
import sys

# Windows compatibility fix for subprocesses (Playwright)
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import json
import os
from pathlib import Path
from dotenv import load_dotenv
from groq import Groq
from agent import AgentLoop
from browser_bridge import BrowserBridge

# Load environment variables
load_dotenv()
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    raise ValueError("GROQ_API_KEY not found in .env file")

# Initialize Groq client
groq_client = Groq(api_key=GROQ_API_KEY)
browser_bridge = BrowserBridge()

app = FastAPI(title="AI Agent Workspace", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TaskRequest(BaseModel):
    task: str
    workspace_path: str | None = None
    bridge_url: str = "http://localhost:8001"
    max_steps: int = 20

@app.on_event("startup")
async def startup_event():
    try:
        await browser_bridge.start()
    except Exception as exc:
        print(f"Browser bridge startup skipped: {exc}")

@app.on_event("shutdown")
async def shutdown_event():
    await browser_bridge.shutdown()

@app.post("/task")
async def run_task(request: TaskRequest):
    """Start an agentic task and stream results via SSE."""
    agent = AgentLoop(groq_client, request.bridge_url, request.max_steps)

    async def generate_events():
        try:
            async for event in agent.run_task(request.task):
                yield f"data: {json.dumps(event)}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'content': str(e)})}\n\n"

    return StreamingResponse(
        generate_events(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )

@app.post("/action")
async def browser_action(payload: dict):
    action = payload.get("action")
    action_payload = payload.get("payload", {})
    if not action:
        raise HTTPException(status_code=400, detail="Missing action")
    return await browser_bridge.execute(action, action_payload)

@app.get("/snapshot")
async def browser_snapshot():
    return await browser_bridge.snapshot()

@app.get("/files")
async def list_files(path: str = "."):
    """List files and folders at a given path."""
    try:
        # Basic path validation - should be improved for security
        if ".." in path:
            raise HTTPException(status_code=400, detail="Path traversal not allowed")

        full_path = Path(path).resolve()
        if not full_path.exists():
            raise HTTPException(status_code=404, detail=f"Path {path} does not exist")
        if not full_path.is_dir():
            raise HTTPException(status_code=400, detail=f"Path {path} is not a directory")

        items = []
        for item in full_path.iterdir():
            try:
                stat = item.stat()
                items.append({
                    "name": item.name,
                    "type": "folder" if item.is_dir() else "file",
                    "size": stat.st_size if item.is_file() else None,
                    "modified": stat.st_mtime
                })
            except (OSError, PermissionError):
                continue

        # Sort: folders first, then files
        items.sort(key=lambda x: (x["type"] != "folder", x["name"].lower()))

        return {"items": items}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok", "browser_bridge": browser_bridge.page is not None}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
