'use client';

import { Coins, Zap, TrendingUp, DollarSign, Brain } from 'lucide-react';

interface UsageData {
    prompt_tokens: number;
    candidates_tokens: number;
    thinking_tokens: number;
    cached_tokens: number;
    total_tokens: number;
}

interface PricingData {
    total_input_tokens: number;
    total_output_tokens: number;
    total_thinking_tokens: number;
    total_cached_tokens: number;
    total_tokens: number;
    input_cost_usd: number;
    output_cost_usd: number;
    total_cost_usd: number;
}

interface UsageBreakdown {
    visual_plan: UsageData | null;
    music_plan: UsageData | null;
    final_plan: UsageData | null;
}

interface TokenUsageProps {
    usageBreakdown: UsageBreakdown;
    pricing: PricingData;
}

const formatNumber = (num: number) => {
    if (num >= 1000) {
        return `${(num / 1000).toFixed(1)}k`;
    }
    return num.toString();
};

const formatCost = (cost: number) => {
    if (cost < 0.01) {
        return `$${cost.toFixed(4)}`;
    }
    return `$${cost.toFixed(2)}`;
};

export function TokenUsage({ usageBreakdown, pricing }: TokenUsageProps) {
    const steps = [
        { name: 'Visual Plan', key: 'visual_plan', color: '#3b82f6' },
        { name: 'Music Plan', key: 'music_plan', color: '#a855f7' },
        { name: 'Final Plan', key: 'final_plan', color: '#22c55e' },
    ];

    return (
        <div className="rounded-xl bg-[#111118] border border-[#1f1f28] overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-[#1f1f28]">
                <div className="p-2 rounded-lg bg-gradient-to-br from-[#f59e0b] to-[#d97706]">
                    <Coins className="w-4 h-4 text-black" />
                </div>
                <span className="font-semibold text-white">Token Usage & Cost</span>
                <span className="ml-auto px-2 py-1 rounded-full bg-[#f59e0b]/10 text-[#f59e0b] text-xs font-medium">
                    Gemini 2.5 Pro
                </span>
            </div>

            <div className="p-5 space-y-4">
                {/* Per-Step Breakdown */}
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-[#71717a] mb-2">
                        <Zap className="w-3 h-3" />
                        <span>Per-Step Breakdown</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                        {steps.map(({ name, key, color }) => {
                            const usage = usageBreakdown[key as keyof UsageBreakdown];
                            return (
                                <div
                                    key={key}
                                    className="p-3 rounded-lg bg-[#0d0d12] border border-[#27272a]"
                                >
                                    <div className="flex items-center gap-2 mb-2">
                                        <div
                                            className="w-2 h-2 rounded-full"
                                            style={{ backgroundColor: color }}
                                        />
                                        <span className="text-xs font-medium text-[#a1a1aa]">{name}</span>
                                    </div>
                                    {usage ? (
                                        <div className="space-y-1">
                                            <div className="flex justify-between text-[10px]">
                                                <span className="text-[#52525b]">In:</span>
                                                <span className="text-[#e4e4e7]">{formatNumber(usage.prompt_tokens)}</span>
                                            </div>
                                            <div className="flex justify-between text-[10px]">
                                                <span className="text-[#52525b]">Out:</span>
                                                <span className="text-[#e4e4e7]">{formatNumber(usage.candidates_tokens)}</span>
                                            </div>
                                            {usage.thinking_tokens > 0 && (
                                                <div className="flex justify-between text-[10px]">
                                                    <span className="text-[#52525b]">Think:</span>
                                                    <span className="text-[#f59e0b]">{formatNumber(usage.thinking_tokens)}</span>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <span className="text-xs text-[#52525b]">N/A</span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Aggregate Stats */}
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-[#71717a] mb-2">
                        <TrendingUp className="w-3 h-3" />
                        <span>Total Usage</span>
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                        <div className="p-3 rounded-lg bg-[#3b82f6]/10 border border-[#3b82f6]/30">
                            <div className="text-[10px] text-[#3b82f6] mb-1">Input</div>
                            <div className="text-sm font-bold text-white">{formatNumber(pricing.total_input_tokens)}</div>
                        </div>
                        <div className="p-3 rounded-lg bg-[#a855f7]/10 border border-[#a855f7]/30">
                            <div className="text-[10px] text-[#a855f7] mb-1">Output</div>
                            <div className="text-sm font-bold text-white">{formatNumber(pricing.total_output_tokens)}</div>
                        </div>
                        <div className="p-3 rounded-lg bg-[#f59e0b]/10 border border-[#f59e0b]/30">
                            <div className="text-[10px] text-[#f59e0b] mb-1 flex items-center gap-1">
                                <Brain className="w-3 h-3" /> Think
                            </div>
                            <div className="text-sm font-bold text-white">{formatNumber(pricing.total_thinking_tokens)}</div>
                        </div>
                        <div className="p-3 rounded-lg bg-[#22c55e]/10 border border-[#22c55e]/30">
                            <div className="text-[10px] text-[#22c55e] mb-1">Total</div>
                            <div className="text-sm font-bold text-white">{formatNumber(pricing.total_tokens)}</div>
                        </div>
                    </div>
                </div>

                {/* Pricing */}
                <div className="p-4 rounded-lg bg-gradient-to-r from-[#f59e0b]/10 to-[#d97706]/5 border border-[#f59e0b]/30">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-[#f59e0b]" />
                            <span className="text-sm font-medium text-white">Estimated Cost</span>
                        </div>
                        <div className="text-right">
                            <div className="text-lg font-bold text-[#f59e0b]">
                                {formatCost(pricing.total_cost_usd)}
                            </div>
                            <div className="text-[10px] text-[#71717a]">
                                {formatCost(pricing.input_cost_usd)} in + {formatCost(pricing.output_cost_usd)} out
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
