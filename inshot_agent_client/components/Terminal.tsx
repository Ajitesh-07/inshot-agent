'use client';

import { useEffect, useRef } from 'react';
import { TerminalSquare } from 'lucide-react';

export interface LogEntry {
    id: string;
    timestamp: string;
    message: string;
    type: 'info' | 'success' | 'error' | 'warning';
}

interface TerminalProps {
    logs: LogEntry[];
    title?: string;
}

export function Terminal({ logs, title = 'Agent Logs' }: TerminalProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when new logs arrive
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs]);

    const getLogColor = (type: LogEntry['type']) => {
        switch (type) {
            case 'success': return 'text-[#22c55e]';
            case 'error': return 'text-[#ef4444]';
            case 'warning': return 'text-[#eab308]';
            default: return 'text-[#a1a1aa]';
        }
    };

    return (
        <div className="flex flex-col h-full rounded-xl bg-[#0a0a0f] border border-[#1f1f28] overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-[#1f1f28] bg-[#0d0d12]">
                <TerminalSquare className="w-4 h-4 text-[#22c55e]" />
                <span className="text-sm font-medium text-[#e4e4e7]">{title}</span>
                <div className="ml-auto flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-[#ef4444]/80" />
                    <div className="w-3 h-3 rounded-full bg-[#eab308]/80" />
                    <div className="w-3 h-3 rounded-full bg-[#22c55e]/80" />
                </div>
            </div>

            {/* Log Content */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 font-mono text-sm space-y-1 min-h-[200px] max-h-[300px]"
            >
                {logs.length === 0 ? (
                    <div className="flex items-center text-[#52525b]">
                        <span className="text-[#22c55e] mr-2">$</span>
                        <span>Waiting for agent to start...</span>
                        <span className="ml-1 w-2 h-4 bg-[#22c55e] terminal-cursor" />
                    </div>
                ) : (
                    logs.map((log) => (
                        <div key={log.id} className="flex items-start gap-2 hover:bg-[#111118] rounded px-1 -mx-1">
                            <span className="text-[#52525b] flex-shrink-0">[{log.timestamp}]</span>
                            <span className={getLogColor(log.type)}>{log.message}</span>
                        </div>
                    ))
                )}
                {logs.length > 0 && (
                    <div className="flex items-center text-[#52525b]">
                        <span className="text-[#22c55e] mr-2">$</span>
                        <span className="w-2 h-4 bg-[#22c55e] terminal-cursor" />
                    </div>
                )}
            </div>
        </div>
    );
}
