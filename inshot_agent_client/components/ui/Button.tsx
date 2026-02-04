'use client';

import { forwardRef, ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
    size?: 'sm' | 'md' | 'lg';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className = '', variant = 'primary', size = 'md', children, disabled, ...props }, ref) => {
        const baseStyles = `
      inline-flex items-center justify-center font-semibold 
      rounded-lg transition-all duration-200 
      focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0a0a0f]
      disabled:opacity-50 disabled:cursor-not-allowed
    `;

        const variants = {
            primary: `
        bg-gradient-to-r from-[#22c55e] to-[#16a34a] text-black
        hover:from-[#16a34a] hover:to-[#15803d]
        focus:ring-[#22c55e]
        glow-green
      `,
            secondary: `
        bg-gradient-to-r from-[#a855f7] to-[#9333ea] text-white
        hover:from-[#9333ea] hover:to-[#7c3aed]
        focus:ring-[#a855f7]
        glow-purple
      `,
            ghost: `
        bg-transparent text-[#a1a1aa]
        hover:bg-[#18181b] hover:text-white
        focus:ring-[#27272a]
      `,
            outline: `
        bg-transparent border border-[#27272a] text-[#e4e4e7]
        hover:bg-[#18181b] hover:border-[#3f3f46]
        focus:ring-[#27272a]
      `,
        };

        const sizes = {
            sm: 'px-3 py-1.5 text-sm gap-1.5',
            md: 'px-4 py-2.5 text-sm gap-2',
            lg: 'px-6 py-3.5 text-base gap-2',
        };

        return (
            <button
                ref={ref}
                className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
                disabled={disabled}
                {...props}
            >
                {children}
            </button>
        );
    }
);

Button.displayName = 'Button';
