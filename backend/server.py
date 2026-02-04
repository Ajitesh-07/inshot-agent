"""
DroidRun Studio - FastAPI Backend Server
Wraps VideoDirector with REST API + WebSocket for real-time progress updates
"""

from fastapi import FastAPI, UploadFile, File, Form, WebSocket, WebSocketDisconnect, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import time
import asyncio
import subprocess
import uuid
import os
import json
import shutil
from typing import List, Optional
from contextlib import asynccontextmanager

# Import VideoDirector (assuming it's in same directory or adjust path)
from director import VideoDirector

# Import agent functions for execution
from agents_functions import (
    check_device_connection,
    process_files,
    select_images,
    edit_image,
    REMOTE_ALBUM_PATH
)

# Store active sessions
sessions: dict = {}

# Gemini 2.5 Pro Pricing (Paid Tier, per 1M tokens in USD)
# For prompts <= 200k tokens
GEMINI_PRICING = {
    "input_per_million": 1.25,    # $1.25 per 1M input tokens
    "output_per_million": 10.00,  # $10.00 per 1M output tokens (including thinking)
}

def calculate_pricing(usage_list: list) -> dict:
    """Calculate estimated cost from usage data"""
    total_input = 0
    total_output = 0
    total_thinking = 0
    total_cached = 0
    
    for usage in usage_list:
        if usage:
            total_input += usage.get("prompt_tokens", 0)
            # Output includes both candidates and thinking tokens
            total_output += usage.get("candidates_tokens", 0)
            total_thinking += usage.get("thinking_tokens", 0)
            total_cached += usage.get("cached_tokens", 0)
    
    # All output (candidates + thinking) charged at output rate
    total_output_all = total_output + total_thinking
    
    input_cost = (total_input / 1_000_000) * GEMINI_PRICING["input_per_million"]
    output_cost = (total_output_all / 1_000_000) * GEMINI_PRICING["output_per_million"]
    
    return {
        "total_input_tokens": total_input,
        "total_output_tokens": total_output,
        "total_thinking_tokens": total_thinking,
        "total_cached_tokens": total_cached,
        "total_tokens": total_input + total_output_all,
        "input_cost_usd": round(input_cost, 6),
        "output_cost_usd": round(output_cost, 6),
        "total_cost_usd": round(input_cost + output_cost, 6),
    }

# Audio utilities
def get_audio_duration(file_path: str) -> Optional[float]:
    """Get audio duration in seconds using ffprobe"""
    try:
        result = subprocess.run(
            [
                'ffprobe', '-v', 'error',
                '-show_entries', 'format=duration',
                '-of', 'default=noprint_wrappers=1:nokey=1',
                file_path
            ],
            capture_output=True,
            text=True
        )
        return float(result.stdout.strip())
    except Exception as e:
        print(f"Failed to get duration for {file_path}: {e}")
        return None


def trim_audio(input_path: str, output_path: str, start_seconds: float, end_seconds: float) -> bool:
    """Trim audio file using ffmpeg"""
    try:
        duration = end_seconds - start_seconds
        subprocess.run(
            [
                'ffmpeg', '-y',
                '-i', input_path,
                '-ss', str(start_seconds),
                '-t', str(duration),
                '-c:a', 'libmp3lame',
                '-q:a', '2',
                output_path
            ],
            capture_output=True,
            check=True
        )
        return True
    except Exception as e:
        print(f"Failed to trim audio: {e}")
        return False


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create temp directories
    os.makedirs("temp_uploads", exist_ok=True)
    os.makedirs("downloads", exist_ok=True)
    os.makedirs("trimmed_audio", exist_ok=True)
    yield
    # Shutdown: temp_uploads preserved for editing phase
    # Files are cleaned up manually or via session cleanup

app = FastAPI(
    title="DroidRun Studio API",
    description="AI Video Editing Backend",
    version="1.0.0",
    lifespan=lifespan
)

