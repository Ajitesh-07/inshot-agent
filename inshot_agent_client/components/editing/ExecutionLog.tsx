'use client';

import { Clock, Sparkles, Film, ArrowRightLeft, Check, Loader2, AlertCircle } from 'lucide-react';
import { ExecutedStep } from '@/types/agent';

interface ExecutionLogProps {
    steps: ExecutedStep[];
    currentStep: number;
    totalSteps: number;
}

const getToolIcon = (tool: string) => {
    switch (tool) {
        case 'change_duration': return Clock;
        case 'apply_effect': return Sparkles;
        case 'apply_animation': return Film;
        case 'add_transition': return ArrowRightLeft;
        default: return Sparkles;
    }
};

const getToolLabel = (tool: string) => {
    switch (tool) {
        case 'change_duration': return 'Duration';
        case 'apply_effect': return 'Effect';
        case 'apply_animation': return 'Animation';
        case 'add_transition': return 'Transition';
        default: return tool;
    }
};

const getStatusIcon = (status: string) => {
    switch (status) {
        case 'done': return <Check className="w-3 h-3 text-[#22c55e]" />;
        case 'running': return <Loader2 className="w-3 h-3 text-[#22c55e] animate-spin" />;
        case 'error': return <AlertCircle className="w-3 h-3 text-[#ef4444]" />;
        default: return <div className="w-3 h-3 rounded-full bg-[#27272a]" />;
    }
};

export function ExecutionLog({ steps, currentStep, totalSteps }: ExecutionLogProps) {
    const progress = totalSteps > 0 ? (currentStep / totalSteps) * 100 : 0;

    return (
        <div className="rounded-xl bg-[#111118] border border-[#1f1f28] overflow-hidden">
            {/* Header with Progress */}
            <div className="px-5 py-4 border-b border-[#1f1f28]">
                <div className="flex items-center justify-between mb-3">
                    <span className="font-semibold text-white">Execution Progress</span>
                    <span className="text-sm text-[#22c55e] font-medium">
                        {currentStep} / {totalSteps}
                    </span>
                </div>

                {/* Progress Bar */}
                <div className="relative h-2 rounded-full bg-[#1f1f28] overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-[#22c55e] to-[#16a34a] transition-all duration-500 ease-out"
                        style={{ width: `${progress}%` }}
                    />
                    {progress > 0 && progress < 100 && (
                        <div
                            className="absolute top-0 h-full w-8 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"
                            style={{ left: `${progress - 4}%` }}
                        />
                    )}
                </div>
            </div>

            {/* Execution Steps */}
            <div className="max-h-[300px] overflow-y-auto p-4 space-y-2">
                {steps.map((step, idx) => {
                    const Icon = getToolIcon(step.action.tool);
                    const isActive = step.status === 'running';

                    return (
                        <div
                            key={step.id}
                            className={`
                flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-300
                ${isActive
                                    ? 'bg-[#22c55e]/10 border border-[#22c55e]/30'
                                    : 'bg-[#0d0d12] border border-transparent'
                                }
              `}
                        >
                            {/* Status Icon */}
                            <div className={`
                flex items-center justify-center w-6 h-6 rounded-full
                ${step.status === 'done' ? 'bg-[#22c55e]/20' :
                                    step.status === 'running' ? 'bg-[#22c55e]/10' :
                                        step.status === 'error' ? 'bg-[#ef4444]/20' : 'bg-[#1f1f28]'
                                }
              `}>
                                {getStatusIcon(step.status)}
                            </div>

                            {/* Tool Icon */}
                            <Icon className={`w-4 h-4 ${isActive ? 'text-[#22c55e]' : 'text-[#71717a]'}`} />

                            {/* Step Info */}
                            <div className="flex-1 min-w-0">
                                <span className={`text-sm ${isActive ? 'text-white' : 'text-[#a1a1aa]'}`}>
                                    {getToolLabel(step.action.tool)}
                                </span>
                                {step.action.args.image_idx && (
                                    <span className="ml-2 text-xs text-[#52525b]">
                                        Image #{step.action.args.image_idx}
                                    </span>
                                )}
                            </div>

                            {/* Timestamp */}
                            {step.timestamp && (
                                <span className="text-xs text-[#52525b]">{step.timestamp}</span>
                            )}
                        </div>
                    );
                })}

                {/* Empty State */}
                {steps.length === 0 && (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 text-[#22c55e] animate-spin" />
                        <span className="ml-3 text-sm text-[#71717a]">Preparing execution...</span>
                    </div>
                )}
            </div>
        </div>
    );
}
