'use client';

import { Toaster as SonnerToaster } from 'sonner';

export function Toaster() {
    return (
        <SonnerToaster
            position="top-right"
            toastOptions={{
                style: {
                    background: '#111118',
                    border: '1px solid #27272a',
                    color: '#e4e4e7',
                },
                classNames: {
                    success: 'border-[#22c55e]/30 bg-[#22c55e]/10',
                    error: 'border-red-500/30 bg-red-500/10',
                },
            }}
        />
    );
}
