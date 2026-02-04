"""
VideoDirector - AI Video Editing Director
Uses Gemini to generate visual plans, music selections, and final edit decisions.
"""

from google import genai
import json
from dotenv import load_dotenv
import shutil
import os
import yt_dlp
import subprocess

DIRECTOR_SYSTEM_PROMPT = """
You are an expert Video Editor AI. Your goal is to translate a high-level user request (e.g., "Make it cinematic", "Make it fast-paced") into a specific list of tool execution commands.
Note 1: All these things are of Inshot App so please take care of it while deciding the look and feel of the video
Note 2: If you do not manually set the duration of any image by default it is set to 5 seconds so please take care of that

This is a first step of the editing process where u will decide the raw effects and animations on the images after that there would be music too added so decide accordingly

### AVAILABLE TOOLS
# 1. apply_effect(image_idx: int, effects_list: list[str])
    - Applies one or more effects to image_idx (1-indexed).
    - Example: {{"tool": "apply_effect", "args": {{"image_idx": 1, "effects_list": ["Slow Zoom", "Darken"]}} }}    - applies effect for the whole duration of image1_idx (1-indexed)
        "Slow Zoom": "Basic",
        "Zoom Out": "Basic",
        "Tremble": "Basic",
        "Thrill": "Basic",
        "Roll": "Basic",

        "Glitch": "Glitch",
        "Noise": "Glitch",
        "RGB": "Glitch",

        "Strobe": "Vibrate",
        "Flash": "Vibrate",
        "Flow": "Vibrate",
        "Flicker": "Vibrate",
        "Flip": "Vibrate",
        "Leap": "Vibrate",

        "Node": "Shake",
        "Flutter": "Shake",
        "Bass": "Shake",
        "Shake": "Shake",
        "Cam Shake": "Shake",

        "White": "Fade",
        "Black": "Fade",
        "Mosiac": "Fade",

        "Focus": "Film",
        "Zoom": "Film",
        "Darken": "Film",

        "REC": "Retro",
        "VHS": "Retro",

        "Circle": "Blur",
        "Diamond": "Blur",
        
        "Date": "Analog",
        "Shorts": "Analog",
        "Split": "Analog",

        "Two": "Split",
        "Four": "Split",
        "Nine": "Split",

        "Shatter": "Glass",
        "Shard": "Glass"

    - The key in this json is the name of the effect and the value is the category the effect falls under use this information wisely while selecting the effect
    - in the function argument only provide the key like "Zoom", "Focus" not the value of the key.

2. add_transition(image1_idx: int, image2_idx: int, transition_type: str, all_apply: bool)
   - Applies tranistions between image1_idx and image2_idx (1-indexed)
   - Avaliable transitions
    "none"
    "mix"
    "fade"
    "blur"
    "circlefade"
    "wipe right"
    "wipe left"
    "wipe down"
    "wipe up"
    "slide right"
    "slide left"
    "slide down"
    "slide up"
   - 'all_apply=True' puts the same transition between ALL clips.

4. change_duration(image_idx: int, duration: float)
   - Use this to control for how long the images would be there in the video, controls pacing
   - Note You cannot set the duration of any image below 1.5 seconds

5. apply_animation(image_idx: int, animation_name: str, animation_type: str)
   - Applies an animation to an image 
   - Note Animation is of 4 type IN, OUT or COMBO
   - IN animation is a 1 second animation that is played at the start of the image
   - OUT animation is a 1 second animation that is played at the end of the image
   - COMBO animation would be played for the full duration of the image and includes 
   - COMBO animations are designed to flow continuously. When using COMBO animations 
    on consecutive clips, they create smooth 
    continuous motion between clips.   
   - For an image u can either do this -> Have a Combo animation or In/Out Animation
   - These are the all the animations present
   "IN": [
        "Fade",
        "Zoom In",
        "Zoom Out",
        "Shake In",
        "Shake Out",
        "Rise",
        "Fall",
        "Slide R",
        "Slide L",
        "Swing R",
        "Swing L",
        "Ripple",
        "Distort",
        "Bounce 01",
        "Bounce 02",
        "Arrange",
        "Diagonal"
    ],

    "OUT": [
        "Fade",
        "Zoom In",
        "Zoom Out",
        "Slide R",
        "Slide L",
        "Slide D",
        "Slide U",
        "Swipe R",
        "Swipe L",
        "Swipe D",
        "Swipe U",
        "Ripple",
        "Distort",
        "Diagonal"
    ],

    "COMBO": [
        "Fall Spin",
        "Spin Fall",
        "Sway Zoom",
        "Zoom Sway",
        "Swing L",
        "Swing R",
        "Fuzz 01",
        "Fuzz 02",
        "Whip In",
        "Whip Out",
        "Stripe In",
        "Stripe Out",
        "Trans L",
        "Trans R"
    ]

### NOTE
- Images are presented in sequential order first one is 1st image and so on. Furthermore the first image is named image1 and so on
- Transitions consume 1 second from total duration, 0.5 from from both clips. Account for this in your pacing.
   
### CONSTRAINTS
- You have {num_clips} clips available (Indices 1 to {num_clips}).
- Do NOT hallucinate tools not listed above.
- Output strictly valid JSON.
- 1. FIRST: Set all clip durations (change_duration)
  2. THEN: Apply effects and animations
3. LAST: Add transitions


### OUTPUT FORMAT
{{
  "thought_process": "Brief explanation of your editing choices.",
  "music_thoughts": "Based on your plan of the edit add a detailed further song/music effects guide for the next round of music edits for this edit
  "plan": [
      {{ "tool": "tool_name", "args": {{ "arg1": "value", "arg2": "value" }} }}
  ]
}}
"""