# Mount static files for serving trimmed audio
app.mount("/audio", StaticFiles(directory="trimmed_audio"), name="audio")

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class PlanningSession:
    """Manages a single planning session with WebSocket updates"""
    
    def __init__(self, session_id: str, image_paths: List[str], prompt: str):
        self.session_id = session_id
        self.image_paths = image_paths
        self.prompt = prompt
        self.websocket: WebSocket = None
        self.director: VideoDirector = None
        self.downloads_dir = os.path.join("downloads", session_id)  # Session-specific
        self.results = {
            "visual_plan": None,
            "music_plan": None,
            "full_plan": None
        }
    
    async def send_message(self, msg_type: str, data=None, progress=None, message=None):
        """Send WebSocket message to client"""
        if self.websocket:
            payload = {"type": msg_type}
            if data is not None:
                payload["data"] = data
            if progress is not None:
                payload["progress"] = progress
            if message is not None:
                payload["message"] = message
            try:
                await self.websocket.send_json(payload)
            except Exception as e:
                print(f"Failed to send WS message: {e}")
    
    async def run_planning(self):
        """Execute the full planning pipeline with progress updates"""
        try:
            # Initialize director
            await self.send_message("planning_started", message="Initializing AI Director...")
            self.director = VideoDirector(self.image_paths)
            
            # Step 1: Generate Visual Plan
            await self.send_message("visual_plan_started", message="Generating visual editing plan...")
            
            # Run in executor to not block event loop
            loop = asyncio.get_running_loop()
            visual_plan = await loop.run_in_executor(
                None, 
                self.director.generate_initial_plan, 
                self.prompt
            )
            
            if visual_plan:
                self.results["visual_plan"] = visual_plan
                await self.send_message("visual_plan", data=visual_plan)
            else:
                await self.send_message("error", message="Failed to generate visual plan")
                return
            
            # Step 2: Generate Music Plan
            await self.send_message("music_plan_started", message="Finding music tracks...")
            
            music_plan = await loop.run_in_executor(
                None,
                self.director.generate_music_content,
                self.prompt,
                visual_plan
            )
            
            if music_plan:
                self.results["music_plan"] = music_plan
                await self.send_message("music_plan", data=music_plan)
            else:
                await self.send_message("error", message="Failed to generate music plan")
                return
            
            # Step 3: Download Music Tracks
            await self.send_message("downloading_music", progress=0, message="Starting downloads...")
            
            # Create session-specific downloads folder
            if os.path.exists(self.downloads_dir):
                shutil.rmtree(self.downloads_dir)
            os.makedirs(self.downloads_dir, exist_ok=True)
            
            # Check if there are tracks to download
            if not music_plan.get("tracks") or len(music_plan["tracks"]) == 0:
                await self.send_message("error", message="No music tracks found")
                return
            
            total_tracks = len(music_plan["tracks"])
            track_durations = {}  # Store durations for each track
            
            for i, track in enumerate(music_plan["tracks"]):
                progress = int((i / total_tracks) * 100)
                await self.send_message(
                    "download_progress", 
                    progress=progress, 
                    message=f"Downloading: {track['track_name']} by {track['artist_name']}"
                )
                
                # Download in executor with session-specific folder
                try:
                    await loop.run_in_executor(
                        None,
                        VideoDirector.download_audio,
                        i + 1,
                        track["track_name"],
                        track["artist_name"],
                        self.downloads_dir
                    )
                    
                    # Get duration of downloaded track
                    audio_path = os.path.join(self.downloads_dir, f"audio_{i+1}.mp3")
                    if os.path.exists(audio_path):
                        duration = await loop.run_in_executor(None, get_audio_duration, audio_path)
                        track_durations[f"audio_{i+1}.mp3"] = duration
                        
                except Exception as e:
                    print(f"Download failed for track {i+1}: {e}")
                    # Continue with remaining tracks
            
            await self.send_message("download_progress", progress=100, message="Downloads complete!")
            
            # Send track durations to frontend
            if track_durations:
                await self.send_message("track_durations", data=track_durations)
            
            # Step 4: Generate Final Plan with Music Infusion
            await self.send_message("final_plan_started", message="Analyzing tracks and syncing...")
            
            audio_files = os.listdir(self.downloads_dir) if os.path.exists(self.downloads_dir) else []
            audio_paths = [os.path.join(self.downloads_dir, f) for f in audio_files if f.endswith('.mp3')]
            
            if not audio_paths:
                await self.send_message("error", message="No audio files downloaded")
                return
            
            full_plan = await loop.run_in_executor(
                None,
                self.director.decide_music_infusion,
                visual_plan,
                audio_paths,
                visual_plan.get("music_thoughts", "")
            )
            
            if full_plan:
                self.results["full_plan"] = full_plan
                
                # Step 5: Trim the selected audio file
                await self.send_message("trimming_audio", message="Trimming audio to sync with video...")
                
                selected_track = full_plan.get("selected_track_filename", "")
                start_time = full_plan.get("start_time_seconds", 0)
                end_time = full_plan.get("end_time_seconds", 30)

                print("Selected track:", selected_track)
                
                # Find the selected audio file
                selected_audio_path = None
                for audio_path in audio_paths:
                    if selected_track in audio_path or os.path.basename(audio_path) == selected_track:
                        selected_audio_path = audio_path
                        break
                
                print("Selected audio path:", selected_audio_path)
                
                # If not found by name, just use the first track
                if not selected_audio_path and audio_paths:
                    selected_audio_path = audio_paths[0]

                print("Selected audio path:", selected_audio_path)
                
                trimmed_audio_url = None
                if selected_audio_path:
                    # Create output directory for trimmed audio
                    os.makedirs("trimmed_audio", exist_ok=True)
                    trimmed_filename = f"{self.session_id}_trimmed.mp3"
                    trimmed_path = os.path.join("trimmed_audio", trimmed_filename)
                    
                    # Trim the audio
                    success = await loop.run_in_executor(
                        None,
                        trim_audio,
                        selected_audio_path,
                        trimmed_path,
                        start_time,
                        end_time
                    )
                    
                    if success and os.path.exists(trimmed_path):
                        trimmed_audio_url = f"http://localhost:5000/audio/{trimmed_filename}"
                        # Get trimmed duration
                        trimmed_duration = await loop.run_in_executor(None, get_audio_duration, trimmed_path)
                        full_plan["trimmed_audio_url"] = trimmed_audio_url
                        full_plan["trimmed_duration_seconds"] = trimmed_duration
                
                await self.send_message("full_plan", data=full_plan)
            else:
                await self.send_message("error", message="Failed to generate final plan")
                return
            
            # Done!
            # Collect usage data from each step
            usage_breakdown = {
                "visual_plan": self.results["visual_plan"].get("_usage") if self.results["visual_plan"] else None,
                "music_plan": self.results["music_plan"].get("_usage") if self.results["music_plan"] else None,
                "final_plan": self.results["full_plan"].get("_usage") if self.results["full_plan"] else None,
            }
            
            # Calculate aggregate pricing
            usage_list = [v for v in usage_breakdown.values() if v]
            pricing = calculate_pricing(usage_list)
            
            await self.send_message("planning_complete", data={
                "visual_plan": self.results["visual_plan"],
                "music_plan": self.results["music_plan"],  
                "full_plan": self.results["full_plan"],
                "track_durations": track_durations,
                "usage_breakdown": usage_breakdown,
                "pricing": pricing,
            })
            
        except Exception as e:
            print(f"Planning error: {e}")
            await self.send_message("error", message=str(e))


