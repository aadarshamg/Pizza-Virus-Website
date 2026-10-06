import { Link } from 'react-router-dom';
import { Instagram, Facebook, Youtube, Landmark, Wallet, Banknote, Phone, Mail, MapPin } from 'lucide-react';
import { SITE } from '../config/site';

const LINKS = [
    {
        title: 'Order',
        items: [['Order Online', '/order'], ['Full Menu', '/menu'], ['Offers', '/offers'], ['Track Order', '/orders'], ['Pizza Rewards', '/profile']],
    },
    {
        title: 'Policies',
        items: [['Terms & Conditions', '/legal/terms'], ['Privacy Policy', '/legal/privacy'], ['Refund & Cancellation', '/legal/refund'], ['Delivery Policy', '/legal/shipping']],
    },
];

const SOCIALS = [
    { key: 'instagram', label: 'Instagram', Icon: Instagram },
    { key: 'facebook', label: 'Facebook', Icon: Facebook },
    { key: 'youtube', label: 'YouTube', Icon: Youtube },
];

function GoogleG({ size = 22 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
            <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
        </svg>
    );
}

// Google badge: shows the real rating once it's filled in SITE.google, otherwise a
// "Review us on Google" call to action (we never display invented numbers).
function GoogleBadge() {
    const { reviewUrl, rating, reviewCount } = SITE.google;
    const hasRating = rating != null && reviewCount != null;
    const Tag = reviewUrl ? 'a' : 'div';
    return (
        <Tag {...(reviewUrl ? { href: reviewUrl, target: '_blank', rel: 'noopener noreferrer' } : {})}
            className="inline-flex items-center gap-3 bg-white text-ink rounded-xl pl-3 pr-4 py-2.5 shadow-lg hover:-translate-y-0.5 transition">
            <GoogleG />
            <span className="flex text-amber-400 text-base leading-none" aria-hidden>★★★★★</span>
            <span className="text-sm font-extrabold">
                {hasRating ? <>{Number(rating).toFixed(1)} rating from {reviewCount} reviews</> : 'Review us on Google'}
            </span>
        </Tag>
    );
}

function PayBadge({ children, light = false }) {
    return (
        <span className={`inline-flex items-center gap-2 h-9 px-3 rounded-lg text-[0.6875rem] font-extrabold tracking-wide ${light ? 'bg-white text-ink' : 'border border-white/15 text-slate-200'}`}>
            {children}
        </span>
    );
}

