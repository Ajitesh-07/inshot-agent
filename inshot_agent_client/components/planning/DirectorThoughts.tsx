'use client';

import { useState } from 'react';
import { Brain, Music, ChevronDown, ChevronUp } from 'lucide-react';

interface DirectorThoughtsProps {
    thoughtProcess: string;
    musicThoughts: string;
}

export function DirectorThoughts({ thoughtProcess, musicThoughts }: DirectorThoughtsProps) {
    const [isExpanded, setIsExpanded] = useState(true);

    return (
        <div className="rounded-xl bg-[#111118] border border-[#1f1f28] overflow-hidden">
            {/* Header */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#18181b] transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-[#a855f7] to-[#7c3aed]">
                        <Brain className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-semibold text-white">Director&apos;s Analysis</span>
                </div>
                {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-[#71717a]" />
                ) : (
                    <ChevronDown className="w-5 h-5 text-[#71717a]" />
                )}
            </button>

            {/* Content */}
            {isExpanded && (
                <div className="px-5 pb-5 space-y-4">
                    {/* Thought Process */}
                    <div className="p-4 rounded-lg bg-[#0d0d12] border border-[#27272a]">
                        <div className="flex items-center gap-2 mb-3">
                            <Brain className="w-4 h-4 text-[#a855f7]" />
                            <span className="text-sm font-medium text-[#a1a1aa]">Visual Strategy</span>
                        </div>
                        <p className="text-sm text-[#e4e4e7] leading-relaxed">
                            {thoughtProcess}
                        </p>
                    </div>

                    {/* Music Thoughts */}
                    <div className="p-4 rounded-lg bg-[#0d0d12] border border-[#27272a]">
                        <div className="flex items-center gap-2 mb-3">
                            <Music className="w-4 h-4 text-[#22c55e]" />
                            <span className="text-sm font-medium text-[#a1a1aa]">Music Recommendations</span>
                        </div>
                        <p className="text-sm text-[#e4e4e7] leading-relaxed">
                            {musicThoughts}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
