'use client';

import { useRef, useState } from 'react';
import { Music, Clock, Play, Pause, Volume2 } from 'lucide-react';
import { FinalMusicSelection } from '@/types/agent';

interface SelectedMusicProps {
    selection: FinalMusicSelection;
}

export function SelectedMusic({ selection }: SelectedMusicProps) {
    const duration = selection.end_time_seconds - selection.start_time_seconds;
    const startPercent = (selection.start_time_seconds / 60) * 100; // Assuming 60s max
    const durationPercent = (duration / 60) * 100;

    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);

    const togglePlay = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
        }
    };

    const handleEnded = () => {
        setIsPlaying(false);
        setCurrentTime(0);
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="rounded-xl bg-[#111118] border border-[#1f1f28] overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-[#1f1f28]">
                <div className="p-2 rounded-lg bg-gradient-to-br from-[#22c55e] to-[#16a34a] glow-green">
                    <Music className="w-4 h-4 text-black" />
                </div>
                <span className="font-semibold text-white">Selected Track</span>
                <span className="ml-auto px-2 py-0.5 rounded-full bg-[#22c55e]/10 text-[#22c55e] text-xs font-medium">
                    Final Choice
                </span>
            </div>

            <div className="p-5 space-y-4">
                {/* Track Info & Play Button */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-[#0d0d12] border border-[#27272a]">
                    {selection.trimmed_audio_url ? (
                        <button
                            onClick={togglePlay}
                            className="p-3 rounded-lg bg-[#22c55e] hover:bg-[#16a34a] transition-colors"
                        >
                            {isPlaying ? (
                                <Pause className="w-5 h-5 text-black" />
                            ) : (
                                <Play className="w-5 h-5 text-black" />
                            )}
                        </button>
                    ) : (
                        <div className="p-2 rounded-lg bg-[#22c55e]/10">
                            <Play className="w-4 h-4 text-[#22c55e]" />
                        </div>
                    )}
                    <div className="flex-1">
                        <p className="text-sm font-medium text-white">{selection.selected_track_filename}</p>
                        <p className="text-xs text-[#71717a]">
                            {selection.trimmed_duration_seconds
                                ? `${selection.trimmed_duration_seconds.toFixed(1)}s trimmed clip`
                                : `${duration.toFixed(1)}s clip`
                            }
                        </p>
                    </div>
                    {selection.trimmed_audio_url && (
                        <div className="flex items-center gap-2 text-xs text-[#71717a]">
                            <Volume2 className="w-4 h-4" />
                            <span>{formatTime(currentTime)}</span>
                        </div>
                    )}
                </div>

                {/* Audio Player (hidden element) */}
                {selection.trimmed_audio_url && (
                    <audio
                        ref={audioRef}
                        src={selection.trimmed_audio_url}
                        onTimeUpdate={handleTimeUpdate}
                        onEnded={handleEnded}
                    />
                )}

                {/* Playback Progress Bar */}
                {selection.trimmed_audio_url && selection.trimmed_duration_seconds && (
                    <div className="space-y-1">
                        <div className="relative h-2 rounded-full bg-[#1f1f28] overflow-hidden">
                            <div
                                className="absolute h-full bg-gradient-to-r from-[#22c55e] to-[#16a34a] rounded-full transition-all duration-100"
                                style={{
                                    width: `${(currentTime / selection.trimmed_duration_seconds) * 100}%`,
                                }}
                            />
                        </div>
                        <div className="flex justify-between text-[10px] text-[#52525b]">
                            <span>{formatTime(currentTime)}</span>
                            <span>{formatTime(selection.trimmed_duration_seconds)}</span>
                        </div>
                    </div>
                )}

                {/* Time Range Visualization */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-[#71717a]">
                        <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Original Timeline
                        </span>
                        <span>{selection.start_time_seconds}s - {selection.end_time_seconds}s</span>
                    </div>

                    <div className="relative h-3 rounded-full bg-[#1f1f28] overflow-hidden">
                        {/* Full track background */}
                        <div className="absolute inset-0 bg-[#27272a] opacity-50" />

                        {/* Selected range */}
                        <div
                            className="absolute h-full bg-gradient-to-r from-[#22c55e] to-[#16a34a] rounded-full glow-green"
                            style={{
                                left: `${startPercent}%`,
                                width: `${Math.min(durationPercent, 100 - startPercent)}%`,
                            }}
                        />

                        {/* Start marker */}
                        <div
                            className="absolute top-0 w-0.5 h-full bg-white"
                            style={{ left: `${startPercent}%` }}
                        />
                    </div>

                    <div className="flex justify-between text-[10px] text-[#52525b]">
                        <span>0:00</span>
                        <span>0:30</span>
                        <span>1:00</span>
                    </div>
                </div>

                {/* Director's Reasoning */}
                <div className="p-3 rounded-lg bg-[#0d0d12] border border-[#27272a]">
                    <p className="text-xs text-[#a1a1aa] leading-relaxed">
                        {selection.thought_process}
                    </p>
                </div>
            </div>
        </div>
    );
}

