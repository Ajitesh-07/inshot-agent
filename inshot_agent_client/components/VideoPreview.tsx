'use client';

import { Play, Video } from 'lucide-react';

interface VideoPreviewProps {
    isPlaying?: boolean;
    streamUrl?: string;
}

export function VideoPreview({ isPlaying = false, streamUrl }: VideoPreviewProps) {
    return (
        <div className="relative w-full rounded-xl overflow-hidden gradient-border">
            {/* 16:9 Aspect Ratio Container */}
            <div className="relative w-full pt-[56.25%] bg-[#0a0a0f]">
                {streamUrl ? (
                    <video
                        src={streamUrl}
                        className="absolute inset-0 w-full h-full object-cover"
                        autoPlay
                        muted
                        loop
                    />
                ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#0d0d12] to-[#111118]">
                        {/* Grid Pattern */}
                        <div
                            className="absolute inset-0 opacity-5"
                            style={{
                                backgroundImage: `
                  linear-gradient(rgba(34, 197, 94, 0.3) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(34, 197, 94, 0.3) 1px, transparent 1px)
                `,
                                backgroundSize: '40px 40px',
                            }}
                        />

                        {/* Play Button */}
                        <div className={`
              relative z-10 p-6 rounded-full transition-all duration-300
              ${isPlaying
                                ? 'bg-[#22c55e]/20 glow-green'
                                : 'bg-[#1f1f28] hover:bg-[#27272a]'
                            }
            `}>
                            {isPlaying ? (
                                <Video className="w-12 h-12 text-[#22c55e]" />
                            ) : (
                                <Play className="w-12 h-12 text-[#71717a]" />
                            )}
                        </div>

                        {/* Status Text */}
                        <p className="relative z-10 mt-4 text-sm text-[#52525b]">
                            {isPlaying ? 'Processing video...' : 'Video preview will appear here'}
                        </p>

                        {/* Scan Lines Effect */}
                        <div className="absolute inset-0 scanlines opacity-30" />
                    </div>
                )}

                {/* Recording Indicator */}
                {isPlaying && (
                    <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0a0a0f]/80 border border-[#27272a]">
                        <div className="w-2 h-2 rounded-full bg-[#ef4444] animate-pulse" />
                        <span className="text-xs font-medium text-[#e4e4e7]">LIVE</span>
                    </div>
                )}

                {/* Corner Decorations */}
                <div className="absolute top-0 left-0 w-8 h-8 border-l-2 border-t-2 border-[#22c55e]/30" />
                <div className="absolute top-0 right-0 w-8 h-8 border-r-2 border-t-2 border-[#22c55e]/30" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-l-2 border-b-2 border-[#22c55e]/30" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-r-2 border-b-2 border-[#22c55e]/30" />
            </div>
        </div>
    );
}
