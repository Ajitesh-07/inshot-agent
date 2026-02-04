'use client';

import { forwardRef, SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';

interface SelectOption {
    value: string;
    label: string;
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
    label?: string;
    options: SelectOption[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
    ({ className = '', label, options, id, ...props }, ref) => {
        const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');

        return (
            <div className="w-full">
                {label && (
                    <label
                        htmlFor={selectId}
                        className="block text-sm font-medium text-[#a1a1aa] mb-2"
                    >
                        {label}
                    </label>
                )}
                <div className="relative">
                    <select
                        ref={ref}
                        id={selectId}
                        className={`
              w-full px-4 py-3 rounded-lg appearance-none cursor-pointer
              bg-[#111118] border border-[#27272a]
              text-[#e4e4e7]
              transition-all duration-200
              focus:outline-none focus:border-[#22c55e] focus:ring-1 focus:ring-[#22c55e]/30
              hover:border-[#3f3f46]
              ${className}
            `}
                        {...props}
                    >
                        {options.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#71717a] pointer-events-none" />
                </div>
            </div>
        );
    }
);

Select.displayName = 'Select';