@app.post("/plan")
async def start_planning(request: Request):

    """
    Start a new planning session.
    Accepts any number of images (image_0, image_1, ...) and prompt.
    Returns WebSocket URL for progress updates.
    """
    form = await request.form()
    
    # Get prompt
    prompt = form.get("prompt")
    if not prompt:
        return {"error": "No prompt provided"}
    
    # Collect all uploaded images dynamically
    uploaded_images = []
    i = 0
    while True:
        image = form.get(f"image_{i}")
        if image is None:
            break
        uploaded_images.append(image)
        i += 1
    
    if not uploaded_images:
        return {"error": "No images provided"}
    
    # Create session
    session_id = str(uuid.uuid4())
    session_dir = os.path.join("temp_uploads", session_id)
    os.makedirs(session_dir, exist_ok=True)
    
    # Save images to disk
    image_paths = []
    for i, img in enumerate(uploaded_images):
        ext = os.path.splitext(img.filename)[1] or ".jpg"
        file_path = os.path.join(session_dir, f"image_{i}{ext}")
        
        with open(file_path, "wb") as f:
            content = await img.read()
            f.write(content)
        
        image_paths.append(file_path)
    
    # Create session
    session = PlanningSession(session_id, image_paths, prompt)
    sessions[session_id] = session
    
    return {
        "session_id": session_id,
        "websocket_url": f"ws://localhost:5000/ws/{session_id}",
        "num_images": len(image_paths)
    }


