'use client';

import { AgentState, UploadedImage } from '@/types/agent';
import { PhaseIndicator } from './PhaseIndicator';
import { PlanningProgress } from './planning/PlanningProgress';
import { DirectorThoughts } from './planning/DirectorThoughts';
import { VisualPlanTimeline } from './planning/VisualPlanTimeline';
import { MusicCandidates } from './planning/MusicCandidates';
import { SelectedMusic } from './planning/SelectedMusic';
import { TokenUsage } from './planning/TokenUsage';
import { ExecutionLog } from './editing/ExecutionLog';
import { ExecutionStatus } from './editing/ExecutionStatus';
import { ImageStatusGrid } from './editing/ImageStatusGrid';
import { VideoPreview } from './VideoPreview';
import { Play, Download, RotateCcw, CheckCircle, Clock, Sparkles, Music, Brain, Scissors } from 'lucide-react';
import { Button } from './ui/Button';

interface AgentWorkflowProps {
    state: AgentState;
    images: UploadedImage[];
    onReset?: () => void;
    viewPhase?: 'planning' | 'editing' | 'done' | null;
    onViewPhaseChange?: (phase: 'planning' | 'editing' | 'done' | null) => void;
    planningStep?: 'connecting' | 'visual_plan' | 'music_plan' | 'downloading' | 'final_plan' | 'complete';
    downloadProgress?: number;
    progressMessage?: string;
    usageData?: { usageBreakdown: any; pricing: any } | null;
    executionStep?: 'idle' | 'uploading_images' | 'uploading_audio' | 'selecting_images' | 'executing_plan' | 'complete';
    executionMessage?: string;
    executionLogs?: string[];
}

