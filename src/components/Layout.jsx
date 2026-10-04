import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Navigate, Outlet, useLocation } from 'react-router-dom';
import { Home, UtensilsCrossed, ShoppingCart, User, MapPin, Tag, Package, ChevronDown, Pizza, ArrowRight, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useStore } from '../contexts/StoreContext';
import { getSession, setSession } from '../lib/storage';
import WhatsAppButton from './WhatsAppButton';
import Footer from './Footer';
import { FullPageSpinner } from './ui';

const NAV = [
    { to: '/', label: 'Home', icon: Home, end: true },
    { to: '/order', label: 'Order', icon: Pizza },
    { to: '/menu', label: 'Menu', icon: UtensilsCrossed },
    { to: '/offers', label: 'Offers', icon: Tag },
    { to: '/orders', label: 'My Orders', icon: Package },
];

// True once the page has scrolled past `offset` px.
function useScrolled(offset = 40) {
    const [scrolled, setScrolled] = useState(false);
    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > offset);
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, [offset]);
    return scrolled;
}

// Highlighted announcement strip shown above the landing-page header. Collapses once the
// visitor scrolls, and can be dismissed for the rest of the session.
function AnnouncementBar({ hidden, onClose }) {
    return (
        <div className={`overflow-hidden transition-[max-height,opacity] duration-500 ${hidden ? 'max-h-0 opacity-0' : 'max-h-16 opacity-100'}`}>
            <div className="relative bg-gradient-to-r from-[#0f5f24] via-brand to-[#0f5f24] text-white">
                <span className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/25 to-transparent skew-x-[-20deg] animate-sweep" aria-hidden />
                <div className="relative max-w-6xl mx-auto px-10 py-2.5 flex items-center justify-center gap-2.5 text-xs sm:text-sm font-bold text-center">
                    <span className="relative flex shrink-0">
                        <span className="absolute inset-0 rounded-full bg-lime-300 animate-ping opacity-50" />
                        <span className="relative bg-lime-300 text-[#0f3d1a] rounded-full px-2 py-0.5 text-[11px] font-extrabold tracking-wide">NEW</span>
                    </span>
                    <span>We're now taking orders on the web!</span>
                    <Link to="/order" className="hidden sm:inline-flex items-center gap-1 underline decoration-lime-300 decoration-2 underline-offset-4 hover:text-lime-200">
                        Order now <ArrowRight size={14} />
                    </Link>
                </div>
                <button onClick={onClose} aria-label="Dismiss announcement"
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/15">
                    <X size={15} />
                </button>
            </div>
        </div>
    );
}

