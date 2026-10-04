import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Minus, Plus, Loader2 } from 'lucide-react';

export function Spinner({ className = '', size = 28 }) {
    return <Loader2 size={size} className={`animate-spin text-brand ${className}`} />;
}

export function FullPageSpinner({ label }) {
    return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
            <Spinner size={36} />
            {label && <p className="text-sm font-semibold text-slate-500">{label}</p>}
        </div>
    );
}

// Green square with a dot - the standard Indian veg / non-veg mark.
export function VegMark({ isVeg, className = '' }) {
    const color = isVeg ? 'border-brand' : 'border-red-500';
    const dot = isVeg ? 'bg-brand' : 'bg-red-500';
    return (
        <span className={`inline-flex items-center justify-center w-4 h-4 border-2 rounded bg-white shrink-0 ${color} ${className}`}
            title={isVeg ? 'Veg' : 'Non-veg'} aria-label={isVeg ? 'Veg' : 'Non-veg'}>
            <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
        </span>
    );
}

export function QtyStepper({ value, onDec, onInc, small = false }) {
    const btn = small ? 'w-7 h-7' : 'w-9 h-9';
    return (
        <div className="inline-flex items-center bg-slate-50 rounded-full p-1 border border-slate-200">
            <button type="button" onClick={onDec} className={`${btn} rounded-full bg-white shadow-sm flex items-center justify-center text-slate-500 hover:text-ink`} aria-label="Decrease quantity">
                <Minus size={small ? 14 : 16} />
            </button>
            <span className={`font-extrabold text-ink text-center ${small ? 'w-7 text-sm' : 'w-9'}`}>{value}</span>
            <button type="button" onClick={onInc} className={`${btn} rounded-full bg-white shadow-sm flex items-center justify-center text-slate-500 hover:text-ink`} aria-label="Increase quantity">
                <Plus size={small ? 14 : 16} />
            </button>
        </div>
    );
}

export function PageTitle({ title, subtitle, back = false, right = null }) {
    const navigate = useNavigate();
    return (
        <div className="flex items-center gap-3 mb-6">
            {back && (
                <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 shrink-0" aria-label="Go back">
                    <ArrowLeft size={20} />
                </button>
            )}
            <div className="flex-1 min-w-0">
                <h1 className="text-2xl md:text-3xl font-extrabold text-ink tracking-tight">{title}</h1>
                {subtitle && <p className="text-sm text-slate-500 font-medium mt-0.5">{subtitle}</p>}
            </div>
            {right}
        </div>
    );
}

export function Card({ className = '', children }) {
    return <div className={`bg-white rounded-2xl border border-slate-100 shadow-card ${className}`}>{children}</div>;
}

export function Button({ as, to, variant = 'primary', className = '', loading = false, disabled, children, ...rest }) {
    const styles = {
        primary: 'btn-shine bg-brand-cta hover:bg-brand text-white shadow-lg shadow-green-600/20 hover:shadow-xl hover:shadow-green-600/30',
        dark: 'btn-shine bg-ink hover:bg-slate-800 text-white',
        outline: 'bg-white border-2 border-brand text-brand hover:bg-brand-50',
        ghost: 'bg-slate-100 hover:bg-slate-200 text-ink',
        danger: 'bg-red-50 text-red-600 hover:bg-red-100',
    }[variant];
    const cls = `inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl font-extrabold text-sm transition active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed ${styles} ${className}`;
    if (to) return <Link to={to} className={cls} {...rest}>{children}</Link>;
    return (
        <button className={cls} disabled={disabled || loading} {...rest}>
            {loading ? <Loader2 size={18} className="animate-spin" /> : children}
        </button>
    );
}

export function Input({ label, error, icon: Icon, className = '', ...rest }) {
    return (
        <label className={`block ${className}`}>
            {label && <span className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">{label}</span>}
            <span className={`flex items-center gap-2 bg-slate-50 border-2 rounded-2xl px-4 focus-within:border-brand-light focus-within:bg-white transition ${error ? 'border-red-400' : 'border-slate-200'}`}>
                {Icon && <Icon size={16} className="text-slate-400 shrink-0" />}
                <input className="w-full bg-transparent py-3 text-sm font-medium text-ink outline-none placeholder:text-slate-400" {...rest} />
            </span>
            {error && <span className="block text-xs text-red-500 font-semibold mt-1">{error}</span>}
        </label>
    );
}

export function EmptyState({ icon: Icon, emoji, title, subtitle, action }) {
    return (
        <div className="flex flex-col items-center text-center py-16 px-4">
            {emoji && <div className="text-6xl mb-4">{emoji}</div>}
            {Icon && <Icon size={56} className="text-slate-300 mb-4" />}
            <h2 className="text-lg font-extrabold text-ink">{title}</h2>
            {subtitle && <p className="text-sm text-slate-500 mt-1 max-w-sm">{subtitle}</p>}
            {action && <div className="mt-6">{action}</div>}
        </div>
    );
}

export function ImageOrEmoji({ src, alt, emoji = '🍽️', className = '', emojiSize = 'text-5xl' }) {
    if (src) return <img src={src} alt={alt} loading="lazy" className={`object-cover ${className}`} />;
    return <div className={`bg-brand-cream flex items-center justify-center ${emojiSize} ${className}`} aria-hidden>{emoji}</div>;
}
