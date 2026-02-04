'use client';

import { forwardRef, InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ className = '', label, id, ...props }, ref) => {
        const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

        return (
            <div className="w-full">
                {label && (
                    <label
                        htmlFor={inputId}
                        className="block text-sm font-medium text-[#a1a1aa] mb-2"
                    >
                        {label}
                    </label>
                )}
                <input
                    ref={ref}
                    id={inputId}
                    className={`
            w-full px-4 py-3 rounded-lg
            bg-[#111118] border border-[#27272a]
            text-[#e4e4e7] placeholder-[#52525b]
            transition-all duration-200
            focus:outline-none focus:border-[#22c55e] focus:ring-1 focus:ring-[#22c55e]/30
            hover:border-[#3f3f46]
            ${className}
          `}
                    {...props}
                />
            </div>
        );
    }
);

Input.displayName = 'Input';
