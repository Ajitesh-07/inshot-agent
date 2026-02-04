'use client';

import { Clock, Sparkles, Film, ArrowRightLeft } from 'lucide-react';
import { VisualPlanAction } from '@/types/agent';

interface VisualPlanTimelineProps {
    actions: VisualPlanAction[];
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

const getToolColor = (tool: string) => {
    switch (tool) {
        case 'change_duration': return { bg: 'bg-[#3b82f6]/20', text: 'text-[#3b82f6]', border: 'border-[#3b82f6]/30' };
        case 'apply_effect': return { bg: 'bg-[#a855f7]/20', text: 'text-[#a855f7]', border: 'border-[#a855f7]/30' };
        case 'apply_animation': return { bg: 'bg-[#22c55e]/20', text: 'text-[#22c55e]', border: 'border-[#22c55e]/30' };
        case 'add_transition': return { bg: 'bg-[#f59e0b]/20', text: 'text-[#f59e0b]', border: 'border-[#f59e0b]/30' };
        default: return { bg: 'bg-[#71717a]/20', text: 'text-[#71717a]', border: 'border-[#71717a]/30' };
    }
};

const getActionDescription = (action: VisualPlanAction): string => {
    const { tool, args } = action;
    switch (tool) {
        case 'change_duration':
            return `${args.duration}s`;
        case 'apply_effect':
            return args.effects_list?.join(', ') || '';
        case 'apply_animation':
            return `${args.animation_name} (${args.animation_type})`;
        case 'add_transition':
            return `${args.transition_type}${args.all_apply ? ' (All)' : ''}`;
        default:
            return '';
    }
};

const getImageNumber = (action: VisualPlanAction): string => {
    if (action.args.image_idx) return `#${action.args.image_idx}`;
    if (action.tool === 'add_transition' && action.args.all_apply) {
        return 'All Clips';
    }
    if (action.args.image1_idx && action.args.image2_idx)
        return `#${action.args.image1_idx} → #${action.args.image2_idx}`;
    return '';
};

export function VisualPlanTimeline({ actions }: VisualPlanTimelineProps) {
    // Group actions by type
    const groupedActions = {
        duration: actions.filter(a => a.tool === 'change_duration'),
        effects: actions.filter(a => a.tool === 'apply_effect'),
        animations: actions.filter(a => a.tool === 'apply_animation'),
        transitions: actions.filter(a => a.tool === 'add_transition'),
    };

    const renderActionGroup = (title: string, tool: string, groupActions: VisualPlanAction[]) => {
        if (groupActions.length === 0) return null;
        const Icon = getToolIcon(tool);
        const colors = getToolColor(tool);

        return (
            <div className="space-y-2">
                <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${colors.text}`} />
                    <span className="text-sm font-medium text-[#a1a1aa]">{title}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${colors.bg} ${colors.text}`}>
                        {groupActions.length}
                    </span>
                </div>
                <div className="flex flex-wrap gap-2">
                    {groupActions.map((action, idx) => (
                        <div
                            key={idx}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg ${colors.bg} border ${colors.border}`}
                        >
                            <span className="text-xs font-bold text-[#e4e4e7]">
                                {getImageNumber(action)}
                            </span>
                            <span className={`text-xs ${colors.text}`}>
                                {getActionDescription(action)}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="rounded-xl bg-[#111118] border border-[#1f1f28] overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-[#1f1f28]">
                <div className="p-2 rounded-lg bg-gradient-to-br from-[#22c55e] to-[#16a34a]">
                    <Film className="w-4 h-4 text-black" />
                </div>
                <span className="font-semibold text-white">Visual Plan</span>
                <span className="ml-auto text-xs text-[#52525b]">
                    {actions.length} actions
                </span>
            </div>

            {/* Actions Grid */}
            <div className="p-5 space-y-4">
                {renderActionGroup('Durations', 'change_duration', groupedActions.duration)}
                {renderActionGroup('Effects', 'apply_effect', groupedActions.effects)}
                {renderActionGroup('Animations', 'apply_animation', groupedActions.animations)}
                {renderActionGroup('Transitions', 'add_transition', groupedActions.transitions)}
            </div>
        </div>
    );
}