DIRECTOR_MUSIC_PROMPT = """
You are the Music Supervisor AI asked to pick the music tracks of the edit.
The Visual Director has already planned the video structure. Your job is to select the perfect backing track.

### VISUAL PLAN CONTEXT
The video has a total estimated duration of: {total_duration} seconds.
Visual Director's Music Vision: "{music_thoughts}"

Previous Visual Plan:
{plan}

### INSTRUCTIONS
1. Analyze the Visual Plan.
2. Suggest a track that fits the duration and vibe. (Track could mean a song/music from any artist)
3. You can provide multiple options.
4. You can suggest max 2 options.

### OUTPUT FORMAT
{{
    "thought_process": "Reasoning for selection",
    "tracks": [
        {{ "track_name": "Name of song", "artist_name": "Artist Name", "vibe": "Vibe of the track", "reasoning": "How this track might be used in this edit and what is the reasoning for it" }}
    ]
}}
"""

DIRECTOR_INFUSE_MUSIC_PROMPT = """
You are an expert Music Editor and Sound Engineer.
You have been provided with:
1. A set of candidate audio tracks (uploaded as audio files).
2. A detailed Visual Editing Plan (JSON) that describes the flow, pacing, and transitions of the video.
3. The calculate Total Duration of the video.

### YOUR GOAL
Select the ONE best track from the candidates and identify the exact **Start Time** timestamp to slice the audio so that it syncs perfectly with the video.

### INPUT DATA
Total Video Duration: {total_duration} seconds.
Visual Plan:
{visual_plan}
Visual Director thoughts about Music
{music_thoughts}

Note if a clip duration is not specified it is 5 seconds at default and upon each transition the total duration
gets subtracted by 1 second (0.5 from each clip)

### ANALYSIS INSTRUCTIONS
1. **Listen to all uploaded audio tracks.** Analyze their BPM, energy, and "drop" moments.
2. **Analyze the Visual Plan.**

### OUTPUT FORMAT (Strict JSON)
{{
    "thought_process": "Explain why you chose this track and why this specific start time aligns with the video edits.",
    "selected_track_filename": "The exact filename of the audio file you chose"
    "start_time_seconds": 45.5,
    "end_time_seconds": 50.0
}}

*Note: 'start_time_seconds' is the timestamp in the song file where the edit should begin.*
"""