export function AgentWorkflow({
    state,
    images,
    onReset,
    viewPhase,
    onViewPhaseChange,
    planningStep = 'connecting',
    downloadProgress = 0,
    progressMessage = '',
    usageData = null,
    executionStep = 'idle',
    executionMessage = '',
    executionLogs = [],
}: AgentWorkflowProps) {
    const { phase, planning, editing, done } = state;

    // Use viewPhase for display if provided and workflow allows navigation, otherwise use current phase
    const canNavigate = phase === 'editing' || phase === 'done';
    const displayPhase = (canNavigate && viewPhase) ? viewPhase : phase;

    // Check if planning is still in progress (not all data received yet)
    const isPlanningInProgress = phase === 'planning' && planningStep !== 'complete';

    // Idle state
    if (phase === 'idle') {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] rounded-xl bg-[#111118] border border-[#1f1f28]">
                <div className="p-4 rounded-full bg-[#1f1f28] mb-4">
                    <Play className="w-8 h-8 text-[#52525b]" />
                </div>
                <h3 className="text-lg font-medium text-[#e4e4e7] mb-2">Ready to Create</h3>
                <p className="text-sm text-[#71717a] text-center max-w-sm">
                    Upload images, describe your edit style, then click &quot;Start Agent&quot; to begin the magic.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Phase Indicator - Clickable when done */}
            {canNavigate ? (
                <div className="flex items-center justify-center gap-2 p-4 rounded-xl bg-[#111118] border border-[#1f1f28]">
                    <button
                        onClick={() => onViewPhaseChange?.('planning')}
                        className={`flex flex-col items-center gap-2 px-4 py-2 rounded-lg transition-all ${displayPhase === 'planning'
                            ? 'bg-[#22c55e]/10 border border-[#22c55e]/30'
                            : 'hover:bg-[#1f1f28]'
                            }`}
                    >
                        <div className={`p-2 rounded-full ${displayPhase === 'planning' ? 'bg-[#22c55e] glow-green' : 'bg-[#22c55e]/20 border-2 border-[#22c55e]'}`}>
                            <Brain className={`w-4 h-4 ${displayPhase === 'planning' ? 'text-black' : 'text-[#22c55e]'}`} />
                        </div>
                        <span className={`text-xs font-medium ${displayPhase === 'planning' ? 'text-[#22c55e]' : 'text-[#a1a1aa]'}`}>Planning</span>
                    </button>

                    <div className="w-8 h-0.5 bg-[#22c55e]" />

                    <button
                        onClick={() => onViewPhaseChange?.('editing')}
                        className={`flex flex-col items-center gap-2 px-4 py-2 rounded-lg transition-all ${displayPhase === 'editing'
                            ? 'bg-[#22c55e]/10 border border-[#22c55e]/30'
                            : 'hover:bg-[#1f1f28]'
                            }`}
                    >
                        <div className={`p-2 rounded-full ${displayPhase === 'editing' ? 'bg-[#22c55e] glow-green' : 'bg-[#22c55e]/20 border-2 border-[#22c55e]'}`}>
                            <Scissors className={`w-4 h-4 ${displayPhase === 'editing' ? 'text-black' : 'text-[#22c55e]'}`} />
                        </div>
                        <span className={`text-xs font-medium ${displayPhase === 'editing' ? 'text-[#22c55e]' : 'text-[#a1a1aa]'}`}>Editing</span>
                    </button>

                    <div className="w-8 h-0.5 bg-[#22c55e]" />

                    <button
                        onClick={() => onViewPhaseChange?.('done')}
                        className={`flex flex-col items-center gap-2 px-4 py-2 rounded-lg transition-all ${displayPhase === 'done'
                            ? 'bg-[#22c55e]/10 border border-[#22c55e]/30'
                            : 'hover:bg-[#1f1f28]'
                            }`}
                    >
                        <div className={`p-2 rounded-full ${displayPhase === 'done' ? 'bg-[#22c55e] glow-green' : 'bg-[#22c55e]/20 border-2 border-[#22c55e]'}`}>
                            <CheckCircle className={`w-4 h-4 ${displayPhase === 'done' ? 'text-black' : 'text-[#22c55e]'}`} />
                        </div>
                        <span className={`text-xs font-medium ${displayPhase === 'done' ? 'text-[#22c55e]' : 'text-[#a1a1aa]'}`}>Done</span>
                    </button>
                </div>
            ) : (
                <PhaseIndicator currentPhase={phase} />
            )}

            {/* Planning Phase */}
            {displayPhase === 'planning' && (
                <div className="space-y-4 animate-in fade-in duration-500">
                    {/* Progress indicator during planning */}
                    {isPlanningInProgress && (
                        <PlanningProgress
                            currentStep={planningStep}
                            downloadProgress={downloadProgress}
                            message={progressMessage}
                        />
                    )}

                    {/* Director Thoughts - show when visual plan is available */}
                    {planning.visualPlan && (
                        <DirectorThoughts
                            thoughtProcess={planning.visualPlan.thought_process}
                            musicThoughts={planning.visualPlan.music_thoughts}
                        />
                    )}

                    {/* Visual Plan Timeline */}
                    {planning.visualPlan && (
                        <VisualPlanTimeline actions={planning.visualPlan.plan} />
                    )}

                    {/* Music Candidates */}
                    {planning.musicCandidates && (
                        <MusicCandidates
                            thoughtProcess={planning.musicCandidates.thought_process}
                            tracks={planning.musicCandidates.tracks}
                            selectedTrack={planning.selectedMusic?.selected_track_filename?.replace('.mp3', '')}
                        />
                    )}

                    {/* Selected Music */}
                    {planning.selectedMusic && (
                        <SelectedMusic selection={planning.selectedMusic} />
                    )}

                    {/* Token Usage & Pricing - show when planning is complete */}
                    {usageData && usageData.usageBreakdown && usageData.pricing && (
                        <TokenUsage
                            usageBreakdown={usageData.usageBreakdown}
                            pricing={usageData.pricing}
                        />
                    )}
                </div>
            )}

            {/* Editing Phase */}
            {displayPhase === 'editing' && (
                <div className="space-y-4 animate-in fade-in duration-500">
                    {/* Execution Status */}
                    <ExecutionStatus
                        step={executionStep}
                        message={executionMessage}
                        logs={executionLogs}
                    />

                    {/* Image Status Grid */}
                    {images.length > 0 && (
                        <ImageStatusGrid
                            images={images}
                            activeImageIndex={
                                phase === 'editing'
                                    ? editing.executedSteps.find(s => s.status === 'running')?.action.args.image_idx || null
                                    : null
                            }
                        />
                    )}
                </div>
            )}

            {/* Done Phase */}
            {displayPhase === 'done' && (
                <div className="space-y-4 animate-in fade-in duration-500">
                    {/* Success Banner */}
                    <div className="flex items-center gap-4 px-4 py-3 rounded-lg bg-[#22c55e]/10 border border-[#22c55e]/30">
                        <CheckCircle className="w-5 h-5 text-[#22c55e]" />
                        <span className="text-sm font-medium text-[#22c55e]">Video processing complete!</span>
                    </div>

                    {/* Video Preview */}
                    <VideoPreview isPlaying={false} streamUrl={done.videoUrl || undefined} />

                    {/* Summary Card */}
                    {done.summary && (
                        <div className="p-5 rounded-xl bg-[#111118] border border-[#1f1f28]">
                            <h3 className="font-semibold text-white mb-4">Edit Summary</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="p-3 rounded-lg bg-[#0d0d12] border border-[#27272a]">
                                    <Clock className="w-4 h-4 text-[#3b82f6] mb-2" />
                                    <p className="text-lg font-bold text-white">{done.summary.totalDuration}s</p>
                                    <p className="text-xs text-[#71717a]">Duration</p>
                                </div>
                                <div className="p-3 rounded-lg bg-[#0d0d12] border border-[#27272a]">
                                    <Sparkles className="w-4 h-4 text-[#a855f7] mb-2" />
                                    <p className="text-lg font-bold text-white">{done.summary.effectsCount}</p>
                                    <p className="text-xs text-[#71717a]">Effects</p>
                                </div>
                                <div className="p-3 rounded-lg bg-[#0d0d12] border border-[#27272a]">
                                    <Play className="w-4 h-4 text-[#f59e0b] mb-2" />
                                    <p className="text-lg font-bold text-white">{done.summary.transitionsCount}</p>
                                    <p className="text-xs text-[#71717a]">Transitions</p>
                                </div>
                                <div className="p-3 rounded-lg bg-[#0d0d12] border border-[#27272a]">
                                    <Music className="w-4 h-4 text-[#22c55e] mb-2" />
                                    <p className="text-sm font-bold text-white truncate">{done.summary.trackUsed}</p>
                                    <p className="text-xs text-[#71717a]">Track</p>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 mt-4">
                                <Button variant="primary" className="flex-1">
                                    <Download className="w-4 h-4" />
                                    Download Video
                                </Button>
                                <Button variant="outline" onClick={onReset}>
                                    <RotateCcw className="w-4 h-4" />
                                    New Edit
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
