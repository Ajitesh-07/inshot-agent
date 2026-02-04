# DroidRun Studio - Backend

FastAPI backend server for the DroidRun Studio AI Video Editor.

## Setup

1. **Install dependencies:**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env and add your GOOGLE_API_KEY
   ```

3. **Run the server:**
   ```bash
   python server.py
   ```
   
   Or with uvicorn:
   ```bash
   uvicorn server:app --host 0.0.0.0 --port 5000 --reload
   ```

## API Endpoints

### POST `/plan`
Start a new planning session.

**Request:** `multipart/form-data`
- `prompt`: string - Edit description
- `image_0` to `image_9`: files - Up to 10 images

**Response:**
```json
{
  "session_id": "uuid",
  "websocket_url": "ws://localhost:5000/ws/{session_id}",
  "num_images": 5
}
```

### WebSocket `/ws/{session_id}`
Real-time planning progress updates.

**Message Types:**
| Type | Data | Description |
|------|------|-------------|
| `planning_started` | - | Pipeline started |
| `visual_plan` | VisualPlan JSON | Visual plan generated |
| `music_plan` | MusicPlan JSON | Music candidates found |
| `download_progress` | `{progress: 0-100}` | Track download progress |
| `full_plan` | FinalPlan JSON | Final music selection |
| `planning_complete` | All results | Pipeline finished |
| `error` | `{message: string}` | Error occurred |

### GET `/health`
Health check endpoint.

## Requirements
- Python 3.10+
- FFmpeg (for audio extraction)
- Google API Key with Gemini access