class VideoDirector:
    def __init__(self, clips_path: list[str]):
        load_dotenv()
        self.client = genai.Client()
        self.model = "gemini-2.5-pro"
        self.clips_path = clips_path
        self.uploaded_files = None
        self._upload_files()
    
    def _upload_files(self):
        if self.uploaded_files is not None:
            return
        
        files = []
        for i, path in enumerate(self.clips_path):
            files.append(self.client.files.upload(file=path, config={
                "display_name": f"image{i}"
            }))
        
        self.uploaded_files = files
    
    @staticmethod
    def send_audio_to_phone(local_file_path, destination_folder="/sdcard/Music/"):
        """
        Pushes audio to Android and forces a MediaStore refresh so InShot sees it instantly.
        """
        filename = os.path.basename(local_file_path)
        remote_path = f"{destination_folder.rstrip('/')}/{filename}"
        
        print(f"🚀 Pushing {filename} to {destination_folder}...")

        try:
            subprocess.run(["adb", "push", local_file_path, destination_folder], check=True)
            
            print("   Triggering legacy media scan...")
            subprocess.run([
                "adb", "shell", "am", "broadcast", 
                "-a", "android.intent.action.MEDIA_SCANNER_SCAN_FILE", 
                "-d", f"file://{remote_path}"
            ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

            print("   Triggering modern media scan...")
            subprocess.run([
                "adb", "shell", "content", "call",
                "--uri", "content://media/external/file",
                "--method", "scan_file",
                "--arg", remote_path
            ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            
            print(f"✅ Success! {filename} is ready in InShot > Music > My Music.")
            return True

        except subprocess.CalledProcessError as e:
            print(f"❌ ADB Error: {e}")
            return False
        except FileNotFoundError:
            print("❌ Error: ADB is not in your PATH or not installed.")
            return False
    
    @staticmethod
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
    
    @staticmethod
    def download_audio(idx: int, track_name: str, track_artist: str, output_dir: str = "downloads") -> str:
        if not os.path.exists(output_dir):
            os.makedirs(output_dir)

        query = f"{track_name} by {track_artist} audio"
        print(f"🎧 Searching and downloading: '{query}'...")

        ydl_opts = {
            'format': 'bestaudio/best',
            'restrictfilenames': True,
            'outtmpl': os.path.join(output_dir, f'audio_{idx}.%(ext)s'),
            'default_search': 'ytsearch1',
            'noplaylist': True,
            'quiet': True,
            'no_warnings': True,
            # Add these to avoid 403 errors
            'extractor_args': {'youtube': {'player_client': ['android', 'web']}},
            'http_headers': {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            },
            'socket_timeout': 30,
            'retries': 3,
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '192',
            }],
        }

        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info_dict = ydl.extract_info(query, download=True)

                if 'entries' in info_dict:
                    info_dict = info_dict['entries'][0]

                final_path = os.path.join(output_dir, f"audio_{idx}.mp3")
                print(f"✅ Downloaded: {final_path}")
                return os.path.abspath(final_path)

        except Exception as e:
            print(f"❌ Failed to download track: {e}")
            return None

    @staticmethod
    def calculate_total_duration(plan: dict, num_clips: int) -> float:
        clip_durations = {i: 5.0 for i in range(1, num_clips + 1)}
        num_transitions = 0
        
        # Parse the plan
        for step in plan["plan"]:
            tool = step["tool"]
            args = step["args"]
            
            if tool == "change_duration":
                image_idx = args["image_idx"]
                duration = args["duration"]
                clip_durations[image_idx] = duration
            
            elif tool == "add_transition":
                if args.get("all_apply", False):
                    num_transitions = num_clips - 1
                else:
                    num_transitions += 1
        
        total_clip_duration = sum(clip_durations.values())
        total_duration = total_clip_duration - num_transitions
        
        return total_duration
        
    def generate_initial_plan(self, user_prompt: str):
        num_clips = len(self.clips_path)
        system_instruction = DIRECTOR_SYSTEM_PROMPT.format(num_clips=num_clips)
        
        full_prompt = f"""
        {system_instruction}
        
        USER REQUEST: "{user_prompt}"
        """

        contents = [full_prompt]
        contents.append("Here is the visual context for the video clips, in order:")

        for i, file_obj in enumerate(self.uploaded_files):
            contents.append(f"\n--- IMAGE {i+1} ---")
            contents.append(file_obj)
        
        print(f"🎨 Director thinking about: '{user_prompt}'...")
        response = self.client.models.generate_content(model=self.model, 
                                                       contents=contents
                                                       )

        # Extract usage metadata
        usage_data = None
        if response.usage_metadata:
            um = response.usage_metadata
            usage_data = {
                "prompt_tokens": um.prompt_token_count or 0,
                "candidates_tokens": um.candidates_token_count or 0,
                "thinking_tokens": um.thoughts_token_count or 0,
                "cached_tokens": um.cached_content_token_count or 0,
                "total_tokens": um.total_token_count or 0,
            }
        print(f"Usage: {usage_data}")
        
        try:
            clean_text = response.text.replace("```json", "").replace("```", "").strip()
            plan_data = json.loads(clean_text)
            plan_data["_usage"] = usage_data
            with open("plan.json", "w") as f:
                json.dump(plan_data, f, indent=4)
            return plan_data
        except Exception as e:
            print(f"Error parsing Director plan: {e}")
            return None
    
    def generate_music_content(self, user_prompt: str, initial_plan: dict[str]):
        music_instruction = DIRECTOR_MUSIC_PROMPT.format(
            plan=json.dumps(initial_plan["plan"]), 
            music_thoughts=initial_plan["music_thoughts"],
            total_duration=VideoDirector.calculate_total_duration(initial_plan, len(self.uploaded_files)))
        
        full_prompt = f"""
        {music_instruction}

        USER REQUEST: "{user_prompt}
        """

        contents = [full_prompt]
        contents.append("Here is the visual context for the video clips, in order:")

        for i, file_obj in enumerate(self.uploaded_files):
            contents.append(f"\n--- IMAGE {i+1} ---")
            contents.append(file_obj)
        
        print(f"🎥 Director thinking about music plan: '{user_prompt}'...")
        response = self.client.models.generate_content(model=self.model, 
                                                       contents=contents
                                                       )

        # Extract usage metadata
        usage_data = None
        if response.usage_metadata:
            um = response.usage_metadata
            usage_data = {
                "prompt_tokens": um.prompt_token_count or 0,
                "candidates_tokens": um.candidates_token_count or 0,
                "thinking_tokens": um.thoughts_token_count or 0,
                "cached_tokens": um.cached_content_token_count or 0,
                "total_tokens": um.total_token_count or 0,
            }
        print(f"Usage: {usage_data}")
        
        try:
            clean_text = response.text.replace("```json", "").replace("```", "").strip()
            plan_data = json.loads(clean_text)
            plan_data["_usage"] = usage_data
            with open("plan_music.json", "w") as f:
                json.dump(plan_data, f, indent=4)
            return plan_data
        except Exception as e:
            print(f"Error parsing Director plan: {e}")
            return None
    
    def decide_music_infusion(self, visual_plan: dict, audio_paths: list[str], music_thoughts: str):
        total_duration = self.calculate_total_duration(visual_plan, len(self.clips_path))
        
        prompt = DIRECTOR_INFUSE_MUSIC_PROMPT.format(
            total_duration=total_duration,
            visual_plan=json.dumps(visual_plan["plan"], indent=2),
            music_thoughts=music_thoughts
        )

        audio_files = []
        for i, path in enumerate(audio_paths):
            audio_files.append(self.client.files.upload(file=path, config={
                "display_name": f"audio_{i+1}"
            }))

        contents = [prompt]
        contents.append(f"Here are the {len(audio_paths)} candidate tracks in order:")

        for i, audio_obj in enumerate(audio_files):
            contents.append(f"\n ---- AUDIO {i+1} ---")
            contents.append(audio_obj)
        
        contents.append(f"Here are also raw images on which the edit is to be perfomed:")

        for i, file_obj in enumerate(self.uploaded_files):
            contents.append(f"\n--- IMAGE {i+1} ---")
            contents.append(file_obj)


        # 4. Generate Decision
        print(f"\n🎧 Director listening to tracks to find the perfect {total_duration}s cut...")
        response = self.client.models.generate_content(
            model=self.model,
            contents=contents,
        )

        # Extract usage metadata
        usage_data = None
        if response.usage_metadata:
            um = response.usage_metadata
            usage_data = {
                "prompt_tokens": um.prompt_token_count or 0,
                "candidates_tokens": um.candidates_token_count or 0,
                "thinking_tokens": um.thoughts_token_count or 0,
                "cached_tokens": um.cached_content_token_count or 0,
                "total_tokens": um.total_token_count or 0,
            }
        print(f"Usage: {usage_data}")
        
        try:
            clean_text = response.text.replace("```json", "").replace("```", "").strip()
            plan_data = json.loads(clean_text)
            plan_data["_usage"] = usage_data
            with open("final_plan.json", "w") as f:
                json.dump(plan_data, f, indent=4)
            return plan_data
        except Exception as e:
            print(f"Error parsing Director plan: {e}")
            return None

    
    def generate_plan(self, user_prompt: str):
        initial_plan = self.generate_initial_plan(user_prompt)
        print(initial_plan)
        music_plan = self.generate_music_content(user_prompt, initial_plan)
        print(music_plan)

        if os.path.exists("downloads"):
            shutil.rmtree("downloads")
        os.makedirs("downloads")

        for i, tracks in enumerate(music_plan["tracks"]):
            VideoDirector.download_audio(i+1, tracks["track_name"], tracks["artist_name"])
        
        files = os.listdir("downloads")
        paths = [os.path.join("downloads", file) for file in files]
        print(paths)
        final_plan = self.decide_music_infusion(initial_plan, paths, initial_plan["music_thoughts"])
        print(final_plan)

        return final_plan


if __name__ == "__main__":
    files = os.listdir("images")
    paths = [os.path.join("images", file) for file in files]
    director = VideoDirector(paths)
    print(director.generate_plan("Make a intresting catchy and cool edit from these images"))
