import asyncio
import os
import shutil
import subprocess
from PIL import Image
from droidrun import DroidAgent, DroidrunConfig, LLMProfile, LoggingConfig, AgentConfig, TracingConfig, CodeActConfig, ManagerConfig, ExecutorConfig, Tools
from dotenv import load_dotenv
from phoenix.otel import register
from inshot_tools import InshotTools
from pydantic import BaseModel, Field

# Constants for file transfer
REMOTE_ALBUM_PATH = "/sdcard/Pictures/droidrun"

def run_adb_command(cmd_list):
    """Run system ADB commands safely."""
    try:
        full_cmd = ["adb"] + cmd_list
        startupinfo = None
        if os.name == 'nt':
            startupinfo = subprocess.STARTUPINFO()
            startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
            
        result = subprocess.run(
            full_cmd, 
            capture_output=True, 
            text=True, 
            check=True,
            startupinfo=startupinfo
        )
        return True, result.stdout.strip()
    except subprocess.CalledProcessError as e:
        return False, e.stderr.strip()
    except FileNotFoundError:
         return False, "ADB not found. Install Android SDK platform-tools."

def check_device_connection():
    success, output = run_adb_command(["devices"])
    if not success: return False, output
    devices = [line for line in output.split('\n') if line.strip() and "List of devices" not in line]
    if not devices:
        return False, "No device found. Enable USB Debugging."
    return True, f"Connected: {devices[0].split()[0]}"

