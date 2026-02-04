'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

interface PlanningProgressProps {
    currentStep: 'connecting' | 'visual_plan' | 'music_plan' | 'downloading' | 'final_plan' | 'complete';
    downloadProgress?: number;
    message?: string;
}

const steps = [
    { id: 'visual_plan', label: 'Generating Visual Plan', description: 'AI Director analyzing your images...' },
    { id: 'music_plan', label: 'Selecting Music', description: 'Finding perfect tracks for your vibe...' },
    { id: 'downloading', label: 'Downloading Tracks', description: 'Preparing audio files...' },
    { id: 'final_plan', label: 'Finalizing Plan', description: 'Analyzing and syncing everything...' },
];

export function PlanningProgress({ currentStep, downloadProgress, message }: PlanningProgressProps) {
    const [elapsedTime, setElapsedTime] = useState(0);

    // Timer for elapsed time
    useEffect(() => {
        const timer = setInterval(() => {
            setElapsedTime(prev => prev + 1);
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const getStepStatus = (stepId: string) => {
        const stepOrder = ['connecting', 'visual_plan', 'music_plan', 'downloading', 'final_plan', 'complete'];
        const currentIndex = stepOrder.indexOf(currentStep);
        const stepIndex = stepOrder.indexOf(stepId);

        if (stepIndex < currentIndex) return 'completed';
        if (stepIndex === currentIndex) return 'active';
        return 'pending';
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="rounded-xl bg-[#111118] border border-[#1f1f28] overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b border-[#1f1f28] flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Loader2 className="w-5 h-5 text-[#22c55e] animate-spin" />
                    <span className="font-semibold text-white">Planning in Progress</span>
                </div>
                <span className="text-sm text-[#52525b] font-mono">{formatTime(elapsedTime)}</span>
            </div>

            {/* Steps */}
            <div className="p-5 space-y-4">
                {steps.map((step, index) => {
                    const status = getStepStatus(step.id);

                    return (
                        <div key={step.id} className="relative">
                            {/* Connector line */}
                            {index < steps.length - 1 && (
                                <div
                                    className={`absolute left-4 top-8 w-0.5 h-8 ${status === 'completed' ? 'bg-[#22c55e]' : 'bg-[#27272a]'
                                        }`}
                                />
                            )}

                            <div className="flex items-start gap-4">
                                {/* Status indicator */}
                                <div className={`
                  flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0 transition-all duration-500
                  ${status === 'completed'
                                        ? 'bg-[#22c55e] text-black'
                                        : status === 'active'
                                            ? 'bg-[#22c55e]/20 border-2 border-[#22c55e] text-[#22c55e]'
                                            : 'bg-[#1f1f28] text-[#52525b] border-2 border-[#27272a]'
                                    }
                `}>
                                    {status === 'completed' ? (
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    ) : status === 'active' ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <span className="text-xs font-bold">{index + 1}</span>
                                    )}
                                </div>

                                {/* Step content */}
                                <div className="flex-1 min-w-0">
                                    <p className={`font-medium ${status === 'active' ? 'text-[#22c55e]' :
                                            status === 'completed' ? 'text-white' : 'text-[#52525b]'
                                        }`}>
                                        {step.label}
                                    </p>
                                    <p className="text-sm text-[#71717a] mt-0.5">
                                        {status === 'active' && message ? message : step.description}
                                    </p>

                                    {/* Download progress bar */}
                                    {step.id === 'downloading' && status === 'active' && downloadProgress !== undefined && (
                                        <div className="mt-3">
                                            <div className="flex justify-between text-xs text-[#71717a] mb-1">
                                                <span>Downloading tracks...</span>
                                                <span>{Math.round(downloadProgress)}%</span>
                                            </div>
                                            <div className="h-2 rounded-full bg-[#1f1f28] overflow-hidden">
                                                <div
                                                    className="h-full bg-gradient-to-r from-[#22c55e] to-[#16a34a] transition-all duration-300"
                                                    style={{ width: `${downloadProgress}%` }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
