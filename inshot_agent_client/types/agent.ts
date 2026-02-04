// Types for the Agent Workflow

export interface VisualPlanAction {
    tool: 'change_duration' | 'apply_effect' | 'apply_animation' | 'add_transition';
    args: {
        image_idx?: number;
        image1_idx?: number;
        image2_idx?: number;
        duration?: number;
        effects_list?: string[];
        animation_name?: string;
        animation_type?: 'IN' | 'OUT' | 'COMBO';
        transition_type?: string;
        all_apply?: boolean;
    };
}

export interface VisualPlan {
    thought_process: string;
    music_thoughts: string;
    plan: VisualPlanAction[];
}

export interface MusicTrack {
    track_name: string;
    artist_name: string;
    vibe: string;
    reasoning: string;
}

export interface MusicCandidatesResponse {
    thought_process: string;
    tracks: MusicTrack[];
}

export interface FinalMusicSelection {
    thought_process: string;
    selected_track_filename: string;
    start_time_seconds: number;
    end_time_seconds: number;
    trimmed_audio_url?: string;
    trimmed_duration_seconds?: number;
}

export interface TrackDurations {
    [filename: string]: number | null;
}

export interface ExecutedStep {
    id: string;
    action: VisualPlanAction;
    status: 'pending' | 'running' | 'done' | 'error';
    timestamp?: string;
}

export interface VideoSummary {
    totalDuration: number;
    effectsCount: number;
    transitionsCount: number;
    trackUsed: string;
}

export interface AgentState {
    phase: 'idle' | 'planning' | 'editing' | 'done';
    planningSubPhase: 'visual-plan' | 'music-candidates' | 'music-selection' | null;
    planning: {
        visualPlan: VisualPlan | null;
        musicCandidates: MusicCandidatesResponse | null;
        selectedMusic: FinalMusicSelection | null;
    };
    editing: {
        currentStep: number;
        totalSteps: number;
        executedSteps: ExecutedStep[];
    };
    done: {
        videoUrl: string | null;
        summary: VideoSummary | null;
    };
}

export interface UploadedImage {
    id: string;
    file: File;
    preview: string;
    appliedEffects: string[];
    appliedAnimations: string[];
}