def process_files(local_files, status_callback=None):
    """
    Push images from temp_uploads to Android device.
    local_files: list of file paths (from temp_uploads/{session_id}/)
    status_callback: optional function(msg, progress, is_error, is_success, current_image_path)
    """
    total = len(local_files)
    
    if total == 0:
        print("No files to process")
        return False

    # Clear and create remote album directory
    run_adb_command(["shell", "rm", "-rf", REMOTE_ALBUM_PATH])
    run_adb_command(["shell", "mkdir", "-p", REMOTE_ALBUM_PATH])

    for i, file_path in enumerate(local_files):
        if not os.path.exists(file_path):
            print(f"Warning: File not found: {file_path}")
            continue
            
        # Use original filename or create numbered name
        filename = f"image_{i+1}{os.path.splitext(file_path)[1]}"
        remote_path = f"{REMOTE_ALBUM_PATH}/{filename}"
        
        progress = 10 + int((i / total) * 80)
        print(f"[UPLOAD] Uploading {filename} ({i+1}/{total})...")
        
        # Push file to device
        success, err = run_adb_command(["push", file_path, remote_path])

        if not success:
            print(f"Upload Failed: {err}")
            if status_callback:
                status_callback(f"Upload Failed: {err}", 0, is_error=True)
            return False

        # Set timestamp for proper ordering in gallery
        timestamp = f"20250101.1200{i:02d}" 
        run_adb_command(["shell", "touch", "-t", timestamp, remote_path])
        
        # Trigger media scan (legacy method)
        run_adb_command([
            "shell", "am", "broadcast", 
            "-a", "android.intent.action.MEDIA_SCANNER_SCAN_FILE", 
            "-d", f"file://{remote_path}"
        ])

        # Trigger media scan (modern method)
        subprocess.run([
            "adb", "shell", "content", "call",
            "--uri", "content://media/external/file",
            "--method", "scan_file",
            "--arg", remote_path
        ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        
        if status_callback:
            status_callback(f"Uploaded {filename}", progress)
    
    print(f"[DONE] All {total} images uploaded to device!")
    return True


async def select_images_tool(tools: Tools, **kwargs):
    ui_state = (await tools.get_state())[2]

    id = -1
    start = False
    elems = []
    for elem in ui_state:
        if elem.get("resourceId", "") == "com.camerasideas.instashot:id/wallRecyclerView":
            id = elem.get("index", "")
            start = True
            continue

        if not start: continue

        id_now = elem.get("index", "")
        if id_now - id > 1:
            if elem.get("resourceId") == "":
                elems.append(elem)
            else:
                start = False

    print(elems)
    print(len(elems))
    
    for elem in elems:
        try:
            bounds_str = elem.get("bounds", "0,0,0,0")
            bounds = [int(x) for x in bounds_str.split(',')]
            center_x = (bounds[0] + bounds[2]) // 2
            center_y = (bounds[1] + bounds[3]) // 2
            
            print(f"Tapping Image at ({center_x}, {center_y})")
            InshotTools._adb_tap(center_x, center_y)
            
        except Exception as e:
            print(f"Failed to tap element: {e}")

    add_el = await InshotTools._find_node_by_id(tools, "com.camerasideas.instashot:id/applySelectVideo", True)
    bounds = [int(x) for x in add_el.get("bounds", "0,0,0,0").split(',')]

    InshotTools._adb_tap((bounds[0] + bounds[2]) / 2, (bounds[1] + bounds[3]) / 2)

    print("Selection Complete")

def getProfile():
    """Get default agent specific LLM profiles."""
    return {
        "manager": LLMProfile(
            provider="GoogleGenAI",
            model="models/gemini-2.5-flash",
            temperature=0.2,
            kwargs={},
        ),
        "executor": LLMProfile(
            provider="GoogleGenAI",
            model="models/gemini-2.5-flash",
            temperature=0.1,
            kwargs={},
        ),
        "codeact": LLMProfile(
            provider="GoogleGenAI",
            model="models/gemini-2.5-flash",
            temperature=0.2,
            kwargs={},
        ),
        "text_manipulator": LLMProfile(
            provider="GoogleGenAI",
            model="models/gemini-2.5-flash",
            temperature=0.3,
            kwargs={},
        ),
        "app_opener": LLMProfile(
            provider="GoogleGenAI",
            model="models/gemini-2.5-flash",
            temperature=0.0,
            kwargs={},
        ),
        "scripter": LLMProfile(
            provider="GoogleGenAI",
            model="models/gemini-2.5-flash",
            temperature=0.1,
            kwargs={},
        ),
        "structured_output": LLMProfile(
            provider="GoogleGenAI",
            model="models/gemini-2.5-flash",
            temperature=0.0,
            kwargs={},
        ),
    }

def getAgentConfig(reasoning = False, vision=False):
    return AgentConfig(
        reasoning=reasoning,
        codeact=CodeActConfig(vision=vision, execution_timeout=500000),
        manager=ManagerConfig(vision=vision),
        executor=ExecutorConfig(vision=vision)
    )

async def select_images():
    goal = """
            Open inshot app and select all the images from the droidrun folder and go the video editor screen and your job is done.
            After opening the inshot app select the video icon (looks like a film) in the left center
            then click on new 
            then in the bottom left where it is written recents you will find a folder dropdown scroll through it to find the droidrun folder
            Note this instruction while finding the droidrun folder if u dont see it directly 
            - **CRITICAL: Finding the Folder**
            - The folder list is sensitive.
            - To scroll down, use **TINY SWIPES**.
            - **Instruction:** Swipe from (540, 1500) to (540, 1100). NEVER swipe more than 400 pixels at a time.
            - If you don't see it, swipe again (small swipe).
            - Note for selecting images STRICTLY CALL select images tool call
            
            **CRITICAL: DO NOT CLICK ON THE BLANK IMAGE AT THE VERY START OF THE IMAGE SELECTION SCREEN IGNORE IT AND SELECT EVERYTHING*
            **CRITICAL: FOR SELECTING IMAGES STRICTLY USE THE select images tool call
        """
    
    custom_tools = {
        "select_images": {
            "arguments": [],
            "description": "Selects the images",
            "function": select_images_tool
        }
    }
    
    load_dotenv()
    tracer_provider = register(
        project_name="droidrun-video-editor", 
        endpoint="http://127.0.0.1:6006/v1/traces",
        auto_instrument=True
    )
    
    config = DroidrunConfig(
        agent=getAgentConfig(reasoning=False, vision=False),
        llm_profiles=getProfile(),
        logging=LoggingConfig(debug=True, save_trajectory="none"),
        tracing=TracingConfig(enabled=True, provider="phoenix")
    )

    agent = DroidAgent(
        goal=goal,
        config=config,
        custom_tools=custom_tools
    )

    result = await agent.run()

    return result.success

    

import json

async def edit_image(num_images, plan):
    load_dotenv()
    tracer_provider = register(
        project_name="droidrun-video-editor", 
        endpoint="http://127.0.0.1:6006/v1/traces",
        auto_instrument=True 
    )
    
    config = DroidrunConfig(
        agent=getAgentConfig(reasoning=False, vision=False),
        llm_profiles=getProfile(),
        logging=LoggingConfig(debug=True, save_trajectory="none"),
        tracing=TracingConfig(enabled=True, provider="phoenix")
    )

    print(f"[INFO] App Cards Enabled: {config.agent.app_cards.enabled}")
    
    plan_str = json.dumps(plan, indent=4)

    goal = f"""
        Phase 1: Setup & Physics
        - Call 'calibrate(num_images={num_images})' to map the timeline.

        Phase 2: Execution
        Follow this execution plan strictly. Convert the JSON below into tool calls. 
        Try to call multiple tools in one go (parallel execution) where possible for speed.

        EXECUTION PLAN:
        {plan_str}
        """

    custom_tools = {
        "calibrate": {
            "arguments": ["num_images"],
            "description": "CRITICAL FIRST STEP. Measures the timeline scale (pixels per second). usage: calibrate(num_images=4)",
            "function": InshotTools.calibrate
        },
        "seek_timeline": {
            "arguments": ["time"],
            "description":  "Moves the playhead to a specific timestamp in seconds (e.g. 12.5). Automatically corrects position if it misses.",
            "function": InshotTools.seek_timeline
        },
        "add_transition": {
            "arguments": ["image1_idx", "image2_idx", "transition_type", "all_apply"],
            "description": "Adds a transition between two images. image1_idx/image2_idx are 1-based. all_apply=True applies to ALL clips (use idx 1 & 2 as placeholders).",
            "function": InshotTools.add_transition
        },
        "change_duration": {
            "arguments": ["image_idx", "duration"],
            "description": "Changes the duration of a specific clip. image_idx is 1-based. duration is in seconds.",
            "function": InshotTools.change_duration
        },
        "apply_effect": {
            "arguments": ["image_idx", "effects_list"],
            "description": "Applies a list of visual effects to a specific clip. image_idx is 1-based. effects_list is a list of strings (e.g. ['Slow Zoom', 'Darken']). Max 2 effects.",
            "function": InshotTools.apply_effect
        },
        "apply_animation": {
            "arguments": ["image_idx", "animation_name", "animation_type"],
            "description": "Applies a particular animation of argument 'animation_name' of type 'animation_type' to an image of idx 'image_idx'",
            "function": InshotTools.apply_animation
        },
        "add_music_effects": {
            "arguments": ["start_time", "music_name"],
            "description": "Applies a music effect to a particular image segment",
            "function": InshotTools.add_music_effects
        },
        "add_background_music": {
            "arguments": ["track_name"],
            "description": "Adds a background music as specified by the track name argument",
            "function": InshotTools.add_background_music
        }
    }

    agent = DroidAgent(
        goal=goal,
        config=config,
        custom_tools=custom_tools
    )

    result = await agent.run()

    return result

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python agents_functions.py <select|edit>")
        sys.exit(1)
    
    mode = sys.argv[1]
    
    if mode == "select":
        print("[SELECT] Starting image selection mode...")
        asyncio.run(select_images())
        print("[DONE] Image selection complete!")
        
    elif mode == "edit":
        with open("plan.json", "r") as f:
            plan_data = json.load(f)
        
        num_images = plan_data.get("num_images", 2)
        plan = plan_data.get("plan", [])
        
        print(f"[PLAN] Loaded plan with {len(plan)} steps for {num_images} images")
        asyncio.run(edit_image(num_images, plan))
        print("[DONE] Editing complete!")
        
    else:
        print(f"Unknown mode: {mode}. Use 'select' or 'edit'")
        sys.exit(1)