@app.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    """WebSocket endpoint for real-time planning updates"""
    await websocket.accept()
    
    session = sessions.get(session_id)
    if not session:
        await websocket.send_json({"type": "error", "message": "Session not found"})
        await websocket.close()
        return
    
    session.websocket = websocket
    
    try:
        # Start planning in background
        planning_task = asyncio.create_task(session.run_planning())
        
        # Keep connection alive and handle any incoming messages
        while True:
            try:
                # Wait for messages or planning completion
                data = await asyncio.wait_for(websocket.receive_text(), timeout=1.0)
                # Handle any client messages if needed
                msg = json.loads(data)
                if msg.get("type") == "cancel":
                    planning_task.cancel()
                    break
            except asyncio.TimeoutError:
                # Check if planning is done
                if planning_task.done():
                    break
                continue
                
    except WebSocketDisconnect:
        print(f"Client disconnected: {session_id}")
    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        # NOTE: Do NOT cleanup session or temp files here!
        # They are needed for the execution phase.
        # Cleanup happens after execution completes or via manual cleanup.
        pass

execution_sessions: dict = {}

class ExecutionSession:
    """Manages execution of editing plan on connected Android device"""
    
    def __init__(self, session_id: str, image_paths: List[str], visual_plan: dict, 
                 audio_path: Optional[str] = None, audio_track_name: Optional[str] = None):
        self.session_id = session_id
        self.image_paths = image_paths
        self.visual_plan = visual_plan
        self.audio_path = audio_path
        self.audio_track_name = audio_track_name or "audio_1"
        self.websocket: WebSocket = None
        self.is_running = False  # Lock to prevent duplicate executions
    
    async def send_message(self, msg_type: str, data=None, progress=None, message=None):
        """Send WebSocket message to client"""
        if self.websocket:
            payload = {"type": msg_type}
            if data is not None:
                payload["data"] = data
            if progress is not None:
                payload["progress"] = progress
            if message is not None:
                payload["message"] = message
            try:
                await self.websocket.send_json(payload)
            except Exception as e:
                print(f"Failed to send WS message: {e}")
    
    async def run_execution(self):
        """Execute the full editing pipeline on connected device"""
        try:
            # Step 1: Check device connection
            await self.send_message("execution_started", message="Checking device connection...")
            
            connected, device_msg = check_device_connection()
            if not connected:
                await self.send_message("error", message=f"Device not connected: {device_msg}")
                return
            
            await self.send_message("device_connected", message=device_msg)
            
            # Step 2: Upload images to phone
            await self.send_message("uploading_images", progress=0, message="Uploading images to phone...")
            
            loop = asyncio.get_running_loop()
            
            # Create a callback for progress updates
            upload_progress = {"current": 0}
            async def update_upload_progress(msg, prog, is_error=False, is_success=False, current_image=None):
                if is_error:
                    await self.send_message("error", message=msg)
                else:
                    upload_progress["current"] = prog
                    await self.send_message("uploading_images", progress=prog, message=msg)
            
            # Run process_files in executor (it's synchronous)
            def sync_process_files():
                def status_callback(msg, prog, is_error=False, is_success=False, current_image=None):
                    print(f"Upload: {msg} ({prog}%)")
                process_files(self.image_paths, status_callback)
            
            await loop.run_in_executor(None, sync_process_files)
            await self.send_message("uploading_images", progress=100, message="Images uploaded!")
            
            # Step 3: Upload audio to phone (if available)
            if self.audio_path and os.path.exists(self.audio_path):
                await self.send_message("uploading_audio", progress=0, message="Uploading audio to phone...")
                
                success = await loop.run_in_executor(
                    None,
                    VideoDirector.send_audio_to_phone,
                    self.audio_path
                )
                
                if success:
                    await self.send_message("uploading_audio", progress=100, message="Audio uploaded!")
                else:
                    await self.send_message("warning", message="Audio upload failed, continuing without music...")
            
            # Step 4: Select images in InShot
            await self.send_message("selecting_images", message="Opening InShot and selecting images...")
            await self.send_message("agent_log", message="🚀 Starting DroidRun agent for image selection")
            
            try:
                # Run agents_functions.py with 'select' mode via subprocess
                # Set PYTHONIOENCODING=utf-8 to support emoji output on Windows
                env = os.environ.copy()
                env["PYTHONIOENCODING"] = "utf-8"
                
                process = await asyncio.create_subprocess_exec(
                    "uv", "run", "python", "agents_functions.py", "select",
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.STDOUT,
                    cwd=os.path.dirname(os.path.abspath(__file__)),
                    env=env
                )
                
                # Stream output to frontend
                while True:
                    line = await process.stdout.readline()
                    if not line:
                        break
                    decoded_line = line.decode().strip()
                    if decoded_line:
                        print(decoded_line)
                        await self.send_message("agent_log", message=decoded_line)
                
                await process.wait()
                
                if process.returncode == 0:
                    await self.send_message("agent_log", message="✅ Images selected successfully in InShot")
                    await self.send_message("selecting_images_complete", message="Images selected in InShot!")
                else:
                    await self.send_message("error", message=f"Failed to select images (exit code: {process.returncode})")
                    return
                    
            except Exception as e:
                await self.send_message("error", message=f"Error selecting images: {str(e)}")
                return
            
            # Step 5: Execute editing plan
            plan_steps = self.visual_plan.get("plan", [])
            await self.send_message("executing_plan", progress=0, message=f"Executing editing plan ({len(plan_steps)} steps)...")
            await self.send_message("agent_log", message=f"📋 Plan has {len(plan_steps)} editing steps")
            
            num_images = len(self.image_paths)
            
            # Add background music instruction to the plan if we have audio
            plan_with_music = self.visual_plan.copy()
            if self.audio_path:
                # Extract just the filename from audio_path (e.g., "xxx_trimmed.mp3")
                audio_filename = os.path.basename(self.audio_path)
                # Remove .mp3 extension for InShot search
                track_name = audio_filename.replace('.mp3', '')
                
                await self.send_message("agent_log", message=f"🎵 Adding background music: {track_name}")
                
                # Append music step to the plan
                plan_with_music["plan"].append({
                    "tool": "add_background_music",
                    "args": {"track_name": track_name}
                })
            
            # Log each step in the plan
            for i, step in enumerate(plan_with_music.get("plan", [])):
                tool_name = step.get("tool", "unknown")
                args = step.get("args", {})
                await self.send_message("agent_log", message=f"  {i+1}. {tool_name}: {args}")
            
            await self.send_message("agent_log", message="🤖 Starting DroidRun agent for editing...")
            
            # Save plan to file for subprocess
            plan_data = {
                "num_images": num_images,
                "plan": plan_with_music.get("plan", [])
            }
            with open("plan.json", "w") as f:
                json.dump(plan_data, f, indent=4)
            
            await self.send_message("agent_log", message="📄 Plan saved to plan.json")
            
            try:
                # Run agents_functions.py with 'edit' mode via subprocess
                # Set PYTHONIOENCODING=utf-8 to support emoji output on Windows
                env = os.environ.copy()
                env["PYTHONIOENCODING"] = "utf-8"
                
                process = await asyncio.create_subprocess_exec(
                    "uv", "run", "python", "agents_functions.py", "edit",
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.STDOUT,
                    cwd=os.path.dirname(os.path.abspath(__file__)),
                    env=env
                )
                
                # Stream output to frontend
                while True:
                    line = await process.stdout.readline()
                    if not line:
                        break
                    decoded_line = line.decode().strip()
                    if decoded_line:
                        print(decoded_line)
                        await self.send_message("agent_log", message=decoded_line)
                
                await process.wait()
                
                if process.returncode == 0:
                    await self.send_message("agent_log", message="✅ Editing completed successfully!")
                    await self.send_message("executing_plan", progress=100, message="Editing complete!")
                else:
                    await self.send_message("agent_log", message=f"⚠️ Editing completed with exit code: {process.returncode}")
                    await self.send_message("warning", message="Editing completed with warnings")
                    
            except Exception as e:
                await self.send_message("agent_log", message=f"❌ Editing error: {str(e)}")
                await self.send_message("error", message=f"Error during editing: {str(e)}")
                return
            
            # Done!
            await self.send_message("execution_complete", data={
                "success": True,
                "num_images": num_images,
                "plan_steps": len(self.visual_plan.get("plan", [])),
                "audio_added": bool(self.audio_path)
            })
            
        except Exception as e:
            print(f"Execution error: {e}")
            await self.send_message("error", message=str(e))