function Header({ overlay }) {
    const { user } = useAuth();
    const { cartCount } = useCart();
    const { selectedStore, stores } = useStore();
    const scrolled = useScrolled();
    const [barClosed, setBarClosed] = useState(() => getSession('announce_closed') === '1');
    // On the landing page the header floats transparently (dark text) over the light hero
    // and turns solid green once the visitor scrolls.
    const light = overlay && !scrolled;
    const position = overlay
        ? `fixed inset-x-0 top-0 transition-colors duration-300 ${scrolled ? 'bg-brand shadow-lg' : 'bg-transparent'}`
        : 'sticky top-0 bg-brand shadow-md';
    const subtle = light ? 'hover:bg-ink/5' : 'hover:bg-white/10';

    return (
        <header className={`${position} z-40 ${light ? 'text-ink' : 'text-white'}`}>
            {overlay && (
                <AnnouncementBar hidden={scrolled || barClosed}
                    onClose={() => { setBarClosed(true); setSession('announce_closed', '1'); }} />
            )}
            <div className="max-w-6xl mx-auto px-4 h-16 flex items-center gap-4">
                <Link to="/" className="flex items-center gap-2.5 shrink-0">
                    <img src="/logo.png" alt="" className="w-10 h-10 rounded-xl object-cover bg-white" />
                    <span className="leading-tight">
                        <span className="block font-extrabold tracking-wider text-lg">PIZZA VIRUS</span>
                        <span className={`hidden sm:block text-[11px] font-medium ${light ? 'text-slate-500' : 'text-white/75'}`}>Hunger is a Deadly Virus</span>
                    </span>
                </Link>

                <nav className="hidden lg:flex items-center gap-1 ml-4">
                    {NAV.map(({ to, label, end }) => (
                        <NavLink key={to} to={to} end={end}
                            className={({ isActive }) => `px-3 py-2 rounded-xl text-sm font-bold transition ${isActive ? (light ? 'bg-ink/[0.07]' : 'bg-white/20') : subtle}`}>
                            {label}
                        </NavLink>
                    ))}
                </nav>

                <div className="flex-1" />

                {selectedStore && (
                    <Link to={stores.length > 1 ? '/stores' : '/order'} title="Delivering from"
                        className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold max-w-[160px] ${light ? 'bg-white border border-slate-200 hover:bg-slate-50' : 'bg-white/15 hover:bg-white/25'}`}>
                        <MapPin size={14} className={`shrink-0 ${light ? 'text-brand' : ''}`} />
                        <span className="truncate">{selectedStore.name}</span>
                        {stores.length > 1 && <ChevronDown size={14} className="shrink-0" />}
                    </Link>
                )}

                <Link to="/cart" className={`relative hidden md:flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-extrabold ${light ? 'bg-brand text-white hover:bg-brand-cta' : 'bg-white text-brand hover:bg-brand-cream'}`}>
                    <ShoppingCart size={18} />
                    Cart
                    {cartCount > 0 && (
                        <span key={cartCount} className="anim-bump absolute -top-2 -right-2 bg-red-500 text-white text-[11px] min-w-5 h-5 px-1 rounded-full flex items-center justify-center">{cartCount}</span>
                    )}
                </Link>

                <Link to={user ? '/profile' : '/login'} className={`hidden md:flex items-center gap-2 ${subtle} rounded-xl px-3 py-2 text-sm font-bold`}>
                    <User size={18} />
                    <span className="max-w-[110px] truncate">{user ? (user.user_metadata?.name?.split(' ')[0] || 'Account') : 'Sign In'}</span>
                </Link>
            </div>
        </header>
    );
}

function BottomNav() {
    const { cartCount } = useCart();
    const items = [
        { to: '/', label: 'Home', icon: Home, end: true },
        { to: '/menu', label: 'Menu', icon: UtensilsCrossed },
        { to: '/cart', label: 'Cart', icon: ShoppingCart, badge: cartCount },
        { to: '/profile', label: 'Profile', icon: User },
    ];
    return (
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200 pb-[env(safe-area-inset-bottom)]">
            <div className="grid grid-cols-4">
                {items.map(({ to, label, icon: Icon, end, badge }) => (
                    <NavLink key={to} to={to} end={end}
                        className={({ isActive }) => `flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-bold ${isActive ? 'text-brand-light' : 'text-slate-400'}`}>
                        <span className="relative">
                            <Icon size={22} />
                            {badge > 0 && (
                                <span key={badge} className="anim-bump absolute -top-1.5 -right-2.5 bg-red-500 text-white text-[10px] min-w-4 h-4 px-1 rounded-full flex items-center justify-center">{badge}</span>
                            )}
                        </span>
                        {label}
                    </NavLink>
                ))}
            </div>
        </nav>
    );
}


// Account-level redirects that apply everywhere inside the main layout.
function AccountGate({ children }) {
    const { user, recoveryMode } = useAuth();
    if (recoveryMode) return <Navigate to="/reset-password" replace />;
    if (user && !user.user_metadata?.name) return <Navigate to="/set-name" replace />;
    return children;
}

// Thin gradient bar across the top showing how far down the page the visitor is.
function ScrollProgress() {
    const ref = useRef(null);
    useEffect(() => {
        let raf = 0;
        const update = () => {
            raf = 0;
            const max = document.documentElement.scrollHeight - window.innerHeight;
            if (ref.current) ref.current.style.transform = `scaleX(${max > 0 ? window.scrollY / max : 0})`;
        };
        const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
        update();
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll);
        return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); cancelAnimationFrame(raf); };
    }, []);
    return <div ref={ref} className="fixed top-0 inset-x-0 h-1 z-50 origin-left bg-gradient-to-r from-brand via-lime-400 to-orange-400" style={{ transform: 'scaleX(0)' }} aria-hidden />;
}

export default function Layout() {
    const { pathname } = useLocation();
    const isLanding = pathname === '/';
    return (
        <div className="min-h-screen flex flex-col bg-slate-50">
            {isLanding && <ScrollProgress />}
            <Header overlay={isLanding} />
            {/* The landing page is full-bleed and manages its own section spacing. */}
            <main className={isLanding ? 'flex-1' : 'flex-1 w-full max-w-6xl mx-auto px-4 py-6 pb-24 md:pb-10'}>
                {/* Keyed on the path so every page change replays the enter animation */}
                <div key={pathname} className={isLanding ? '' : 'page-enter'}>
                    <AccountGate><Outlet /></AccountGate>
                </div>
            </main>
            <Footer flush={isLanding} />
            <WhatsAppButton raised={pathname.startsWith('/product/')} />
            <BottomNav />
        </div>
    );
}

// Wraps pages that need a selected store (menu, cart, ...). Sends the customer through
// store select -> delivery-zone check first, like the app's StoreSelect -> ZoneCheck flow.
export function RequireStore() {
    const { selectedStore, loading } = useStore();
    const location = useLocation();
    if (loading) return <FullPageSpinner label="Loading..." />;
    const next = location.pathname + location.search;
    if (!selectedStore) return <Navigate to={`/stores?next=${encodeURIComponent(next)}`} replace />;
    if (!getSession(`zone_checked_${selectedStore.id}`)) {
        return <Navigate to={`/zone-check?next=${encodeURIComponent(next)}`} replace />;
    }
    return <Outlet />;
}

export function RequireAuth() {
    const { user, loading } = useAuth();
    const location = useLocation();
    if (loading) return <FullPageSpinner />;
    if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
    return <Outlet />;
}
