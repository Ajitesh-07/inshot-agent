'use client';

import { Brain, Scissors, CheckCircle } from 'lucide-react';

interface PhaseIndicatorProps {
    currentPhase: 'idle' | 'planning' | 'editing' | 'done';
}

const phases = [
    { id: 'planning', label: 'Planning', icon: Brain },
    { id: 'editing', label: 'Editing', icon: Scissors },
    { id: 'done', label: 'Done', icon: CheckCircle },
];

export function PhaseIndicator({ currentPhase }: PhaseIndicatorProps) {
    const getPhaseStatus = (phaseId: string) => {
        const phaseOrder = ['planning', 'editing', 'done'];
        const currentIndex = phaseOrder.indexOf(currentPhase);
        const phaseIndex = phaseOrder.indexOf(phaseId);

        if (currentPhase === 'idle') return 'upcoming';
        if (phaseIndex < currentIndex) return 'completed';
        if (phaseIndex === currentIndex) return 'active';
        return 'upcoming';
    };

    return (
        <div className="flex items-center justify-center gap-2 p-4 rounded-xl bg-[#111118] border border-[#1f1f28]">
            {phases.map((phase, index) => {
                const status = getPhaseStatus(phase.id);
                const Icon = phase.icon;

                return (
                    <div key={phase.id} className="flex items-center">
                        {/* Phase Circle */}
                        <div className="flex flex-col items-center gap-2">
                            <div
                                className={`
                  relative flex items-center justify-center w-12 h-12 rounded-full
                  transition-all duration-500
                  ${status === 'active'
                                        ? 'bg-[#22c55e] glow-green'
                                        : status === 'completed'
                                            ? 'bg-[#22c55e]/20 border-2 border-[#22c55e]'
                                            : 'bg-[#1f1f28] border-2 border-[#27272a]'
                                    }
                `}
                            >
                                <Icon
                                    className={`w-5 h-5 transition-colors duration-300 ${status === 'active'
                                            ? 'text-black'
                                            : status === 'completed'
                                                ? 'text-[#22c55e]'
                                                : 'text-[#52525b]'
                                        }`}
                                />
                                {status === 'active' && (
                                    <div className="absolute inset-0 rounded-full bg-[#22c55e] animate-ping opacity-30" />
                                )}
                            </div>
                            <span
                                className={`text-xs font-medium transition-colors duration-300 ${status === 'active'
                                        ? 'text-[#22c55e] glow-green-text'
                                        : status === 'completed'
                                            ? 'text-[#22c55e]'
                                            : 'text-[#52525b]'
                                    }`}
                            >
                                {phase.label}
                            </span>
                        </div>

                        {/* Connector Line */}
                        {index < phases.length - 1 && (
                            <div className="flex items-center mx-4 mb-6">
                                <div
                                    className={`
                    w-16 h-0.5 transition-all duration-500
                    ${getPhaseStatus(phases[index + 1].id) !== 'upcoming'
                                            ? 'bg-gradient-to-r from-[#22c55e] to-[#22c55e]'
                                            : 'bg-[#27272a]'
                                        }
                  `}
                                />
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
