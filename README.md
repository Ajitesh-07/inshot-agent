# InShot AI Video Editor Agent

An AI-powered video editing agent that automates video creation in the InShot app on Android devices. Built with DroidRun for device automation and Google Gemini for intelligent editing decisions.

## ✨ Features

- **AI-Powered Editing Plans** - Describe your video and get an intelligent editing plan with effects, transitions, and animations
- **Music Integration** - Automatic music search, download, and AI-trimmed audio selection
- **Automated Execution** - Real-time execution on Android device via ADB
- **Live Progress Tracking** - WebSocket-based real-time updates and agent logs

## 🏗️ Architecture

```
inshot_agent/
├── backend/           # Python FastAPI server
│   ├── server.py      # Main API server with WebSocket support
│   ├── director.py    # AI Director using Gemini for planning
│   ├── agents_functions.py  # DroidRun agent execution
│   └── inshot_tools.py      # InShot-specific automation tools
│
└── inshot_agent_client/     # Next.js frontend
    ├── app/           # Pages and routing
    ├── components/    # React components
    └── lib/           # API utilities
```

## 🚀 Quick Start

### Prerequisites

- Python 3.12+
- Node.js 18+
- Android device with ADB enabled
- InShot app installed on device
- Google Gemini API key

### Backend Setup

```bash
cd backend

# Create virtual environment
uv venv
uv pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your GEMINI_API_KEY

# Start Phoenix tracing (optional)
python -m phoenix.server.main serve

# Start backend server
uv run python server.py
```

### Frontend Setup

```bash
cd inshot_agent_client

# Install dependencies
npm install

# Start development server
npm run dev
```

### Device Setup

1. Enable USB Debugging on your Android device
2. Connect via USB and authorize ADB
3. Verify connection: `adb devices`

## 🔧 Configuration

### Environment Variables

```env
GEMINI_API_KEY=your_api_key_here
REDIS_URL=redis://localhost:6379  # Optional
```

## 📡 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/plan` | POST | Start planning session with images and prompt |
| `/ws/{session_id}` | WS | Planning progress updates |
| `/execute` | POST | Start execution on device |
| `/ws/execute/{session_id}` | WS | Execution progress updates |
| `/device/status` | GET | Check device connection |

## 🎬 Workflow

1. **Upload Images** - Select images for your video
2. **Describe Edit** - Tell the AI what kind of video you want
3. **AI Planning** - Director creates editing plan with effects, transitions, music
4. **Preview & Approve** - Review the plan before execution
5. **Automated Editing** - Agent executes the plan on your device

## 🛠️ Tech Stack

- **Backend**: FastAPI, DroidRun, Google Gemini, yt-dlp
- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Tracing**: Phoenix (Arize)
- **Device**: ADB, scrcpy

## 📝 License

MIT License
