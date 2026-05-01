<p align="center">
  <img src="https://img.shields.io/badge/React-18.2-61DAFB?style=for-the-badge&logo=react&logoColor=white" alt="React" />
  <img src="https://img.shields.io/badge/Vite-5.0-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/FastAPI-0.100+-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/Groq-LLaMA_3.3_70B-F55036?style=for-the-badge&logo=meta&logoColor=white" alt="Groq" />
  <img src="https://img.shields.io/badge/TailwindCSS-3.4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind" />
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge" alt="License" />
</p>

# 🤖 Browser Coworker — AI Browser Automation Agent

> **Describe what you need. Watch the AI do it in your browser — live.**

Browser Coworker is a full-stack AI agent that converts natural-language instructions into real browser actions. It connects to any Chromium-based browser through a lightweight bridge API, plans multi-step workflows autonomously, and streams every thought and action back to you in real time via Server-Sent Events.

---

## ✨ Key Features

| Feature | Description |
|---|---|
| 🧠 **Natural Language Tasks** | Describe what you want in plain English — the agent plans and executes autonomously |
| 🔧 **9 Browser Tools** | `get_page_state` · `open_url` · `click` · `type` · `scroll` · `extract` · `wait` · `back` · `forward` |
| 🛡️ **Built-in Safety Gates** | Auto-pauses before risky actions (purchases, deletions, form submissions) and asks for confirmation |
| 📡 **Real-Time Streaming** | Watch the agent think, act, and return results live via SSE — no polling |
| 🔄 **Smart Retry & Limits** | Per-action retry caps, max-step hard limits, and blocked-state detection prevent runaway loops |
| 📁 **Workspace File Explorer** | Browse your local project files through a familiar tree-view panel |
| 🎨 **Warm Minimal UI** | Organic, paper-toned interface with monospace code accents and smooth micro-interactions |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND (React + Vite)                │
│  ┌──────────────┐  ┌────────────────────────────────────┐   │
│  │ FileExplorer  │  │          AgentChat                 │   │
│  │  - path nav   │  │  - task input & config             │   │
│  │  - file list  │  │  - SSE stream reader               │   │
│  │  - file icons │  │  ┌────────────────────────────┐    │   │
│  │              │  │  │        TaskLog              │    │   │
│  │              │  │  │  - step bubbles (Plan,      │    │   │
│  │              │  │  │    Action, Result, Error)    │    │   │
│  │              │  │  │  - auto-scroll              │    │   │
│  └──────────────┘  │  └────────────────────────────┘    │   │
│                     └────────────────────────────────────┘   │
└────────────────────────────┬────────────────────────────────┘
                             │ POST /task (SSE)
                             │ GET  /files
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                  BACKEND (Python + FastAPI)                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                    AgentLoop                          │   │
│  │  - Conversational loop with Groq LLM                  │   │
│  │  - Tool dispatch & result injection                   │   │
│  │  - Risk gating (high-risk keyword detection)          │   │
│  │  - Retry tracking & max-step enforcement              │   │
│  └───────────────────────┬──────────────────────────────┘   │
│                          │ HTTP POST /action                 │
│                          ▼                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                  AgentTools                           │   │
│  │  9 tools → Browser Bridge API (Chrome DevTools)       │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                             │
                             ▼
                   ┌───────────────────┐
                   │  Browser Bridge   │
                   │  (localhost:9222)  │
                   │  Chrome DevTools  │
                   └───────────────────┘
```

---

## 📂 Project Structure

```
project/
├── backend/
│   ├── main.py              # FastAPI app — endpoints, CORS, SSE streaming
│   ├── agent.py             # AgentLoop — LLM conversation loop & tool dispatch
│   ├── tools.py             # AgentTools — 9 browser actions + Groq tool schemas
│   ├── requirements.txt     # Python dependencies
│   └── .env                 # GROQ_API_KEY (user-supplied)
│
├── frontend/
│   ├── index.html           # Entry HTML
│   ├── vite.config.js       # Vite dev server config
│   ├── tailwind.config.js   # Tailwind CSS config
│   ├── package.json         # Node dependencies & scripts
│   └── src/
│       ├── main.jsx         # React root mount
│       ├── App.jsx          # Two-panel layout (FileExplorer + AgentChat)
│       ├── index.css        # Global styles, CSS variables, scrollbar theming
│       └── components/
│           ├── AgentChat.jsx    # Task input, SSE reader, status display
│           ├── TaskLog.jsx      # Step-by-step bubble log with auto-scroll
│           └── FileExplorer.jsx # Workspace path input & file listing
│
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