@app.post("/execute")
async def start_execution(request: Request):
    """
    Start execution on connected Android device.
    Accepts: session_id (from planning), or image paths + visual plan directly
    """
    try:
        body = await request.json()
    except:
        form = await request.form()
        body = dict(form)
    
    # Get required data
    print("Body:", json.dumps(body, indent=4))
    visual_plan = body.get("visual_plan")
    if not visual_plan:
        return {"error": "No visual_plan provided"}
    
    # Parse visual_plan if it's a string
    if isinstance(visual_plan, str):
        visual_plan = json.loads(visual_plan)
    
    # Get image paths - either from planning session or provided directly
    planning_session_id = body.get("planning_session_id")
    image_paths = body.get("image_paths", [])
    
    # Check if an execution session already exists for this planning session
    # This prevents duplicate execution when frontend calls /execute multiple times
    for exec_id, exec_session in execution_sessions.items():
        if hasattr(exec_session, 'planning_session_id') and exec_session.planning_session_id == planning_session_id:
            print(f"[LOCK] Execution session already exists for planning_session_id: {planning_session_id}")
            return {
                "session_id": exec_id,
                "websocket_url": f"ws://localhost:5000/ws/execute/{exec_id}",
                "num_images": len(exec_session.image_paths)
            }
    
    if planning_session_id and planning_session_id in sessions:
        planning_session = sessions[planning_session_id]
        image_paths = planning_session.image_paths
    elif not image_paths:
        return {"error": "No images provided - include planning_session_id or image_paths"}
    
    # Get audio info (optional)
    # Frontend passes trimmed_audio_url, we need to convert to local path
    audio_url = body.get("audio_path") or body.get("audio_url")
    audio_path = None
    
    if audio_url and "localhost" in audio_url:
        # Extract filename from URL like http://localhost:5000/audio/xxx_trimmed.mp3
        filename = audio_url.split("/")[-1]
        local_path = os.path.join("trimmed_audio", filename)
        if os.path.exists(local_path):
            audio_path = local_path
    elif planning_session_id and planning_session_id in sessions:
        # Try to get trimmed audio from planning session
        trimmed_path = os.path.join("trimmed_audio", f"{planning_session_id}_trimmed.mp3")
        if os.path.exists(trimmed_path):
            audio_path = trimmed_path
    
    audio_track_name = body.get("audio_track_name", "audio_1")
    
    # Create execution session
    exec_session_id = str(uuid.uuid4())
    exec_session = ExecutionSession(
        session_id=exec_session_id,
        image_paths=image_paths,
        visual_plan=visual_plan,
        audio_path=audio_path,
        audio_track_name=audio_track_name
    )
    # Store planning_session_id to detect duplicates
    exec_session.planning_session_id = planning_session_id
    execution_sessions[exec_session_id] = exec_session
    
    return {
        "session_id": exec_session_id,
        "websocket_url": f"ws://localhost:5000/ws/execute/{exec_session_id}",
        "num_images": len(image_paths)
    }


