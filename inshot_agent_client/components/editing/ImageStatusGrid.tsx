'use client';

import { Sparkles, Film, Clock } from 'lucide-react';
import { UploadedImage } from '@/types/agent';

interface ImageStatusGridProps {
    images: UploadedImage[];
    activeImageIndex: number | null;
}

export function ImageStatusGrid({ images, activeImageIndex }: ImageStatusGridProps) {
    return (
        <div className="rounded-xl bg-[#111118] border border-[#1f1f28] overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b border-[#1f1f28]">
                <span className="font-semibold text-white">Image Status</span>
            </div>

            {/* Grid */}
            <div className="p-4 grid grid-cols-4 gap-3">
                {images.map((image, idx) => {
                    const isActive = activeImageIndex === idx + 1;
                    const hasEffects = image.appliedEffects.length > 0;
                    const hasAnimations = image.appliedAnimations.length > 0;

                    return (
                        <div
                            key={image.id}
                            className={`
                relative aspect-square rounded-lg overflow-hidden
                transition-all duration-300
                ${isActive
                                    ? 'ring-2 ring-[#22c55e] ring-offset-2 ring-offset-[#111118] glow-green'
                                    : 'border border-[#27272a]'
                                }
              `}
                        >
                            {/* Image */}
                            <img
                                src={image.preview}
                                alt={`Image ${idx + 1}`}
                                className="w-full h-full object-cover"
                            />

                            {/* Number Badge */}
                            <div className={`
                absolute top-1 left-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold
                ${isActive
                                    ? 'bg-[#22c55e] text-black'
                                    : 'bg-[#0a0a0f]/80 text-white'
                                }
              `}>
                                {idx + 1}
                            </div>

                            {/* Processing Indicator */}
                            {isActive && (
                                <div className="absolute inset-0 bg-[#22c55e]/10 flex items-center justify-center">
                                    <div className="w-8 h-8 rounded-full border-2 border-[#22c55e] border-t-transparent animate-spin" />
                                </div>
                            )}

                            {/* Applied Effects Indicator */}
                            {(hasEffects || hasAnimations) && (
                                <div className="absolute bottom-1 right-1 flex gap-1">
                                    {hasEffects && (
                                        <div className="p-1 rounded bg-[#a855f7]/80">
                                            <Sparkles className="w-2.5 h-2.5 text-white" />
                                        </div>
                                    )}
                                    {hasAnimations && (
                                        <div className="p-1 rounded bg-[#22c55e]/80">
                                            <Film className="w-2.5 h-2.5 text-white" />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