export default function Footer({ flush }) {
    const socials = SOCIALS.filter(s => SITE.social[s.key]);
    return (
        <footer className={`relative bg-[#0b0f0c] text-slate-400 pb-20 md:pb-0 overflow-hidden ${flush ? '' : 'mt-16'}`}>
            {/* Top: brand + links */}
            <div className="relative max-w-6xl mx-auto px-4 pt-16 pb-8 grid gap-12 md:grid-cols-[1.4fr_1fr_1fr_1.1fr] text-sm">
                <div>
                    <Link to="/" className="inline-flex items-center gap-3">
                        <img src="/logo-192.webp" alt="" className="object-contain w-12 h-12 rounded-2xl" />
                        <span>
                            <span className="block font-extrabold text-white tracking-wider text-lg">PIZZA VIRUS</span>
                            <span className="block text-xs text-slate-500">Hunger is a Deadly Virus</span>
                        </span>
                    </Link>
                    <p className="mt-5 max-w-xs leading-relaxed">Hot, made-to-order pizzas and more, delivered fresh across Phagwara.</p>
                    <div className="mt-6"><GoogleBadge /></div>

                    <p className="mt-8 text-xs font-extrabold uppercase tracking-[0.2em] text-slate-300">Connect with us</p>
                    <div className="flex gap-3 mt-4">
                        {(socials.length ? socials : SOCIALS).map(({ key, label, Icon }) => {
                            const href = SITE.social[key];
                            return (
                                <a key={key} href={href || undefined} aria-label={label} title={href ? label : `${label} (coming soon)`}
                                    {...(href ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                                    className={`w-11 h-11 rounded-full border border-white/15 flex items-center justify-center text-slate-200 transition duration-300 ${href ? 'hover:bg-lime-400 hover:border-lime-400 hover:text-[#0b0f0c] hover:-translate-y-1' : 'opacity-60 cursor-default'}`}>
                                    <Icon size={18} />
                                </a>
                            );
                        })}
                    </div>
                </div>

                {LINKS.map(col => (
                    <div key={col.title}>
                        <h3 className="text-xs font-extrabold uppercase tracking-[0.2em] text-slate-300 mb-5">{col.title}</h3>
                        <ul className="space-y-3">
                            {col.items.map(([label, to]) => (
                                <li key={to}><Link to={to} className="hover:text-white hover:translate-x-1 inline-block transition">{label}</Link></li>
                            ))}
                        </ul>
                    </div>
                ))}

                <div>
                    <h3 className="text-xs font-extrabold uppercase tracking-[0.2em] text-slate-300 mb-5">Contact</h3>
                    <ul className="space-y-3">
                        <li><a href={SITE.phoneHref} className="flex items-center gap-2.5 hover:text-white transition"><Phone size={15} className="text-lime-400" /> {SITE.phone}</a></li>
                        <li><a href={`mailto:${SITE.email}`} className="flex items-center gap-2.5 hover:text-white transition"><Mail size={15} className="text-lime-400" /> {SITE.email}</a></li>
                        <li className="flex items-start gap-2.5"><MapPin size={15} className="text-lime-400 mt-0.5 shrink-0" /> Law Gate, Phagwara, Punjab</li>
                        <li><Link to="/support" className="hover:text-white transition">Help &amp; Support</Link></li>
                        <li><Link to="/about" className="hover:text-white transition">About</Link></li>
                    </ul>
                </div>
            </div>

            {/* Giant wordmark, cut off by the bottom bar like a stamp */}
            <div className="relative max-w-7xl mx-auto px-4 select-none pointer-events-none" aria-hidden>
                <svg viewBox="0 0 1000 150" className="w-full block reveal" style={{ marginBottom: '-1.2%' }}>
                    <defs>
                        <linearGradient id="wordmark-fill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#1f4a2a" />
                            <stop offset="100%" stopColor="#12261a" />
                        </linearGradient>
                    </defs>
                    <text x="500" y="146" textAnchor="middle" textLength="990" lengthAdjust="spacingAndGlyphs"
                        fontFamily="'Bricolage Grotesque', 'Plus Jakarta Sans', sans-serif" fontWeight="800" fontSize="178" fill="url(#wordmark-fill)">
                        PIZZA VIRUS
                    </text>
                </svg>
            </div>

            {/* Bottom bar */}
            <div className="relative border-t border-white/10 bg-[#0b0f0c]">
                <div className="max-w-6xl mx-auto px-4 pt-6 pb-4 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                    <div className="flex flex-wrap items-center gap-2.5">
                        <span className="text-[0.6875rem] font-bold uppercase tracking-[0.2em] text-slate-500 mr-1">We accept</span>
                        <PayBadge light><span className="font-black italic text-[#1a1f71] text-sm tracking-tight">VISA</span></PayBadge>
                        <PayBadge light>
                            <span className="relative flex w-7 h-4" aria-label="Mastercard">
                                <span className="absolute left-0 w-4 h-4 rounded-full bg-[#eb001b]" />
                                <span className="absolute right-0 w-4 h-4 rounded-full bg-[#f79e1b] mix-blend-multiply" />
                            </span>
                        </PayBadge>
                        <PayBadge light><span className="font-black italic text-sm tracking-tight"><span className="text-[#097939]">U</span><span className="text-[#ed752e]">P</span><span className="text-[#097939]">I</span></span></PayBadge>
                        <PayBadge><Landmark size={14} className="text-lime-400" /> NET BANKING</PayBadge>
                        <PayBadge><Wallet size={14} className="text-lime-400" /> WALLET</PayBadge>
                        <PayBadge><Banknote size={14} className="text-lime-400" /> CASH ON DELIVERY</PayBadge>
                    </div>
                    <p className="text-xs text-slate-500 shrink-0">
                        <Link to="/legal/privacy" className="hover:text-white">Privacy</Link>
                        <span className="mx-1.5">·</span><Link to="/legal/terms" className="hover:text-white">Terms</Link>
                        <span className="mx-1.5">·</span><Link to="/legal/refund" className="hover:text-white">Refunds</Link>
                        <span className="mx-1.5">·</span><Link to="/legal/shipping" className="hover:text-white">Delivery</Link>
                    </p>
                </div>
                <div className="max-w-6xl mx-auto px-4 pb-6">
                    <div className="border-t border-white/5 pt-4 flex flex-col sm:flex-row justify-between gap-2 text-xs text-slate-500">
                        <p>© {new Date().getFullYear()} CLOUD PAKASALA PRIVATE LIMITED. All Rights Reserved.</p>
                        <p>
                            Designed and Developed By{' '}
                            <a href="https://falqonstudio.com" target="_blank" rel="noopener noreferrer" className="font-bold text-slate-300 hover:text-lime-300 transition-colors">Falqon Studio</a>
                        </p>
                    </div>
                </div>
            </div>
        </footer>
    );
}