@app.websocket("/ws/execute/{session_id}")
async def execution_websocket(websocket: WebSocket, session_id: str):
    """WebSocket endpoint for real-time execution updates"""
    await websocket.accept()
    
    session = execution_sessions.get(session_id)
    if not session:
        await websocket.send_json({"type": "error", "message": "Execution session not found"})
        await websocket.close()
        return
    
    # Check if execution is already running (prevent duplicate calls)
    if session.is_running:
        await websocket.send_json({"type": "info", "message": "Execution already in progress, joining as observer"})
        # Just keep this connection alive as an observer, don't start another execution
        try:
            while True:
                try:
                    await asyncio.wait_for(websocket.receive_text(), timeout=1.0)
                except asyncio.TimeoutError:
                    # Check if session still exists
                    if session_id not in execution_sessions:
                        break
                    continue
        except WebSocketDisconnect:
            pass
        return
    
    # Mark as running to prevent duplicate executions
    session.is_running = True
    session.websocket = websocket
    
    try:
        # Start execution in background
        execution_task = asyncio.create_task(session.run_execution())
        
        # Keep connection alive
        while True:
            try:
                data = await asyncio.wait_for(websocket.receive_text(), timeout=1.0)
                msg = json.loads(data)
                if msg.get("type") == "cancel":
                    execution_task.cancel()
                    break
            except asyncio.TimeoutError:
                if execution_task.done():
                    break
                continue
                
    except WebSocketDisconnect:
        print(f"Execution client disconnected: {session_id}")
    except Exception as e:
        print(f"Execution WebSocket error: {e}")
    finally:
        session.is_running = False
        if session_id in execution_sessions:
            del execution_sessions[session_id]


@app.get("/device/status")
async def get_device_status():
    """Check if Android device is connected"""
    connected, message = check_device_connection()
    return {
        "connected": connected,
        "message": message
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "droidrun-studio"}


@app.get("/sessions")
async def list_sessions():
    """List active sessions (for debugging)"""
    return {"active_sessions": list(sessions.keys())}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000)
