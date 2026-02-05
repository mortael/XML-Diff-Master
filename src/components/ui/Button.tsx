import { twMerge } from 'tailwind-merge';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    active?: boolean;
}

export const Button = ({
    className,
    variant = 'secondary',
    size = 'md',
    active,
    children,
    ...props
}: ButtonProps) => {
    const baseStyles = "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:pointer-events-none disabled:opacity-50";

    const variants = {
        primary: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-900/20 border border-transparent",
        secondary: "bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 hover:border-slate-600 shadow-sm",
        ghost: "text-slate-400 hover:bg-slate-800 hover:text-slate-200",
        danger: "bg-red-900/50 text-red-200 border border-red-900 hover:bg-red-900/70 hover:text-white"
    };

    const sizes = {
        sm: "h-8 px-3 text-xs",
        md: "h-9 px-4 py-2 text-sm",
        lg: "h-10 px-6 text-base"
    };

    const activeStyles = active ? "bg-indigo-900/40 text-indigo-300 border-indigo-700/50 ring-1 ring-indigo-700/50" : "";

    return (
        <button
            className={twMerge(baseStyles, variants[variant], sizes[size], activeStyles, className)}
            {...props}
        >
            {children}
        </button>
    );
};
