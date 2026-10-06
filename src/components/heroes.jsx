import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

// Three hero designs for the landing page. Pick with ?hero=bold|photo|minimal while we
// compare them; DEFAULT_HERO is what visitors see without the parameter.
export const DEFAULT_HERO = 'bold';
export const HERO_VARIANTS = ['bold'];
export const getHeroVariant = (search) => {
    const v = new URLSearchParams(search).get('hero');
    return HERO_VARIANTS.includes(v) ? v : DEFAULT_HERO;
};
// Header text colour over each hero (before the visitor scrolls).
export const heroTone = (variant) => (variant === 'minimal' ? 'light' : 'dark');

const LOCAL_PIZZA = '/hero-pizza.webp';

/* ───────────── 1. BOLD MASCOT ───────────── */
function RotatingBadge() {
    return (
        <svg viewBox="0 0 120 120" className="w-full h-full animate-spin-slow" aria-hidden>
            <defs><path id="badge-circle" d="M60,60 m-44,0 a44,44 0 1,1 88,0 a44,44 0 1,1 -88,0" /></defs>
            <circle cx="60" cy="60" r="58" fill="#FFE14D" stroke="#0f3d1a" strokeWidth="3" />
            <text fontSize="14" fontWeight="800" letterSpacing="3.2" fill="#0f3d1a" fontFamily="'Bricolage Grotesque', sans-serif">
                <textPath href="#badge-circle" textLength="270" lengthAdjust="spacing">HOT • FRESH • LOADED •</textPath>
            </text>
        </svg>
    );
}

function Sticker({ children, className = '', rotate = '-3deg' }) {
    return (
        <span className={`inline-flex items-center gap-2 bg-[#FFF8EE] text-[#0f3d1a] border-[3px] border-[#0f3d1a] rounded-full px-4 py-2 text-sm font-extrabold uppercase tracking-wide shadow-[4px_4px_0_#0f3d1a] ${className}`}
            style={{ transform: `rotate(${rotate})` }}>
            {children}
        </span>
    );
}

export function HeroBold({ pizza, deliveryTime, startingPrice }) {
    const img = pizza?.image_url || LOCAL_PIZZA;
    return (
        <section className="relative bg-brand text-[#FFF8EE] overflow-hidden min-h-[100svh] flex flex-col">
            {/* Monster-skin spots, like the logo */}
            <div className="absolute inset-0 pointer-events-none" aria-hidden>
                {[['8%', '18%', '9rem'], ['82%', '10%', '6rem'], ['70%', '78%', '11rem'], ['18%', '82%', '5rem'], ['48%', '8%', '4rem']].map(([l, t, s], i) => (
                    <span key={i} className="absolute rounded-full bg-[#1e8a34]" style={{ left: l, top: t, width: s, height: s }} />
                ))}
            </div>

            <div className="relative flex-1 w-full max-w-6xl mx-auto px-4 pt-32 pb-24 lg:pt-32 grid lg:grid-cols-[1.1fr_1fr] gap-12 items-center">
                <div>
                    <h1 className="font-display font-extrabold uppercase leading-[0.9] tracking-tight text-[3.1rem] sm:text-7xl lg:text-[4.9rem] xl:text-[5.4rem] [&_.anim-line]:whitespace-nowrap"
                        style={{ textShadow: '5px 5px 0 #0f5f24' }}>
                        <span className="anim-line"><span style={{ '--d': '150ms' }}>Hunger is a</span></span>
                        <span className="anim-line"><span className="text-[#FFE14D]" style={{ '--d': '280ms' }}>Deadly</span></span>
                        <span className="anim-line"><span style={{ '--d': '410ms' }}>Virus.</span></span>
                    </h1>
                    <p className="anim-fade-up mt-7 text-lg md:text-xl text-white/85 max-w-md font-medium" style={{ '--d': '550ms' }}>
                        Loaded, made-to-order pizzas that spread fast across Phagwara. Catch one in about {deliveryTime} minutes.
                    </p>
                    <div className="anim-fade-up flex flex-wrap gap-4 mt-9" style={{ '--d': '680ms' }}>
                        <Link to="/order" className="group inline-flex items-center gap-2 bg-[#FFE14D] text-[#0f3d1a] border-[3px] border-[#0f3d1a] font-extrabold text-lg px-7 py-3.5 rounded-2xl shadow-[5px_5px_0_#0f3d1a] hover:shadow-[2px_2px_0_#0f3d1a] hover:translate-x-[3px] hover:translate-y-[3px] transition-all">
                            Order Now <ArrowRight size={20} className="transition group-hover:translate-x-1" />
                        </Link>
                        <Link to="/menu" className="inline-flex items-center bg-[#FFF8EE] text-[#0f3d1a] border-[3px] border-[#0f3d1a] font-extrabold text-lg px-7 py-3.5 rounded-2xl shadow-[5px_5px_0_#0f3d1a] hover:shadow-[2px_2px_0_#0f3d1a] hover:translate-x-[3px] hover:translate-y-[3px] transition-all">
                            See Menu
                        </Link>
                    </div>
                    <div className="anim-fade-up flex flex-wrap gap-3 mt-10" style={{ '--d': '820ms' }}>
                        <Sticker rotate="-4deg">⚡ {deliveryTime} min delivery</Sticker>
                        {startingPrice && <Sticker rotate="3deg">From ₹{startingPrice}</Sticker>}
                        <Sticker rotate="-2deg">Veg &amp; Non-veg</Sticker>
                    </div>
                </div>

                {/* Pizza + mascot */}
                <div className="relative mx-auto w-full max-w-[min(34rem,70svh)] aspect-square">
                    <div className="anim-pizza-in absolute inset-[4%]" style={{ '--d': '200ms' }}>
                        <div className="w-full h-full rounded-full border-[6px] border-[#0f3d1a] shadow-[10px_10px_0_#0f3d1a] overflow-hidden bg-[#FFF8EE]">
                            <img src={img} alt={pizza?.name || 'Pizza'} fetchpriority="high" className="w-full h-full object-cover animate-spin-slow" />
                        </div>
                    </div>
                    <div className="anim-pop absolute -left-4 sm:-left-10 bottom-0 w-[42%]" style={{ '--d': '750ms' }}>
                        <img src="/logo.png" alt="Pizza Virus mascot" className="w-full -rotate-12 drop-shadow-[8px_8px_0_#0f3d1a] animate-float" />
                    </div>
                    <div className="anim-pop absolute -right-2 top-0 w-[28%]" style={{ '--d': '950ms' }}>
                        <RotatingBadge />
                    </div>
                </div>
            </div>

            {/* Wavy edge into the next (cream) section */}
            <svg className="absolute bottom-0 inset-x-0 w-full h-10 md:h-16" viewBox="0 0 1440 80" preserveAspectRatio="none" aria-hidden>
                <path d="M0,40 C180,80 360,0 540,40 C720,80 900,0 1080,40 C1260,80 1350,20 1440,40 L1440,80 L0,80 Z" fill="#FFF8EE" />
            </svg>
        </section>
    );
}

