import { useState, useRef, useEffect } from 'react';
import { ChevronDown, LucideIcon } from 'lucide-react';
import { Columns, AlignLeft } from 'lucide-react';

interface SplitButtonProps {
    icon: LucideIcon;
    label: string;
    onClick: (side?: 'left' | 'right' | 'both') => void;
    disabled?: boolean;
}

export const SplitButton = ({ icon: Icon, label, onClick, disabled }: SplitButtonProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleAction = (side: 'left' | 'right' | 'both') => {
        onClick(side);
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={menuRef}>
            <div className={`flex rounded-lg overflow-hidden transition-colors ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-800' : 'bg-indigo-600 hover:bg-indigo-500'}`}>
                <button
                    className="px-3 py-1.5 flex items-center text-white text-sm font-medium border-r border-indigo-700/50"
                    onClick={() => !disabled && onClick('both')}
                    disabled={disabled}
                    title={`${label} Both Sides`}
                >
                    <Icon size={16} className="mr-1.5" />
                    {label}
                </button>
                <button
                    className="px-1.5 hover:bg-indigo-700/50 transition-colors text-white flex items-center"
                    onClick={() => !disabled && setIsOpen(!isOpen)}
                    disabled={disabled}
                >
                    <ChevronDown size={14} />
                </button>
            </div>

            {isOpen && (
                <div className="absolute top-full left-0 mt-1 w-32 bg-slate-800 border border-slate-700 rounded shadow-xl z-20 py-1 overflow-hidden">
                    <button
                        className="w-full text-left px-4 py-2 text-xs text-slate-300 hover:bg-slate-700 hover:text-white flex items-center gap-2"
                        onClick={() => handleAction('both')}
                    >
                        <Columns size={12} /> Both
                    </button>
                    <button
                        className="w-full text-left px-4 py-2 text-xs text-slate-300 hover:bg-slate-700 hover:text-white flex items-center gap-2"
                        onClick={() => handleAction('left')}
                    >
                        <AlignLeft size={12} /> Left Only
                    </button>
                    <button
                        className="w-full text-left px-4 py-2 text-xs text-slate-300 hover:bg-slate-700 hover:text-white flex items-center gap-2"
                        onClick={() => handleAction('right')}
                    >
                        <AlignLeft size={12} className="transform rotate-180" /> Right Only
                    </button>
                </div>
            )}
        </div>
    );
};
