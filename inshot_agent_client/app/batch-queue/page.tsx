'use client';

import { ListVideo, Plus, Clock, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

// Mock batch queue data
const mockQueue = [
    { id: 1, name: 'Summer Vacation Edit', status: 'completed', vibe: 'Cinematic', created: '2 hours ago' },
    { id: 2, name: 'Product Launch Promo', status: 'processing', vibe: 'Phonk', created: '45 mins ago' },
    { id: 3, name: 'Birthday Compilation', status: 'queued', vibe: 'Glitch', created: '10 mins ago' },
    { id: 4, name: 'Travel Montage', status: 'failed', vibe: 'Cinematic', created: '3 hours ago' },
];

const getStatusIcon = (status: string) => {
    switch (status) {
        case 'completed': return <CheckCircle className="w-4 h-4 text-[#22c55e]" />;
        case 'processing': return <Clock className="w-4 h-4 text-[#eab308] animate-pulse" />;
        case 'queued': return <Clock className="w-4 h-4 text-[#71717a]" />;
        case 'failed': return <XCircle className="w-4 h-4 text-[#ef4444]" />;
        default: return null;
    }
};

const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
        completed: 'bg-[#22c55e]/10 text-[#22c55e] border-[#22c55e]/30',
        processing: 'bg-[#eab308]/10 text-[#eab308] border-[#eab308]/30',
        queued: 'bg-[#71717a]/10 text-[#71717a] border-[#71717a]/30',
        failed: 'bg-[#ef4444]/10 text-[#ef4444] border-[#ef4444]/30',
    };
    return styles[status] || styles.queued;
};

export default function BatchQueuePage() {
    return (
        <div className="min-h-screen p-6 lg:p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <ListVideo className="w-6 h-6 text-[#a855f7]" />
                        Batch Queue
                    </h1>
                    <p className="text-[#71717a] mt-1">
                        Manage your video processing queue
                    </p>
                </div>
                <Button variant="outline" size="md">
                    <Plus className="w-4 h-4" />
                    Add to Queue
                </Button>
            </div>

            {/* Queue Table */}
            <div className="rounded-xl bg-[#111118] border border-[#1f1f28] overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-[#1f1f28]">
                            <th className="text-left px-6 py-4 text-sm font-medium text-[#71717a]">Project Name</th>
                            <th className="text-left px-6 py-4 text-sm font-medium text-[#71717a]">Vibe</th>
                            <th className="text-left px-6 py-4 text-sm font-medium text-[#71717a]">Status</th>
                            <th className="text-left px-6 py-4 text-sm font-medium text-[#71717a]">Created</th>
                        </tr>
                    </thead>
                    <tbody>
                        {mockQueue.map((item) => (
                            <tr
                                key={item.id}
                                className="border-b border-[#1f1f28] last:border-0 hover:bg-[#18181b] transition-colors"
                            >
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        {getStatusIcon(item.status)}
                                        <span className="text-[#e4e4e7] font-medium">{item.name}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-[#a1a1aa]">{item.vibe}</td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusBadge(item.status)}`}>
                                        {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-[#71717a] text-sm">{item.created}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Empty State (hidden when queue has items) */}
            {mockQueue.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="p-4 rounded-xl bg-[#1f1f28] mb-4">
                        <ListVideo className="w-8 h-8 text-[#52525b]" />
                    </div>
                    <h3 className="text-lg font-medium text-[#e4e4e7] mb-2">No projects in queue</h3>
                    <p className="text-[#71717a] text-sm max-w-sm">
                        Add videos to the batch queue to process multiple projects automatically.
                    </p>
                </div>
            )}
        </div>
    );
}
