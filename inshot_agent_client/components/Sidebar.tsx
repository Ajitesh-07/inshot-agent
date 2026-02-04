'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    Clapperboard,
    ListVideo,
    Settings,
    Zap
} from 'lucide-react';

const navItems = [
    { href: '/', label: 'Studio', icon: Clapperboard },
    { href: '/batch-queue', label: 'Batch Queue', icon: ListVideo },
    { href: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="flex flex-col w-64 min-h-screen bg-[#0d0d12] border-r border-[#1f1f28]">
            {/* Logo */}
            <div className="flex items-center gap-3 px-6 py-5 border-b border-[#1f1f28]">
                <div className="p-2 rounded-lg bg-gradient-to-br from-[#22c55e] to-[#16a34a] glow-green">
                    <Zap className="w-5 h-5 text-black" />
                </div>
                <div>
                    <h1 className="text-lg font-bold text-white tracking-tight">DroidRun</h1>
                    <p className="text-xs text-[#71717a] -mt-0.5">Studio</p>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-4">
                <ul className="space-y-1">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        const Icon = item.icon;

                        return (
                            <li key={item.href}>
                                <Link
                                    href={item.href}
                                    className={`
                    flex items-center gap-3 px-4 py-3 rounded-lg
                    transition-all duration-200 group
                    ${isActive
                                            ? 'bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/30'
                                            : 'text-[#a1a1aa] hover:text-white hover:bg-[#18181b]'
                                        }
                  `}
                                >
                                    <Icon className={`w-5 h-5 ${isActive ? 'glow-green-text' : ''}`} />
                                    <span className="font-medium">{item.label}</span>
                                    {isActive && (
                                        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#22c55e] glow-green" />
                                    )}
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>

            {/* Footer */}
            <div className="px-4 py-4 border-t border-[#1f1f28]">
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#111118]">
                    <div className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse" />
                    <span className="text-xs text-[#71717a]">Agent Ready</span>
                </div>
            </div>
        </aside>
    );
}