| Tool | Version | Purpose |
|---|---|---|
| **Python** | 3.10+ | Backend runtime |
| **Node.js** | 18+ | Frontend tooling |
| **npm** | 9+ | Package management |
| **Groq API Key** | — | LLM inference ([console.groq.com](https://console.groq.com)) |
| **Browser Bridge** | — | Chromium with DevTools Protocol exposed on port `9222` |

### 1 · Clone the Repository

```bash
git clone https://github.com/your-username/browser-coworker.git
cd browser-coworker
```

### 2 · Backend Setup

```bash
# Navigate to backend
cd backend

# Create and activate a virtual environment (recommended)
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS / Linux

# Install dependencies
pip install -r requirements.txt
```

Create a `.env` file (or edit the existing one) in the `backend/` directory:

```env
GROQ_API_KEY=gsk_your_actual_api_key_here
```

### 3 · Frontend Setup

```bash
# Navigate to frontend (from project root)
cd frontend

# Install Node dependencies
npm install
```

### 4 · Start the Browser Bridge

Launch Chrome (or any Chromium browser) with the remote debugging port:

```bash
# Windows
"C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222

# macOS
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222

# Linux
google-chrome --remote-debugging-port=9222
```

### 5 · Run the Application

Open **two terminals**:

```bash
# Terminal 1 — Backend (runs on http://localhost:8000)
cd backend
uvicorn main:app --reload

# Terminal 2 — Frontend (runs on http://localhost:5173)
cd frontend
npm run dev
```

Open **http://localhost:5173** in your browser and start giving tasks!

---

## 💡 Usage

1. **Set your workspace** — Enter a directory path in the left-panel file explorer to browse local files
2. **Configure the agent** — Adjust the Bridge URL and Max Steps if needed (defaults: `http://localhost:9222`, `20`)
3. **Describe a task** — Type a natural-language instruction in the text area
4. **Click "Run Task"** — Watch the agent think, call tools, and stream results in real time
5. **Review the log** — Each step is color-coded: **Plan** (thinking), **Action** (tool call), **Result** (output), **Error**, or **Needs Confirmation**

---

## 📋 Example Tasks

```
"Open https://example.com and extract the main heading text"
```

```
"Navigate to a travel booking site, search for flights from NYC to London
 on June 15, and extract the top 3 cheapest options"
```

```
"Go to the contact page, fill in the name field with 'John Doe'
 and the email field with 'john@example.com', then stop before submitting"
```

```
"Open the pricing page and summarize the differences between plans"
```

---

## 🛡️ Safety & Guardrails

The agent is designed to be **safe by default**:

| Guardrail | Behavior |
|---|---|
| **Risk Confirmation Gate** | Actions involving keywords like `delete`, `purchase`, `buy`, `submit`, `send` are paused — the agent reports the action and waits for explicit confirmation |
| **Retry Cap** | If the same tool call fails more than **2 consecutive times**, the agent stops and reports the failure |
| **Max Step Limit** | A hard ceiling (default: 20, max: 100) prevents infinite loops |
| **Blocked State Detection** | The agent self-terminates when it detects missing credentials, unavailable elements, or bridge errors |
| **Path Traversal Protection** | The `/files` endpoint rejects `..` in path queries |
| **No Auth/CAPTCHA Bypass** | The system prompt explicitly forbids attempting authentication or CAPTCHA circumvention |

---

## 🔌 API Reference

### `POST /task`

Start an agent task. Returns an **SSE stream** of events.

**Request Body:**

```json
{
  "task": "Open example.com and extract the page title",
  "bridge_url": "http://localhost:9222",
  "max_steps": 20
}
```

**SSE Event Types:**

| Type | Description |
|---|---|
| `thought` | Agent's reasoning / plan for the next step |
| `tool_call` | Tool being invoked with arguments |
| `tool_result` | Output returned by the tool |
| `confirmation_required` | Agent paused — risky action needs user approval |
| `done` | Task completed or blocked |
| `error` | An error occurred during execution |

---

### `GET /files?path=<directory>`

List files and folders at the given path. Returns items sorted folders-first.

**Response:**

```json
{
  "items": [
    { "name": "src", "type": "folder", "size": null, "modified": 1714500000 },
    { "name": "index.html", "type": "file", "size": 366, "modified": 1714500000 }
  ]
}
```

---

### `GET /health`

Health check. Returns `{ "status": "ok" }`.

---

## 🧰 Available Browser Tools

| Tool | Description | Parameters |
|---|---|---|
| `get_page_state` | Get current URL, title, and visible elements | *none* |
| `open_url` | Navigate to a URL | `url` (string) |
| `click` | Click a visible element | `selector` (string) |
| `type` | Type text into a form field | `selector` (string), `text` (string) |
| `scroll` | Scroll the page | `direction` (up/down), `pixels` (int) |
| `extract` | Extract visible text from a selector | `selector` (string) |
| `wait` | Pause execution (1–30 seconds) | `seconds` (int) |
| `back` | Navigate back in history | *none* |
| `forward` | Navigate forward in history | *none* |

---

## 🧪 Tech Stack

| Layer | Technology | Role |
|---|---|---|
| **Frontend** | React 18 + Vite 5 | Component UI & dev server |
| **Styling** | TailwindCSS 3.4 | Utility-first CSS |
| **Backend** | Python + FastAPI | REST API & SSE streaming |
| **LLM** | Groq (LLaMA 3.3 70B Versatile) | Agent reasoning & tool selection |
| **HTTP Client** | httpx | Browser bridge communication |
| **Streaming** | Server-Sent Events (SSE) | Real-time frontend updates |

---

## 🤝 Contributing

Contributions are welcome! Here's how to get started:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m "Add amazing feature"`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

Please ensure your code follows the existing patterns and includes appropriate error handling.

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  <sub>Built with ☕ and curiosity — Browser Coworker</sub>
</p>
#   b r o A I  
 