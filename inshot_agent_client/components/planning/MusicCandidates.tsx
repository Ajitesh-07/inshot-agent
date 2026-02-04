'use client';

import { Music, Check } from 'lucide-react';
import { MusicTrack } from '@/types/agent';

interface MusicCandidatesProps {
    thoughtProcess: string;
    tracks: MusicTrack[];
    selectedTrack?: string;
}

export function MusicCandidates({ thoughtProcess, tracks, selectedTrack }: MusicCandidatesProps) {
    return (
        <div className="rounded-xl bg-[#111118] border border-[#1f1f28] overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-[#1f1f28]">
                <div className="p-2 rounded-lg bg-gradient-to-br from-[#f59e0b] to-[#d97706]">
                    <Music className="w-4 h-4 text-black" />
                </div>
                <span className="font-semibold text-white">Music Candidates</span>
            </div>

            {/* Thought Process */}
            <div className="px-5 pt-4">
                <p className="text-sm text-[#a1a1aa] leading-relaxed line-clamp-3">
                    {thoughtProcess}
                </p>
            </div>

            {/* Track Cards */}
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                {tracks.map((track, idx) => {
                    const isSelected = selectedTrack === track.track_name;

                    return (
                        <div
                            key={idx}
                            className={`
                relative p-4 rounded-lg border transition-all duration-300
                ${isSelected
                                    ? 'bg-[#22c55e]/10 border-[#22c55e]/50 glow-green'
                                    : 'bg-[#0d0d12] border-[#27272a] hover:border-[#3f3f46]'
                                }
              `}
                        >
                            {/* Selected Badge */}
                            {isSelected && (
                                <div className="absolute -top-2 -right-2 p-1 rounded-full bg-[#22c55e]">
                                    <Check className="w-3 h-3 text-black" />
                                </div>
                            )}

                            {/* Track Info */}
                            <div className="flex items-start gap-3">
                                <div className="p-2 rounded-lg bg-[#1f1f28] flex-shrink-0">
                                    <Music className={`w-5 h-5 ${isSelected ? 'text-[#22c55e]' : 'text-[#71717a]'}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-semibold text-white truncate">{track.track_name}</h4>
                                    <p className="text-sm text-[#71717a]">{track.artist_name}</p>
                                </div>
                            </div>

                            {/* Vibe Tags */}
                            <div className="flex flex-wrap gap-1.5 mt-3">
                                {track.vibe.split(',').map((tag, i) => (
                                    <span
                                        key={i}
                                        className="px-2 py-0.5 text-xs rounded-full bg-[#a855f7]/10 text-[#a855f7] border border-[#a855f7]/20"
                                    >
                                        {tag.trim()}
                                    </span>
                                ))}
                            </div>

                            {/* Reasoning */}
                            <p className="mt-3 text-xs text-[#71717a] line-clamp-2">
                                {track.reasoning}
                            </p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
