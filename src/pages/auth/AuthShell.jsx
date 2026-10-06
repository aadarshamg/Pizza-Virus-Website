import { Link } from 'react-router-dom';

// Split layout for sign-in / sign-up screens: brand panel on desktop, compact header on mobile.
export default function AuthShell({ title, subtitle, children, footer }) {
    return (
        <div className="min-h-screen grid lg:grid-cols-2 bg-white">
            <div className="hidden lg:flex relative overflow-hidden bg-gradient-to-br from-brand to-green-800 text-white p-12 flex-col justify-between">
                <div className="absolute -right-24 -top-24 w-96 h-96 rounded-full bg-white/10" />
                <div className="absolute -left-16 bottom-10 w-64 h-64 rounded-full bg-white/10" />
                <Link to="/" className="relative flex items-center gap-3">
                    <img src="/logo-192.webp" alt="" className="object-contain w-12 h-12 rounded-2xl" />
                    <span className="font-extrabold tracking-wider text-xl">PIZZA VIRUS</span>
                </Link>
                <div className="relative anim-fade-up" style={{ '--d': '150ms' }}>
                    <img src="/logo-192.webp" alt="" className="object-contain w-20 h-20 rounded-3xl mb-6 drop-shadow-2xl animate-float" />
                    <h2 className="font-display text-5xl font-extrabold leading-tight">Hunger is a<br />Deadly Virus.</h2>
                    <p className="text-white/80 mt-4 text-lg max-w-md">Order hot, fresh pizzas and collect slices for a free pizza with Pizza Rewards.</p>
                </div>
                <p className="relative text-white/60 text-sm">© {new Date().getFullYear()} CLOUD PAKASALA PRIVATE LIMITED</p>
            </div>

            <div className="flex flex-col">
                <div className="lg:hidden bg-brand text-white px-6 pt-8 pb-10 rounded-b-[2rem]">
                    <Link to="/" className="flex items-center gap-3">
                        <img src="/logo-192.webp" alt="" className="object-contain w-11 h-11 rounded-xl" />
                        <span>
                            <span className="block font-extrabold tracking-wider text-lg">PIZZA VIRUS</span>
                            <span className="block text-xs text-white/75">Hunger is a Deadly Virus</span>
                        </span>
                    </Link>
                </div>
                <div className="flex-1 flex items-center justify-center p-6">
                    <div className="w-full max-w-sm anim-fade-up" style={{ '--d': '80ms' }}>
                        <h1 className="text-3xl font-extrabold text-ink">{title}</h1>
                        {subtitle && <p className="text-slate-500 mt-1 mb-6">{subtitle}</p>}
                        {children}
                        {footer && <div className="mt-6 text-center text-sm text-slate-500">{footer}</div>}
                    </div>
                </div>
            </div>
        </div>
    );
}
