from droidrun import DroidAgent, Tools
from redis_state import global_state
import asyncio
import json
import subprocess

class InshotTools:

    @staticmethod
    def _adb_tap(x, y):
        try:
            cmd = f"adb shell input tap {int(x)} {int(y)}"
            subprocess.run(cmd, shell=True, check=True)
            print(f"ADB Executed: input tap {int(x)} {int(y)}")
        except Exception as e:
            print(f"ADB Error: {e}")

    @staticmethod
    async def _find_node_by_id(tools: Tools, target_id, return_element=False):
        ui_state = (await tools.get_state())[2]
        for element in ui_state:
            if element.get('resourceId') == target_id:
                if return_element:
                    return element
                return element.get("index")
        return -1

    @staticmethod
    def _get_current_time(ui_state):
        target_id = "com.camerasideas.instashot:id/current_position"
        
        for element in ui_state:
            if element.get('resourceId') == target_id:
                time_text = element.get('text', "0:00.0")
                return InshotTools._parse_inshot_time(time_text)
                
        return 0.0

    @staticmethod
    def _get_clip_midpoint(image_idx: int):
        timeline_map = global_state.get("timeline_map")
        if not timeline_map:
            print("Error: Timeline map not found (Calibrate first).")
            return None

        # Convert 1-based index to 0-based
        list_idx = image_idx - 1

        if list_idx < 0 or list_idx >= len(timeline_map):
            print(f"Error: Index {image_idx} out of bounds (Total clips: {len(timeline_map)}).")
            return None

        # Calculate Start Time (Sum of all previous clips)
        start_time = sum(timeline_map[:list_idx])
        
        # Get Duration of target clip
        duration = timeline_map[list_idx]
        
        # Calculate Midpoint
        midpoint = start_time + (duration / 2.0)
        end_time = start_time + duration

        print(f"Clip {image_idx} Range: {start_time:.2f}s - {end_time:.2f}s")
        print(f"Calculated Midpoint: {midpoint:.2f}s")
        
        return midpoint
    
    @staticmethod
    def _get_total_duration_from_state(ui_state):
        target_id = "com.camerasideas.instashot:id/total_clips_duration"
        
        for element in ui_state:
            if element.get('resourceId') == target_id:
                time_text = element.get('text', "0:00.0")
                return InshotTools._parse_inshot_time(time_text)
        return 0.0

    @staticmethod
    def _get_clip_range(image_idx: int):
        timeline_map = global_state.get("timeline_map")
        if not timeline_map: return None, None
        
        # Convert 1-based to 0-based
        idx = image_idx - 1
        if idx < 0 or idx >= len(timeline_map): return None, None
        
        start_time = sum(timeline_map[:idx])
        duration = timeline_map[idx]
        return start_time, start_time + duration

    @staticmethod
    def _parse_inshot_time(time_str):
        try:
            parts = time_str.split(':')
            minutes = float(parts[0])
            seconds = float(parts[1])
            return (minutes * 60) + seconds
        except:
            return 0.0

    def _calibrate(ui_state, num_images: int):
        target_id = "com.camerasideas.instashot:id/layout"
        DEFAULT_DURATION = 5.0 
        
        # --- 1. Map Initialization ---
        timeline_map = [DEFAULT_DURATION] * num_images

        global_state.set("timeline_map", timeline_map)
        global_state.set("raw_image_duration", timeline_map.copy())
        print(f"[MAP] Initialized Timeline Map for {num_images} clips.")

        timeline_segments = [
            el for el in ui_state 
            if el.get('resourceId') == target_id
        ]

        if len(timeline_segments) < 4:
            print(f"Calibration Warning: Found {len(timeline_segments)} segments. Needed at least 4.")
            return

        try:
            # --- 2. Physics Calculation (px/sec) ---
            total_width = 0.0
            print("Measuring UI Chunks:")
            for i in [1, 2, 3]:
                segment = timeline_segments[i]
                bounds_str = segment.get('bounds', "")
                coords = [int(x) for x in bounds_str.split(',')]
                width = coords[2] - coords[0]
                total_width += width
                print(f"   - Chunk {i} width: {width}px")

            px_per_sec = total_width / DEFAULT_DURATION
            global_state.set("px/sec", px_per_sec)

            # --- 3. Geometry Calculation (Center Point) ---
            # We use the 1st segment (Index 0) to find the playhead line
            first_segment = timeline_segments[0]
            bounds = [int(x) for x in first_segment.get('bounds', "0,0,0,0").split(',')]
            
            # The playhead is at the Right edge of the first element
            center_x = bounds[2] 
            # The vertical center of the track
            center_y = (bounds[1] + bounds[3]) // 2
            
            # Save as a list [x, y] to Redis
            global_state.set("timeline_center", [center_x, center_y])
            global_state.set("y_width", bounds[3] - bounds[1])
            
            print(f"CALIBRATION COMPLETE")
            print(f"   Physics: 1s = {px_per_sec:.2f} px")
            print(f"   Geometry: Playhead Fixed at ({center_x}, {center_y})")
            
        except Exception as e:
            print(f"Calibration Error: {e}")
    
    @staticmethod
    async def _drag_gesture(tools, start_x, start_y, start_time, end_time):
        # 1. Get Calibration Data
        px_per_sec = global_state.get("px/sec")
        center_coords = global_state.get("timeline_center") # [center_x, center_y]
        
        if not px_per_sec or not center_coords:
            print("Error: Calibration data missing for drag.")
            return
        
        duration_needed = end_time - (start_time + 3.0)
        pixel_offset = int(duration_needed * px_per_sec)
        
        target_x = start_x + pixel_offset

        print(f"Dragging Handle: {start_x} -> {target_x} (Duration: {duration_needed:.2f}s)")

        await tools.swipe(start_x, start_y, target_x, start_y, duration_ms=2000)
        await asyncio.sleep(1.0) # Wait for UI to settle

    @staticmethod
    async def _seek_and_select_text(tools: Tools, target_text, anchor_text=None, swipe_area="menu"):
        MAX_SWIPES = 5
        target_lower = target_text.lower()
            
        for attempt in range(MAX_SWIPES):
            ui_state = (await tools.get_state())[2]
            for el in ui_state:
                txt = el.get("text", "")
                if swipe_area == "content" and not txt.isupper():
                    continue

                txt = txt.lower()
                if anchor_text and anchor_text.lower() == txt:
                    bounds = [int(x) for x in el.get("bounds", "0,0,0,0").split(',')]
                    swipe_y = (bounds[1] + bounds[3]) // 2
                    
                # Check for Match
                if txt == target_lower:
                    print(f"Found '{target_text}' at Index {el.get('index')}")
                    await tools.tap_on_index(el.get("index"))
                    return True
            
            # 2. Not found? Swipe.
            print(f"   '{target_text}' not visible. left (Y={swipe_y})...")
            
            # Swipe Left (Right to Left)
            await tools.swipe(900, swipe_y, 200, swipe_y, duration_ms=600)
            await asyncio.sleep(1.0)
            
        return False

    @staticmethod
    async def _seek_and_select_vertical(tools: Tools, target_text):
        MAX_SCROLLS = 8
        target_lower = target_text.lower()
        scroll_x = 500 

        for attempt in range(MAX_SCROLLS):
            ui_state = (await tools.get_state())[2]
            
            for el in ui_state:
                txt = el.get("text", "").strip().lower()
                if txt == target_lower:
                    index = el.get("index")
                    print(f"Found '{target_text}' at Index {index}")
                    bounds = [int(x) for x in el.get("bounds", "0,0,0,0").split(',')]
                    InshotTools._adb_tap((bounds[0] + bounds[2]) / 2, (bounds[1] + bounds[3]) / 2)
                    return True

            print(f"Attempt {attempt + 1}: '{target_text}' not visible. Scrolling down...")
            await tools.swipe(scroll_x, 800, scroll_x, 300, duration_ms=600)
            # await asyncio.sleep(1.0)
            
        return False

    @staticmethod
    async def seek_timeline(time, allowed_error = 0.2, tools: Tools = None, shared_state=None, **kwargs):
        # 1. READ Physics & Geometry
        px_per_sec = global_state.get("px/sec")
        center_coords = global_state.get("timeline_center") # Returns [x, y]
        
        if not px_per_sec or not center_coords: 
            return "Error: Physics/Geometry not calibrated. Run 'calibrate' first."

        start_x, start_y = center_coords
        screen_width = start_x * 2 # Heuristic: Playhead is centered
        safe_margin = 100

        target_time = float(time)
        max_iterations = 10
        
        print(f"Seeking {target_time}s using Origin({start_x}, {start_y})...")

        for i in range(max_iterations):
            
            # A. Measure Reality
            ui_state = (await tools.get_state())[2]
            current_time = InshotTools._get_current_time(ui_state)
            
            diff = target_time - current_time
            
            if abs(diff) < allowed_error:
                print(f"Arrived at {current_time}s (Target: {target_time}s)")
                return current_time

            print(f"   Step {i+1}: Current={current_time}s | Error={diff:.2f}s")

            # B. Calculate Swipe using CONSTANT geometry
            pixels_needed = int(abs(diff) * px_per_sec)
            
            if diff > 0: 
                # Forward -> Drag Left
                max_travel = start_x - safe_margin
                actual_swipe = min(pixels_needed, max_travel)
                end_x = start_x - actual_swipe
            else:
                # Backward -> Drag Right
                max_travel = (screen_width - start_x) - safe_margin
                actual_swipe = min(pixels_needed, max_travel)
                end_x = start_x + actual_swipe

            # C. Execute
            # Note: access controller via tools.agent.controller
            distance_to_move = abs(start_x - end_x)
            
            # CONSTANT SPEED LOGIC
            # We want a steady 'drag' speed, roughly 2px per ms
            # Minimum duration 300ms (to avoid fling), Max 2000ms (to avoid timeout)
            safe_speed = 2.0 
            calculated_duration = int(distance_to_move / safe_speed)
            
            # Clamp limits
            actual_duration = max(300, min(2000, calculated_duration))
            if diff < 0.3:
                actual_duration = 600
            await tools.swipe(start_x, start_y, end_x, start_y, duration_ms=actual_duration)
            await asyncio.sleep(0.2) 

        ui_state = (await tools.get_state())[2]
        current_time = InshotTools._get_current_time(ui_state)
        print(f"Stopped after {max_iterations} steps. Landed at {current_time}s.")
        return current_time

    @staticmethod
    async def calibrate(num_images: int, tools: Tools = None, shared_state=None, **kwargs):
        ui_state = (await tools.get_state())[2]
        with open("test_ui_state.json", "w") as f:
            json.dump(ui_state, f, indent=4)
        InshotTools._calibrate(ui_state=ui_state, num_images=num_images)

    @staticmethod
    async def add_transition(image1_idx: int, image2_idx: int, transition_type: str, all_apply: bool, transition_time=1, tools: Tools = None, **kwargs):
        # 1. Validation & State Retrieval
        if image2_idx != image1_idx + 1:
            return "Error: Can only transition adjacent clips."
            
        timeline_map = global_state.get("timeline_map") 
        px_per_sec = global_state.get("px/sec")
        center_coords = global_state.get("timeline_center") # [center_x, center_y]
        y_width = global_state.get("y_width")

        if not timeline_map or not px_per_sec or not center_coords: 
            return "Error: Run calibration first."

        # 2. Seek to the Junction
        junction_time = sum(timeline_map[:image1_idx])
        print(f" Seeking junction at {junction_time}s...")
        
        await InshotTools.seek_timeline(junction_time, allowed_error=3.5, tools=tools)

        # 3. MEASURE REALITY (Calculate Shift)
        ui_state = (await tools.get_state())[2]
        current_time = InshotTools._get_current_time(ui_state)
        
        diff = current_time - junction_time 
        pixel_offset = int(diff * px_per_sec)
        
        playhead_x = center_coords[0]
        theoretical_x = playhead_x - pixel_offset
        
        print(f"Seek Result: {current_time}s (Error: {diff:.2f}s)")
        print(f"Math Target: {theoretical_x} (Shifted {pixel_offset}px)")

        tap_x = theoretical_x
        best_y = center_coords[1] + y_width / 2 - 5
            
        final_x = tap_x - 5
        final_y = best_y
        InshotTools._adb_tap(final_x, final_y)
        
        # Wait a moment for the menu to open
        await asyncio.sleep(0.5)

        # Select the transition
        ui_state = (await tools.get_state())[2]

        idx_basic = -1
        idxApply = None
        idxApplyAll = None
        
        # We will store the actual transition elements here
        transition_row_elements = []
        reference_top = -1

        for i, element in enumerate(ui_state):
            text = element.get("text", "")
            rid = element.get("resourceId", "")
            
            # 1. Find "BASIC" Label
            if text == "BASIC":
                idx_basic = i
                
                if i + 2 < len(ui_state):
                    ref_element = ui_state[i+2]
                    bounds_str = ref_element.get("bounds", "0,0,0,0")
                    reference_top = int(bounds_str.split(',')[1])
            
            # 2. Find Apply Buttons
            if rid == "com.camerasideas.instashot:id/btnApply":
                idxApply = element.get("index")
            elif rid == "com.camerasideas.instashot:id/btnApplyAll":
                idxApplyAll = element.get("index")

            if idx_basic != -1 and reference_top != -1:
                bounds_str = element.get("bounds", "0,0,0,0")
                curr_parts = bounds_str.split(',')
                if len(curr_parts) == 4:
                    curr_top = int(curr_parts[1]) 
                    
                    # Check if this element is on the same line (allowing small pixel jitter)
                    if abs(curr_top - reference_top) < 2:
                        # Exclude the "BASIC" text itself if it shares alignment
                        if text != "BASIC":
                            transition_row_elements.append(element)

        if idx_basic == -1:
            return
        
        print(f"Total Elements in View: {len(transition_row_elements)}")

        with open("transitions.json", "r") as f:
            transitions = json.load(f)
        
        index = transitions.get(transition_type.lower())
        idx_basic += index

        if index - 1 > len(transition_row_elements):
            print("Not in View")
            swipe_y = reference_top + 50 
            await tools.swipe(900, swipe_y, 100, swipe_y, duration_ms=600)
            idx_basic -= index
            idx_basic += index % (len(transition_row_elements)) + 3
            
        await tools.tap_on_index(idx_basic)
        print(f"Clicked on {idx_basic} base {index}, transition type {transition_type}")

        if all_apply:
            await tools.tap_on_index(idxApplyAll)
            ui_state = (await tools.get_state())[2]
            target_element = ""
            for elements in ui_state:
                if elements.get("resourceId", "") == "com.camerasideas.instashot:id/applyAllTextView":
                    target_element = elements
                
            if target_element:
                idxApp = target_element.get("index")
                print(f"Found Confirmation Text at Index: {idxApp}")

                bounds = target_element.get("bounds", "0,0,0,0")
                if isinstance(bounds, str):
                    coords = [int(x) for x in bounds.split(',')]
                    x1, y1, x2, y2 = coords
                    
                    # Calculate Center
                    click_x = (x1 + x2) // 2
                    click_y = (y1 + y2) // 2
                    
                    print(f"[TAP] Force Tapping 'Apply to All' at ({click_x}, {click_y})")
                    InshotTools._adb_tap(click_x, click_y)
        else:
            await tools.tap_on_index(idxApply)

        current_map = global_state.get("timeline_map")
        current_map[image1_idx-1] -= transition_time / 2
        current_map[image2_idx-1] -= transition_time / 2
        global_state.set("timeline_map", current_map)
        return f"ADB Tapped ({final_x}, {final_y}) for junction {image1_idx}-{image2_idx}."

    @staticmethod
    async def seek_toolbar(targetTool: str, tools: Tools = None):
        TOOLBAR_ID = "com.camerasideas.instashot:id/title"
        START_MARKER = "CANVAS"
        MAX_SWIPES = 8 
        
        print(f"Looking for toolbar item: '{targetTool}'")
        toolbar_y = -1 
        
        for _ in range(5):
            ui_state = (await tools.get_state())[2]
            
            found_start = False
            current_view_has_toolbar = False
            
            for el in ui_state:
                rid = el.get("resourceId", "")
                text = el.get("text", "").upper()
                if text == "Add keyframes for clips".upper():
                    continue
                
                if rid == TOOLBAR_ID:
                    current_view_has_toolbar = True
                    if toolbar_y == -1:
                        bounds = [int(x) for x in el.get("bounds", "0,0,0,0").split(',')]
                        toolbar_y = (bounds[1] + bounds[3]) // 2
                    
                    if text == targetTool.upper():
                        print(f"[FOUND] Found '{targetTool}' (during reset) at Index {el.get('index')}")
                        return el.get("index")
                    
                    if text == START_MARKER:
                        found_start = True

            if found_start:
                print("Found Start Marker (CANVAS). Ready to scan forward.")
                break 
            
            if current_view_has_toolbar and toolbar_y != -1:
                print(f"   'CANVAS' not visible. Rewinding menu (Swipe Right)...")
                await tools.swipe(200, toolbar_y, 900, toolbar_y, duration_ms=600)
                await asyncio.sleep(1.0)
            else:
                break
        
        for attempt in range(MAX_SWIPES):
            ui_state = (await tools.get_state())[2]
            found_index = -1
            
            for el in ui_state:
                rid = el.get("resourceId", "")
                text = el.get("text", "").upper()
                
                if rid == TOOLBAR_ID:
                    # Update Y cache if we missed it in Phase 1
                    if toolbar_y == -1:
                         bounds = [int(x) for x in el.get("bounds", "0,0,0,0").split(',')]
                         toolbar_y = (bounds[1] + bounds[3]) // 2

                    if text == targetTool.upper():
                        found_index = el.get("index")
                        break
            
            if found_index != -1:
                print(f"[FOUND] Found '{targetTool}' at Index {found_index}")
                return found_index
            
            if toolbar_y != -1:
                print(f"   Target not visible. Swiping menu LEFT (Row Y={toolbar_y})...")
                # Swipe Right -> Left (900 to 200) to reveal items on the RIGHT
                await tools.swipe(900, toolbar_y, 200, toolbar_y, duration_ms=600)
                await asyncio.sleep(1.0)
            else:
                return "[ERROR] Error: Toolbar row not visible."

        return f"[ERROR] Error: Tool '{targetTool}' not found after bidirectional search."

    @staticmethod
    async def change_duration(image_idx: int, duration: float, tools: Tools = None, **kwargs):
        """
        Changes the duration of a specific clip.
        Logic: Seek to clip center -> Tap clip -> Tap Duration -> Type value.
        """
        # 1. Validation & State Retrieval
        timeline_map = global_state.get("timeline_map") 
        center_coords = global_state.get("timeline_center") # [center_x, center_y]
        px_per_sec = global_state.get("px/sec")

        if not timeline_map or not center_coords: 
            return "Error: Run calibration first."

        if image_idx > len(timeline_map):
            return f"Error: Image index {image_idx} out of bounds (Max {len(timeline_map)-1})."

        midpoint = InshotTools._get_clip_midpoint(image_idx)
        await InshotTools.seek_timeline(midpoint, allowed_error=3.5, tools=tools)

        ui_state = (await tools.get_state())[2]
        current_time = InshotTools._get_current_time(ui_state)
        
        diff = current_time - midpoint
        pixel_offset = int(diff * px_per_sec)
        
        playhead_x = center_coords[0]
        theoretical_x = playhead_x - pixel_offset
        
        print(f" Seek Result: {current_time}s (Error: {diff:.2f}s)")
        print(f" Math Target: {theoretical_x} (Shifted {pixel_offset}px)")

        tap_x = theoretical_x
        best_y = center_coords[1]
            
        final_x = tap_x - 5
        final_y = best_y
        InshotTools._adb_tap(final_x, final_y)
        
        idx = await InshotTools.seek_toolbar("Duration", tools)
        await tools.tap_on_index(idx)

        ui_state = (await tools.get_state())[2]

        target_id = "com.camerasideas.instashot:id/btn_edit_duration"

        pencil_idx = -1
        for el in ui_state:
            if el.get("resourceId") == target_id:
                pencil_idx = el.get("index")
                break
        
        if pencil_idx == -1:
            return "[ERROR] Error: Pencil edit icon (btn_edit_duration) not found."
        
        print(f"[PENCIL] Tapping Pencil Edit (Index {pencil_idx})")
        await tools.tap_on_index(pencil_idx)
        await asyncio.sleep(0.1)

        ui_state = (await tools.get_state())[2]
        
        input_idx = -1
        for el in ui_state:
            if el.get("resourceId", "") == "com.camerasideas.instashot:id/edit_text":
                input_idx = el.get("index")
                break
        
        if input_idx == -1:
            return "[ERROR] Error: Duration input field not found."

        print(f"[INPUT] Entering duration: {duration}")
        await tools.input_text(str(duration), input_idx)
        
        ui_state = (await tools.get_state())[2]
        confirm_idx = -1
        for el in ui_state:
            rid = el.get("resourceId", "")
            if rid == "com.camerasideas.instashot:id/btn_ok":
                confirm_idx = el.get("index")
                break
        
        if confirm_idx != -1:
            await tools.tap_on_index(confirm_idx)
        else:
            print("[WARN] Confirm button ID not found, using fallback tap.")

        list_idx = image_idx - 1
        if 0 <= list_idx < len(timeline_map):
            print(f"[UPDATE] Updating Internal Map: Clip {image_idx} changed from {timeline_map[list_idx]}s to {duration}s")
            timeline_map[list_idx] = float(duration)
            global_state.set("timeline_map", timeline_map)
        
        await asyncio.sleep(0.5)
        apply_id = "com.camerasideas.instashot:id/btn_apply"
        ui_state = (await tools.get_state())[2]
        confirm_idx = -1
        for el in ui_state:
            rid = el.get("resourceId", "")
            if rid == apply_id:
                confirm_idx = el.get("index")
                break
        
        await tools.tap_on_index(confirm_idx)
        await asyncio.sleep(0.5)
        
        midpoint = InshotTools._get_clip_midpoint(image_idx)
        await InshotTools.seek_timeline(midpoint, allowed_error=3.5, tools=tools)
        ui_state = (await tools.get_state())[2]
        current_time = InshotTools._get_current_time(ui_state)
        
        diff = current_time - midpoint
        pixel_offset = int(diff * px_per_sec)
        
        playhead_x = center_coords[0]
        theoretical_x = playhead_x - pixel_offset
        tap_x = theoretical_x
        best_y = center_coords[1]
            
        final_x = tap_x - 5
        final_y = best_y
        InshotTools._adb_tap(final_x, final_y)

        return f"[DONE] Changed clip {image_idx} duration to {duration}s."

    @staticmethod
    async def apply_effect(image_idx: int, effects_list: list[str], tools: Tools = None, **kwargs):
        timeline_map = global_state.get("timeline_map") 
        center_coords = global_state.get("timeline_center")
        px_per_sec = global_state.get("px/sec")

        if not timeline_map or not center_coords: 
            return "[ERROR] Error: Run calibration first."

        if image_idx > len(timeline_map):
            return f"[ERROR] Error: Image index {image_idx} out of bounds (Max {len(timeline_map)-1})."

        midpoint = InshotTools._get_clip_midpoint(image_idx)
        await InshotTools.seek_timeline(midpoint, allowed_error=3.5, tools=tools)

        ui_state = (await tools.get_state())[2]
        current_time = InshotTools._get_current_time(ui_state)
        
        diff = current_time - midpoint
        pixel_offset = int(diff * px_per_sec)
        
        playhead_x = center_coords[0]
        theoretical_x = playhead_x - pixel_offset
        
        print(f"[SEEK] Seek Result: {current_time}s (Error: {diff:.2f}s)")
        print(f"[MATH] Math Target: {theoretical_x} (Shifted {pixel_offset}px)")

        tap_x = theoretical_x
        best_y = center_coords[1]
            
        final_x = tap_x - 5
        final_y = best_y
        InshotTools._adb_tap(final_x, final_y)

        with open("effects.json", "r") as f:
            effects_map = json.load(f)["Effects"]

        idx = await InshotTools.seek_toolbar("Effect", tools)
        await tools.tap_on_index(idx)

        for effects in effects_list:

            start_time, end_time = InshotTools._get_clip_range(image_idx)
            print(f"[SEEK] Seeking to Clip Start: {start_time}s")
            actual_start_time = await InshotTools.seek_timeline(start_time, allowed_error=0.25, tools=tools)

            effect_idx = await InshotTools._find_node_by_id(tools, "com.camerasideas.instashot:id/btn_add_effect")
            await tools.tap_on_index(effect_idx)

            target_effect_lower = effects.lower()
            
            target_group = None
            real_effect_name = None
            
            for k, v in effects_map.items():
                if k.lower() == target_effect_lower:
                    target_group = v
                    real_effect_name = k
                    break
            
            if not target_group:
                return f"[ERROR] Error: Effect '{effects}' not found in effects.json definition."

            print(f"[EFFECT] Effect '{real_effect_name}' belongs to Group '{target_group}'")

            group_anchor = None
            for k, v in effects_map.items():
                if v == target_group:
                    group_anchor = k
                    break

            print(f"[SEEK] Seeking Group: {target_group}")
            group_found = await InshotTools._seek_and_select_text(
                tools=tools, 
                target_text=target_group, 
                anchor_text="Basic"
            )
            
            if not group_found:
                return f"[ERROR] Error: Effect Group '{target_group}' not found in UI."
                
            print(f"[SEEK] Seeking Effect: {real_effect_name}")
            
            effect_found = await InshotTools._seek_and_select_text(
                tools=tools, 
                target_text=real_effect_name, 
                anchor_text=group_anchor,
                swipe_area="content"
            )
            
            if not effect_found:
                return f"[ERROR] Error: Effect '{real_effect_name}' not found inside group '{target_group}'."

            confirm_idx = await InshotTools._find_node_by_id(tools, "com.camerasideas.instashot:id/btn_apply")
            await tools.tap_on_index(confirm_idx)
            ui_state = (await tools.get_state())[2]
            
            effect_label_idx = -1
            for el in ui_state:
                if el.get("text", "").lower() == real_effect_name.lower():
                    effect_label_idx = el.get("index")
                    break
            
            if effect_label_idx == -1:
                return f"[WARN] Warning: Applied effect but could not find label '{real_effect_name}' to extend it."

            parent_idx = effect_label_idx - 2
            parent_element = None
            for el in ui_state:
                if el.get("index") == parent_idx:
                    parent_element = el
                    break
            
            if parent_element:
                bounds = [int(x) for x in parent_element.get("bounds", "0,0,0,0").split(',')]
                right_edge = bounds[2]
                top = bounds[1]
                bottom = bounds[3]
                
                mid_y = (top + bottom) // 2
                tap_x = right_edge + 5
                
                if end_time - start_time > 3.5: 
                    print(f"[TAP] Tapping Right Handle at ({tap_x}, {mid_y})")
                    InshotTools._adb_tap(tap_x, mid_y)
                    ui_state = (await tools.get_state())[2]
                    clip_end_idx = await InshotTools._find_node_by_id(tools, "com.camerasideas.instashot:id/textClipEnd", return_element=True)
                    print(f"Tapping on {clip_end_idx.get("index")}")
                    bounds = [int(x) for x in clip_end_idx.get("bounds", "0,0,0,0").split(',')]
                    InshotTools._adb_tap((bounds[0] + bounds[2])/2, (bounds[1] + bounds[3])/2)
                else:
                    print(f"[DRAG] Short Clip ({end_time - start_time:.1f}s). Using precision drag.")
                    await InshotTools._drag_gesture(tools, tap_x, mid_y, actual_start_time, end_time)
            else:
                print(f"[WARN] Parent element (Index {parent_idx}) not found. Skipping extension.")

            print(f"[DONE] Applied effect '{real_effect_name}' and extended to full clip.")

        ui_state = (await tools.get_state())[2]
        final_apply_idx = await InshotTools._find_node_by_id(tools, "com.camerasideas.instashot:id/btn_apply")
        await tools.tap_on_index(final_apply_idx)

        return f"Done Applying Effects"

    @staticmethod
    async def apply_animation(image_idx: int, animation_name: str, animation_type: str, tools: Tools = None, **kwargs):
        timeline_map = global_state.get("timeline_map") 
        center_coords = global_state.get("timeline_center")
        px_per_sec = global_state.get("px/sec")

        midpoint = InshotTools._get_clip_midpoint(image_idx)
        await InshotTools.seek_timeline(midpoint, allowed_error=3.5, tools=tools)

        ui_state = (await tools.get_state())[2]
        current_time = InshotTools._get_current_time(ui_state)
        
        diff = current_time - midpoint
        pixel_offset = int(diff * px_per_sec)
        
        playhead_x = center_coords[0]
        theoretical_x = playhead_x - pixel_offset
        
        print(f"[SEEK] Seek Result: {current_time}s (Error: {diff:.2f}s)")
        print(f"[MATH] Math Target: {theoretical_x} (Shifted {pixel_offset}px)")

        tap_x = theoretical_x
        best_y = center_coords[1]
            
        final_x = tap_x - 5
        final_y = best_y
        InshotTools._adb_tap(final_x, final_y)

        idx = await InshotTools.seek_toolbar("Animation", tools)
        await tools.tap_on_index(idx)

        IN_ID = "com.camerasideas.instashot:id/in_text"
        OUT_ID = "com.camerasideas.instashot:id/out_text"
        COMBO_ID = "com.camerasideas.instashot:id/combo_text"

        EFFECT_ID = "com.camerasideas.instashot:id/name"

        with open("animations.json", "r") as f:
            animations = json.load(f)

        if animation_type == "IN":
            target_id = await InshotTools._find_node_by_id(tools, IN_ID, True)
            bounds = [int(x) for x in target_id.get("bounds", "0,0,0,0").split(',')]

            InshotTools._adb_tap((bounds[0] + bounds[2]) / 2, (bounds[1] + bounds[3]) / 2)

        if animation_type == "OUT":
            target_id = await InshotTools._find_node_by_id(tools, OUT_ID,True)
            bounds = [int(x) for x in target_id.get("bounds", "0,0,0,0").split(',')]

            InshotTools._adb_tap((bounds[0] + bounds[2]) / 2, (bounds[1] + bounds[3]) / 2)

        if animation_type == "COMBO":
            print("COMBO")
            target_id = await InshotTools._find_node_by_id(tools, COMBO_ID, True)
            bounds = [int(x) for x in target_id.get("bounds", "0,0,0,0").split(',')]

            InshotTools._adb_tap((bounds[0] + bounds[2]) / 2, (bounds[1] + bounds[3]) / 2)

            # await tools.tap_on_index(target_id)
        
        await InshotTools._seek_and_select_text(tools, animation_name, animations[animation_type.upper()][0], "content")

        confirm_idx = await InshotTools._find_node_by_id(tools, "com.camerasideas.instashot:id/btn_apply")
        await tools.tap_on_index(confirm_idx)

        midpoint = InshotTools._get_clip_midpoint(image_idx)
        await InshotTools.seek_timeline(midpoint, allowed_error=3.5, tools=tools)
        ui_state = (await tools.get_state())[2]
        current_time = InshotTools._get_current_time(ui_state)
        
        diff = current_time - midpoint
        pixel_offset = int(diff * px_per_sec)
        
        playhead_x = center_coords[0]
        theoretical_x = playhead_x - pixel_offset
        tap_x = theoretical_x
        best_y = center_coords[1]
            
        final_x = tap_x - 5
        final_y = best_y
        InshotTools._adb_tap(final_x, final_y)
    
    @staticmethod
    async def add_music_effects(start_time: int, music_name: str, tools: Tools = None, **kwargs):
        timeline_map = global_state.get("timeline_map") 
        center_coords = global_state.get("timeline_center")
        px_per_sec = global_state.get("px/sec")

        if not timeline_map or not center_coords: 
            return "[ERROR] Error: Run calibration first."
        
        idx = await InshotTools.seek_toolbar("Audio", tools)
        await tools.tap_on_index(idx)

        actual_start_time = await InshotTools.seek_timeline(start_time, allowed_error=0.25, tools=tools)

        with open("music.json", "r") as f:
            music_effects = json.load(f)

        effect = music_effects.get(music_name.lower())

        add_effect_id = await InshotTools._find_node_by_id(tools, "com.camerasideas.instashot:id/btn_add_effect")
        await tools.tap_on_index(add_effect_id)

        await asyncio.sleep(0.5)

        await InshotTools._seek_and_select_vertical(tools, music_name.lower())

        add_el = await InshotTools._find_node_by_id(tools, "com.camerasideas.instashot:id/effect_use_tv", True)
        bounds = [int(x) for x in add_el.get("bounds", "0,0,0,0").split(',')]

        InshotTools._adb_tap((bounds[0] + bounds[2]) / 2, (bounds[1] + bounds[3]) / 2)

        confirm_idx = await InshotTools._find_node_by_id(tools, "com.camerasideas.instashot:id/btn_apply")
        await tools.tap_on_index(confirm_idx)

    @staticmethod
    async def add_background_music(audio_name, tools: Tools = None, **kwargs):
        idx = await InshotTools.seek_toolbar("Audio", tools)
        await tools.tap_on_index(idx)

        actual_start_time = await InshotTools.seek_timeline(0, allowed_error=0.25, tools=tools)

        add_music_id = await InshotTools._find_node_by_id(tools, "com.camerasideas.instashot:id/btn_add_track")
        await tools.tap_on_index(add_music_id)
        await asyncio.sleep(0.5)


        await InshotTools._seek_and_select_vertical(tools, audio_name.lower())

        add_el = await InshotTools._find_node_by_id(tools, "com.camerasideas.instashot:id/music_use_tv", True)
        bounds = [int(x) for x in add_el.get("bounds", "0,0,0,0").split(',')]

        InshotTools._adb_tap((bounds[0] + bounds[2]) / 2, (bounds[1] + bounds[3]) / 2)

        confirm_idx = await InshotTools._find_node_by_id(tools, "com.camerasideas.instashot:id/btn_apply")
        await tools.tap_on_index(confirm_idx)
