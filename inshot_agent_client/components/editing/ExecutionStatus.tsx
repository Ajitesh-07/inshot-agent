'use client';

import { Loader2, CheckCircle, Upload, Music, Image, Scissors, Terminal, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

interface ExecutionStatusProps {
    step: 'idle' | 'uploading_images' | 'uploading_audio' | 'selecting_images' | 'executing_plan' | 'complete';
    message: string;
    logs?: string[];
}

const steps = [
    { key: 'uploading_images', label: 'Uploading Images', icon: Upload },
    { key: 'uploading_audio', label: 'Uploading Audio', icon: Music },
    { key: 'selecting_images', label: 'Selecting Images', icon: Image },
    { key: 'executing_plan', label: 'Executing Plan', icon: Scissors },
    { key: 'complete', label: 'Complete', icon: CheckCircle },
];

export function ExecutionStatus({ step, message, logs = [] }: ExecutionStatusProps) {
    const [showLogs, setShowLogs] = useState(true);

    const currentIndex = steps.findIndex(s => s.key === step);

    return (
        <div className="rounded-xl bg-[#111118] border border-[#1f1f28] overflow-hidden">
            {/* Steps Progress */}
            <div className="px-5 py-4 border-b border-[#1f1f28]">
                <div className="flex items-center justify-between mb-4">
                    <span className="font-semibold text-white">Execution Progress</span>
                    <span className="text-sm text-[#22c55e] font-medium">
                        Step {Math.max(0, currentIndex + 1)} / {steps.length}
                    </span>
                </div>

                {/* Step Indicators */}
                <div className="flex items-center gap-2">
                    {steps.map((s, idx) => {
                        const Icon = s.icon;
                        const isActive = s.key === step;
                        const isComplete = currentIndex > idx;
                        const isUpcoming = currentIndex < idx;

                        return (
                            <div key={s.key} className="flex items-center flex-1">
                                <div className={`
                                    flex items-center justify-center w-8 h-8 rounded-full transition-all
                                    ${isComplete ? 'bg-[#22c55e] text-black' :
                                        isActive ? 'bg-[#22c55e]/20 border-2 border-[#22c55e] text-[#22c55e]' :
                                            'bg-[#1f1f28] text-[#52525b]'}
                                `}>
                                    {isActive && step !== 'complete' ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Icon className="w-4 h-4" />
                                    )}
                                </div>
                                {idx < steps.length - 1 && (
                                    <div className={`flex-1 h-0.5 mx-2 ${isComplete ? 'bg-[#22c55e]' : 'bg-[#1f1f28]'}`} />
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Current Step Label */}
                <div className="mt-3 text-center">
                    <span className="text-sm text-[#a1a1aa]">
                        {steps[currentIndex]?.label || 'Initializing...'}
                    </span>
                </div>
            </div>

            {/* Current Message */}
            <div className="px-5 py-3 bg-[#0d0d12] border-b border-[#1f1f28]">
                <div className="flex items-center gap-3">
                    {step !== 'complete' && step !== 'idle' && (
                        <Loader2 className="w-4 h-4 text-[#22c55e] animate-spin flex-shrink-0" />
                    )}
                    {step === 'complete' && (
                        <CheckCircle className="w-4 h-4 text-[#22c55e] flex-shrink-0" />
                    )}
                    <span className="text-sm text-white">{message || 'Waiting...'}</span>
                </div>
            </div>

            {/* Terminal Logs */}
            {logs.length > 0 && (
                <div>
                    <button
                        onClick={() => setShowLogs(!showLogs)}
                        className="w-full px-5 py-2 flex items-center justify-between text-sm text-[#71717a] hover:text-white transition-colors border-b border-[#1f1f28]"
                    >
                        <div className="flex items-center gap-2">
                            <Terminal className="w-4 h-4" />
                            <span>Agent Logs ({logs.length})</span>
                        </div>
                        {showLogs ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    {showLogs && (
                        <div className="max-h-[200px] overflow-y-auto bg-[#0a0a0f] p-3 font-mono text-xs">
                            {logs.map((log, idx) => (
                                <div key={idx} className="py-0.5 text-[#a1a1aa] hover:text-white">
                                    <span className="text-[#52525b] mr-2">{String(idx + 1).padStart(2, '0')}</span>
                                    {log}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
