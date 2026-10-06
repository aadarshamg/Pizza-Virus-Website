import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    ArrowRight, Zap, MapPin, Phone, Store, SlidersHorizontal, Bike, Leaf, Wallet, ChefHat,
    Copy, Check, ChevronDown, Star, Ruler, Smartphone, Gift,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useStore } from '../contexts/StoreContext';
import { useCart } from '../contexts/CartContext';
import { getLowestPrice } from '../utils/pricing';
import { TRACK_STAGES } from '../utils/orderStatus';
import ProductCard from '../components/ProductCard';
import FounderStory from '../components/FounderStory';
import { HeroBold } from '../components/heroes';

// Public information landing page. No store / zone / login gate - everything here is
// read-only and shown for the remembered store, or the first active store.

// Fires once when the element scrolls into view.
function useInView(threshold = 0.25) {
    const ref = useRef(null);
    const [inView, setInView] = useState(false);
    useEffect(() => {
        const el = ref.current;
        if (!el || inView) return;
        const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setInView(true); io.disconnect(); } }, { threshold });
        io.observe(el);
        return () => io.disconnect();
    }, [inView, threshold]);
    return [ref, inView];
}

function CountUp({ value, suffix = '', prefix = '', start }) {
    const [n, setN] = useState(0);
    useEffect(() => {
        if (!start || !value) return;
        const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        if (reduce) return setN(value);
        const t0 = performance.now();
        let raf;
        const tick = (t) => {
            const p = Math.min(1, (t - t0) / 1200);
            setN(Math.round(value * (1 - Math.pow(1 - p, 3))));
            if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [start, value]);
    return <>{prefix}{n}{suffix}</>;
}

function Eyebrow({ children, dark = false }) {
    return (
        <p className={`inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.2em] ${dark ? 'text-lime-300' : 'text-brand'}`}>
            <span className={`w-6 h-0.5 rounded ${dark ? 'bg-lime-300' : 'bg-brand'}`} />{children}
        </p>
    );
}

function SectionHead({ eyebrow, title, sub, dark = false, center = false }) {
    return (
        <div className={`reveal ${center ? 'max-w-4xl mx-auto text-center' : 'max-w-2xl'}`}>
            <Eyebrow dark={dark}>{eyebrow}</Eyebrow>
            <h2 className={`font-display text-4xl md:text-5xl font-extrabold uppercase tracking-tight leading-[1] mt-3 ${dark ? 'text-white' : 'text-pv-ink'}`}>{title}</h2>
            {sub && <p className={`mt-4 text-lg ${dark ? 'text-white/70' : 'text-slate-500'}`}>{sub}</p>}
        </div>
    );
}

const FAQS = [
    ['Where do you deliver?', 'We currently deliver in select areas of Phagwara, around Law Gate / LPU. When you start an order we check your location against our delivery zone. If you are outside it, you can still order for someone who is inside it.'],
    ['How long does delivery take?', 'Most orders arrive in about 30 minutes. You can watch every step (confirmed, preparing, on the way, delivered) live on your order page.'],
    ['How can I pay?', 'Pay online with UPI, cards or net banking through PhonePe, or choose Cash on Delivery where it is available (a small handling fee may apply).'],
    ['How do Pizza Rewards work?', 'Every eligible order earns you a pizza slice. Collect the full set and redeem a free pizza at checkout. Your progress is shown in your account.'],
    ['Can I cancel or get a refund?', 'Please see our Refund & Cancellation Policy for the details, or call us and we will sort it out.'],
];

export default function Landing() {
    const navigate = useNavigate();
    const { stores, selectedStore, setSelectedStore } = useStore();
    const { cartCount, clearCart } = useCart();
    const store = selectedStore || stores[0] || null;

    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [offers, setOffers] = useState([]);
    const [reward, setReward] = useState({ required: 6, value: 250, enabled: true });
    const [deliveryTime, setDeliveryTime] = useState(30);
    const [hours, setHours] = useState(null);
    const [activeTab, setActiveTab] = useState(null);
    const [copied, setCopied] = useState(null);

    useEffect(() => { document.title = 'Pizza Virus | Fresh Pizza Delivery in Phagwara'; }, []);

    useEffect(() => {
        if (!store?.id) return;
        supabase.from('products').select('*, category:categories(name)').eq('store_id', store.id).eq('is_available', true)
            .order('is_featured', { ascending: false }).order('created_at', { ascending: false })
            .then(({ data }) => setProducts(data || []));
        supabase.from('categories').select('*').eq('store_id', store.id).order('sort_order', { ascending: true })
            .then(({ data }) => setCategories(data || []));
        supabase.from('store_settings').select('key, value').eq('store_id', store.id)
            .in('key', ['delivery_time_minutes', 'opening_time', 'closing_time'])
            .then(({ data }) => {
                const m = {};
                data?.forEach(r => { m[r.key] = r.value; });
                if (m.delivery_time_minutes) setDeliveryTime(Number(m.delivery_time_minutes));
                if (m.opening_time && m.closing_time) setHours({ open: m.opening_time, close: m.closing_time });
            });
    }, [store?.id]);

    useEffect(() => {
        const now = new Date();
        supabase.from('offers').select('*').eq('is_active', true).order('created_at', { ascending: false })
            .then(({ data }) => setOffers((data || []).filter(o => !o.valid_to || new Date(o.valid_to) >= now).slice(0, 3)));
        supabase.from('store_settings').select('key, value').is('store_id', null)
            .in('key', ['reward_enabled', 'reward_slices_required', 'reward_pizza_value'])
            .then(({ data }) => {
                const m = {};
                data?.forEach(r => { m[r.key] = r.value; });
                setReward(prev => ({
                    enabled: m.reward_enabled !== undefined ? m.reward_enabled !== 'false' : prev.enabled,
                    required: m.reward_slices_required ? Number(m.reward_slices_required) : prev.required,
                    value: m.reward_pizza_value ? Number(m.reward_pizza_value) : prev.value,
                }));
            });
    }, []);

    // Single round pizzas photograph best - skip combo / "4 in 1" box shots for the hero art.
    const pizzas = useMemo(() => {
        const all = products.filter(p => p.image_url && (p.product_type || 'pizza') === 'pizza');
        const isBoxShot = (p) => /combo|4\s*in\s*1|party/i.test(`${p.name} ${p.category?.name || ''}`);
        return [...all.filter(p => !isBoxShot(p)), ...all.filter(isBoxShot)];
    }, [products]);
    const heroPizza = pizzas[0] || products.find(p => p.image_url);
    const bentoPizza = pizzas[1] || heroPizza;
    const ctaPizza = pizzas[2] || heroPizza;
    const startingPrice = useMemo(() => {
        const prices = products.map(getLowestPrice).filter(Number.isFinite);
        return prices.length ? Math.min(...prices) : null;
    }, [products]);

    // Menu tabs: categories that actually have products with photos.
    const menuTabs = useMemo(() => categories
        .map(c => ({ ...c, items: products.filter(p => p.category_id === c.id && p.image_url) }))
        .filter(c => c.items.length > 0)
        .slice(0, 5), [categories, products]);
    const currentTab = menuTabs.find(t => t.id === activeTab) || menuTabs[0];
    const marqueeCats = categories.filter(c => c.image_url);

    const [statsRef, statsInView] = useInView(0.4);
    const [rewardRef, rewardInView] = useInView(0.35);

    // Mouse parallax for the hero: writes --mx / --my (-1..1) on the section; layers with
    // .parallax shift by their own --depth. Skipped for touch and reduced-motion users.
    const heroRef = useRef(null);
    const heroRaf = useRef(0);
    const onHeroMove = (e) => {
        const el = heroRef.current;
        if (!el || heroRaf.current || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
        const { clientX, clientY } = e;
        heroRaf.current = requestAnimationFrame(() => {
            heroRaf.current = 0;
            const r = el.getBoundingClientRect();
            el.style.setProperty('--mx', (((clientX - r.left) / r.width) * 2 - 1).toFixed(3));
            el.style.setProperty('--my', (((clientY - r.top) / r.height) * 2 - 1).toFixed(3));
        });
    };
    const onHeroLeave = () => {
        heroRef.current?.style.setProperty('--mx', '0');
        heroRef.current?.style.setProperty('--my', '0');
    };

    const orderFrom = (s) => {
        if (selectedStore && selectedStore.id !== s.id && cartCount > 0) {
            if (!window.confirm('Switching locations will clear your cart since menu items differ by store. Continue?')) return;
            clearCart();
        }
        if (selectedStore?.id !== s.id) setSelectedStore(s);
        navigate('/order');
    };

    const copy = async (code) => {
        try { await navigator.clipboard.writeText(code); } catch { /* ignore */ }
        setCopied(code);
        setTimeout(() => setCopied(null), 2000);
    };

    return (
        <div className="overflow-x-hidden">
            {/* ───────────── HERO (Bold mascot) ───────────── */}
            <HeroBold pizza={heroPizza} deliveryTime={deliveryTime} startingPrice={startingPrice} />

            {/* ───────────── CATEGORY STRIP (below the hero) ───────────── */}
            {marqueeCats.length > 0 && (
                <div className="relative bg-[#FFF8EE] border-y border-orange-100 py-6 group overflow-hidden" aria-label="Menu categories">
                    <div className="flex w-max animate-marquee group-hover:[animation-play-state:paused]">
                        {[...marqueeCats, ...marqueeCats].map((c, i) => (
                            <Link key={`${c.id}-${i}`} to={`/menu?cat=${c.id}`} tabIndex={i >= marqueeCats.length ? -1 : 0}
                                className="group/pill flex items-center gap-3 mx-3 bg-white hover:bg-orange-50 border border-slate-200 hover:border-orange-200 hover:-translate-y-0.5 hover:shadow-md shadow-sm rounded-full pl-1.5 pr-5 py-1.5 shrink-0 transition">
                                <img src={c.image_url} alt="" className="w-10 h-10 rounded-full object-cover group-hover/pill:rotate-12 transition duration-300" />
                                <span className="font-bold text-sm whitespace-nowrap">{c.name}</span>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* ───────────── STATS ───────────── */}
            <section ref={statsRef} className="bg-white border-b border-slate-100">
                <div className="max-w-6xl mx-auto px-4 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
                    {[
                        { v: products.length, suffix: '+', label: 'Items on the menu' },
                        { v: categories.length, label: 'Categories to explore' },
                        { v: deliveryTime, suffix: ' min', label: 'Average delivery' },
                        { v: startingPrice, prefix: '₹', label: 'Pizzas starting at' },
                    ].map((s, si) => (
                        <div key={s.label} className="reveal text-center md:text-left" style={{ '--rd': `${si * 100}ms` }}>
                            <p className="font-display text-4xl md:text-5xl font-extrabold text-ink tracking-tight">
                                {s.v ? <CountUp value={s.v} suffix={s.suffix} prefix={s.prefix} start={statsInView} /> : '0'}
                            </p>
                            <p className="text-sm font-semibold text-slate-500 mt-1">{s.label}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* ───────────── HOW IT WORKS ───────────── */}
            <section id="how" className="bg-pv-cream py-20 md:py-28">
                <div className="max-w-6xl mx-auto px-4">
                    <SectionHead center eyebrow="How it works" title="Craving to doorstep in 3 steps" />
                    <div className="grid md:grid-cols-3 gap-6 mt-14">
                        {[
                            { icon: Store, title: 'Pick your store', text: 'Choose your nearest Pizza Virus kitchen and we confirm we deliver to you.' },
                            { icon: SlidersHorizontal, title: 'Build your pizza', text: 'Pick the size, crust, cheese, toppings and dips. Every pizza is made to order.' },
                            { icon: Bike, title: 'Track it live', text: 'Pay online or cash on delivery, then follow your order until it reaches your door.' },
                        ].map((s, i) => (
                            <div key={s.title} className="reveal group relative bg-white rounded-3xl p-8 pt-10 border-[3px] border-pv-ink shadow-card overflow-hidden hover:-translate-y-1 hover:shadow-brut-lg transition duration-300"
                                style={{ '--rd': `${i * 90}ms` }}>
                                <span className="font-display text-outline absolute -top-4 right-3 text-[8.5rem] font-extrabold leading-none select-none" aria-hidden>0{i + 1}</span>
                                <span className="relative w-14 h-14 rounded-2xl icon-brut shadow-brut-sm transition duration-500 group-hover:rotate-[-8deg] group-hover:scale-110">
                                    <s.icon size={26} />
                                </span>
                                <h3 className="relative font-display text-2xl font-extrabold text-ink mt-6">{s.title}</h3>
                                <p className="relative text-slate-500 mt-2 leading-relaxed">{s.text}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ───────────── MENU PREVIEW ───────────── */}
            {menuTabs.length > 0 && (
                <section id="menu" className="bg-white border-y-[3px] border-pv-ink py-20 md:py-28">
                    <div className="max-w-6xl mx-auto px-4">
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                            <SectionHead eyebrow="Our menu" title="Fresh out of the oven" sub="A taste of what's cooking today. Tap any item to customise it." />
                            <Link to="/menu" className="reveal group inline-flex items-center gap-2 font-extrabold text-brand shrink-0">
                                See full menu <ArrowRight size={18} className="transition group-hover:translate-x-1" />
                            </Link>
                        </div>
                        <div className="reveal flex gap-2 overflow-x-auto no-scrollbar mt-10 pb-1" role="tablist">
                            {menuTabs.map(t => (
                                <button key={t.id} role="tab" aria-selected={t.id === currentTab.id} onClick={() => setActiveTab(t.id)}
                                    className={`chip-brut shrink-0 px-5 py-2.5 text-sm ${t.id === currentTab.id ? 'chip-on' : ''}`}>
                                    {t.name}
                                </button>
                            ))}
                        </div>
                        <div key={currentTab.id} className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mt-8 animate-crossfade">
                            {currentTab.items.slice(0, 4).map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
                        </div>
                    </div>
                </section>
            )}

            {/* ───────────── WHY US - BENTO ───────────── */}
            <section id="why" className="bg-pv-cream py-20 md:py-28">
                <div className="max-w-6xl mx-auto px-4">
                    <SectionHead eyebrow="Why Pizza Virus" title="Made the way you want it." sub="No one-size-fits-all pizzas here. Everything is built to your order." />
                    <div className="grid md:grid-cols-3 md:grid-rows-2 gap-5 mt-12 md:h-[34rem]">
                        {/* Big photo tile */}
                        <div className="reveal-left relative md:col-span-2 md:row-span-1 min-h-[16rem] rounded-3xl overflow-hidden group bg-[#06210f] border-[3px] border-pv-ink shadow-brut">
                            {bentoPizza && <img src={bentoPizza.image_url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:scale-105 transition duration-700" />}
                            <div className="absolute inset-0 bg-gradient-to-r from-[#06210f] via-[#06210f]/70 to-transparent" />
                            <div className="relative h-full p-8 flex flex-col justify-end text-white max-w-sm">
                                <Ruler className="text-lime-300" />
                                <h3 className="font-display text-3xl font-extrabold mt-3">4 sizes, 6″ to 12″</h3>
                                <p className="text-white/70 mt-2">From a solo snack to a party-sized pizza, plus half &amp; full, single &amp; double patty options.</p>
                            </div>
                        </div>
                        {/* Tall tracking tile */}
                        <div className="reveal-right md:row-span-2 rounded-3xl bg-brand text-white p-8 flex flex-col relative overflow-hidden border-[3px] border-pv-ink shadow-brut" style={{ '--rd': '80ms' }}>
                            <div className="absolute -right-16 -bottom-16 w-56 h-56 rounded-full bg-white/10" aria-hidden />
                            <Bike className="text-lime-200" />
                            <h3 className="font-display text-3xl font-extrabold mt-3">Live order tracking</h3>
                            <p className="text-white/75 mt-2">Watch your pizza go from our oven to your door.</p>
                            <div className="mt-auto pt-8 space-y-4 relative">
                                {TRACK_STAGES.map((s, i) => (
                                    <div key={s.key} className="flex items-center gap-3">
                                        <span className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-extrabold ${i < 3 ? 'bg-white text-brand' : 'bg-white/15 text-white/60'}`}>
                                            {i < 2 ? <Check size={16} strokeWidth={3} /> : i + 1}
                                        </span>
                                        <span className={`font-bold ${i < 3 ? '' : 'text-white/60'}`}>{s.label}</span>
                                        {i === 2 && <span className="ml-auto text-[0.625rem] font-extrabold bg-lime-300 text-[#06210f] rounded-full px-2 py-0.5 animate-pulse">LIVE</span>}
                                    </div>
                                ))}
                            </div>
                        </div>
                        {/* Small tiles */}
                        <div className="reveal grid grid-cols-1 sm:grid-cols-3 md:col-span-2 gap-5" style={{ '--rd': '140ms' }}>
                            {[
                                { icon: ChefHat, title: 'Your crust, your cheese', text: 'Crusts, bases, cheese, toppings & dips.', tone: 'bg-amber-50 text-amber-600' },
                                { icon: Leaf, title: 'Veg & non-veg', text: 'Clearly marked, always.', tone: 'bg-green-50 text-green-600' },
                                { icon: Wallet, title: 'Pay your way', text: 'UPI, cards, or cash on delivery.', tone: 'bg-sky-50 text-sky-600' },
                            ].map(t => (
                                <div key={t.title} className="bg-white rounded-3xl p-6 border-[3px] border-pv-ink shadow-card hover:-translate-y-1 hover:shadow-brut-lg transition duration-300">
                                    <span className={`w-11 h-11 rounded-xl icon-brut`}><t.icon size={22} /></span>
                                    <h3 className="font-display text-lg font-extrabold text-ink mt-4 leading-tight">{t.title}</h3>
                                    <p className="text-sm text-slate-500 mt-1">{t.text}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ───────────── FOUNDER STORY (edited in admin > Website) ───────────── */}
            <FounderStory />

            {/* ───────────── REWARDS ───────────── */}
            {reward.enabled && (
                <section id="rewards" ref={rewardRef} className="relative overflow-hidden bg-gradient-to-br from-violet-700 via-purple-700 to-fuchsia-600 text-white py-20 md:py-28">
                    <div className="absolute inset-0 bg-dots opacity-60" aria-hidden />
                    <div className="relative max-w-6xl mx-auto px-4 grid lg:grid-cols-2 gap-12 items-center">
                        <div>
                            <SectionHead dark eyebrow="Pizza Rewards" title={<>Collect {reward.required} slices.<br />Eat one pizza free.</>}
                                sub={`Every eligible order earns you a slice. Fill the box and redeem a free pizza worth ₹${reward.value} at checkout.`} />
                            <div className="reveal flex flex-wrap gap-3 mt-8">
                                <Link to="/signup" className="btn-yellow px-6 py-3.5">
                                    <Gift size={18} /> Start collecting
                                </Link>
                                <Link to="/order" className="btn-white px-6 py-3.5">
                                    Order now
                                </Link>
                            </div>
                        </div>
                        <div className="reveal-zoom relative bg-white/10 border-[3px] border-pv-ink shadow-brut-lg rounded-[2rem] p-8 md:p-10" style={{ '--rd': '120ms' }}>
                            <p className="font-extrabold">
                                Your slice box <span className="ml-2 text-sm font-bold text-white/60"><CountUp value={reward.required} start={rewardInView} />/{reward.required} collected</span>
                            </p>
                            {heroPizza ? (
                                <PizzaAssemble image={heroPizza.image_url} slices={reward.required} show={rewardInView} />
                            ) : (
                                <div className="grid gap-3 mt-6" style={{ gridTemplateColumns: `repeat(${Math.min(reward.required, 6)}, minmax(0, 1fr))` }}>
                                    {Array.from({ length: reward.required }, (_, i) => (
                                        <div key={i} className="aspect-square rounded-2xl bg-white flex items-center justify-center">
                                            <PizzaSlice className="w-[82%] h-[82%]" />
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div className={`absolute -top-8 right-4 md:-right-6 rotate-12 bg-lime-300 text-[#1e0b3a] rounded-2xl px-5 py-3 shadow-2xl transition-all duration-500 ${rewardInView ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}
                                style={{ transitionDelay: `${reward.required * 220 + 500}ms` }}>
                                <p className="font-display text-3xl font-extrabold leading-none">FREE</p>
                                <p className="text-xs font-extrabold">pizza ₹{reward.value}</p>
                            </div>
                        </div>
                    </div>
                </section>
            )}

            {/* ───────────── OFFERS ───────────── */}
            {offers.length > 0 && (
                <section id="offers" className="bg-white border-y-[3px] border-pv-ink py-20 md:py-28">
                    <div className="max-w-6xl mx-auto px-4">
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                            <SectionHead eyebrow="Deals" title="Today's offers" sub="Copy a code and apply it in your cart." />
                            <Link to="/offers" className="reveal group inline-flex items-center gap-2 font-extrabold text-brand shrink-0">
                                All offers <ArrowRight size={18} className="transition group-hover:translate-x-1" />
                            </Link>
                        </div>
                        <div className={`grid gap-5 mt-10 ${offers.length >= 3 ? 'md:grid-cols-3' : 'md:grid-cols-2 lg:grid-cols-3'}`}>
                            {offers.map((o, i) => (
                                <div key={o.id} className="reveal-zoom relative rounded-3xl bg-gradient-to-br from-orange-500 to-rose-500 text-white p-7 overflow-hidden hover:-translate-y-1 transition duration-300"
                                    style={{ '--rd': `${i * 90}ms` }}>
                                    <span className="absolute -right-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white" aria-hidden />
                                    <span className="absolute -left-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white" aria-hidden />
                                    <p className="font-display text-4xl font-extrabold">{o.discount_type === 'percentage' ? `${o.discount_value}% OFF` : `₹${o.discount_value} OFF`}</p>
                                    <p className="text-white/85 text-sm mt-1">{o.min_order_amount > 0 ? `On orders above ₹${o.min_order_amount}` : 'On your order'}</p>
                                    <div className="border-t-2 border-dashed border-white/40 my-5" />
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="font-extrabold tracking-[0.2em] text-lg">{o.code}</span>
                                        <button onClick={() => copy(o.code)} className="btn-white text-xs px-3 py-2 rounded-xl shadow-brut-sm">
                                            {copied === o.code ? <Check size={14} /> : <Copy size={14} />}{copied === o.code ? 'Copied' : 'Copy'}
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {/* Fill the row when there are few coupons */}
                            {offers.length < 3 && (
                                <div className={`reveal-zoom rounded-3xl bg-pv-ink text-white p-7 border-[3px] border-pv-ink shadow-brut flex flex-col justify-between gap-6 relative overflow-hidden ${offers.length === 1 ? 'lg:col-span-2' : ''}`}
                                    style={{ '--rd': '120ms' }}>
                                    <div className="absolute -right-10 -bottom-10 w-48 h-48 rounded-full bg-brand/40 blur-2xl" aria-hidden />
                                    <div className="relative">
                                        <p className="font-display text-3xl font-extrabold">Want more than a discount?</p>
                                        <p className="text-white/70 mt-2 max-w-md">Every order also fills your slice box. Collect {reward.required} and your next pizza is on us.</p>
                                    </div>
                                    <Link to="/signup" className="relative group self-start inline-flex items-center gap-2 bg-pv-yellow text-pv-ink border-[3px] border-pv-ink shadow-brut hover:shadow-brut-sm hover:translate-x-[2px] hover:translate-y-[2px] font-extrabold px-5 py-3 rounded-2xl transition">
                                        Join Pizza Rewards <ArrowRight size={16} className="transition group-hover:translate-x-1" />
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>
                </section>
            )}

            {/* ───────────── STORES ───────────── */}
            {stores.length > 0 && (
                <section id="stores" className="bg-pv-cream py-20 md:py-28">
                    <div className="max-w-6xl mx-auto px-4">
                        <SectionHead eyebrow="Find us" title={stores.length > 1 ? 'Our kitchens' : 'Our kitchen'} sub="Freshly made, right around the corner." />
                        {stores.length === 1 ? (
                            <SingleStore store={stores[0]} hours={hours} deliveryTime={deliveryTime} onOrder={() => orderFrom(stores[0])} />
                        ) : (
                        <div className="grid md:grid-cols-2 gap-5 mt-10">
                            {stores.map((s, i) => (
                                <div key={s.id} className="reveal bg-white rounded-3xl border-[3px] border-pv-ink shadow-card p-7 flex flex-col sm:flex-row gap-6 sm:items-center hover:shadow-brut-lg transition duration-300"
                                    style={{ '--rd': `${i * 90}ms` }}>
                                    <span className="w-16 h-16 rounded-2xl bg-brand text-white flex items-center justify-center shrink-0 shadow-lg shadow-green-600/30"><MapPin size={28} /></span>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-display text-2xl font-extrabold text-ink">{s.name}</h3>
                                        {s.address_text && <p className="text-slate-500 mt-1">{s.address_text}</p>}
                                        {s.phone && (
                                            <a href={`tel:${s.phone}`} className="inline-flex items-center gap-1.5 text-sm font-bold text-brand mt-2"><Phone size={14} /> {s.phone}</a>
                                        )}
                                    </div>
                                    <button onClick={() => orderFrom(s)} className="group btn-yellow px-5 py-3 shrink-0">
                                        Order here <ArrowRight size={16} className="transition group-hover:translate-x-1" />
                                    </button>
                                </div>
                            ))}
                        </div>
                        )}
                    </div>
                </section>
            )}

            {/* ───────────── APP ───────────── */}
            <section id="app" className="bg-white border-y-[3px] border-pv-ink py-20 md:py-28">
                <div className="max-w-6xl mx-auto px-4">
                    <div className="relative rounded-[2.5rem] bg-gradient-to-br from-brand to-green-800 text-white overflow-hidden px-8 md:px-16 pt-14 md:pt-16 grid md:grid-cols-2 gap-10 items-end">
                        <div className="absolute inset-0 bg-dots" aria-hidden />
                        <div className="relative pb-14 md:pb-16 reveal-left">
                            <Eyebrow dark>Get the app</Eyebrow>
                            <h2 className="font-display text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.05] mt-3">Pizza Virus,<br />in your pocket.</h2>
                            <p className="text-white/75 mt-4 text-lg max-w-sm">Faster reorders, live tracking and your rewards, all in one tap.</p>
                            <div className="flex flex-wrap gap-3 mt-8">
                                {/* TODO: real store URLs */}
                                <StoreBadge href="#" top="GET IT ON" label="Google Play" />
                                <StoreBadge href="#" top="Download on the" label="App Store" />
                            </div>
                        </div>
                        {/* Phone mockup */}
                        <div className="relative flex justify-center reveal-right" style={{ '--rd': '120ms' }}>
                            <div className="w-64 h-[25rem] bg-[#06210f] rounded-t-[2.75rem] border-[0.625rem] border-b-0 border-black/80 shadow-2xl overflow-hidden">
                                <div className="w-24 h-5 bg-black/80 rounded-b-2xl mx-auto" />
                                <div className="px-4 pt-4">
                                    <div className="flex items-center gap-2">
                                        <img src="/logo-192.webp" alt="" className="object-contain w-9 h-9 rounded-xl" />
                                        <div>
                                            <p className="text-xs font-extrabold tracking-wider">PIZZA VIRUS</p>
                                            <p className="text-[0.5625rem] text-white/60">Hunger is a Deadly Virus</p>
                                        </div>
                                    </div>
                                    {heroPizza && <img src={heroPizza.image_url} alt="" className="mt-4 w-full h-28 rounded-2xl object-cover" />}
                                    <div className="grid grid-cols-2 gap-2 mt-3">
                                        {products.filter(p => p.image_url).slice(1, 5).map(p => (
                                            <div key={p.id} className="bg-white/10 rounded-xl p-1.5">
                                                <img src={p.image_url} alt="" className="w-full h-14 rounded-lg object-cover" />
                                                <p className="text-[0.5625rem] font-bold mt-1 truncate">{p.name}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <span className="absolute bottom-16 left-0 md:-left-2 lg:left-6 bg-white text-ink rounded-2xl px-4 py-3 shadow-xl animate-float flex items-center gap-2">
                                <Smartphone size={18} className="text-brand" /><span className="text-sm font-extrabold">Live tracking</span>
                            </span>
                        </div>
                    </div>
                </div>
            </section>

            {/* ───────────── FAQ ───────────── */}
            <section id="faq" className="bg-pv-cream py-20 md:py-28">
                <div className="max-w-3xl mx-auto px-4">
                    <SectionHead center eyebrow="FAQ" title="Questions? Answered." />
                    <div className="mt-10 space-y-3">
                        {FAQS.map(([q, a], i) => (
                            <details key={q} className="reveal group bg-white rounded-2xl border-[3px] border-pv-ink shadow-brut-sm open:shadow-brut transition-all" style={{ '--rd': `${i * 60}ms` }}>
                                <summary className="flex items-center justify-between gap-4 cursor-pointer list-none p-5 md:p-6 font-extrabold text-ink [&::-webkit-details-marker]:hidden">
                                    {q}
                                    <span className="w-8 h-8 rounded-full border-2 border-pv-ink bg-white group-open:bg-pv-yellow flex items-center justify-center shrink-0 transition">
                                        <ChevronDown size={18} className="transition group-open:rotate-180" />
                                    </span>
                                </summary>
                                <p className="faq-answer px-5 md:px-6 pb-6 -mt-1 text-slate-500 leading-relaxed">
                                    {a}{i === FAQS.length - 1 && <> <Link to="/legal/refund" className="font-bold text-brand underline">Read the policy</Link>.</>}
                                </p>
                            </details>
                        ))}
                    </div>
                </div>
            </section>

            {/* ───────────── FINAL CTA ───────────── */}
            <section id="cta" className="relative bg-[#FFF8EE] text-ink overflow-hidden">
                <div className="absolute inset-0 bg-dots-warm" aria-hidden />
                <div className="absolute right-0 top-0 w-[36rem] h-[36rem] rounded-full bg-orange-300/40 blur-[130px]" aria-hidden />
                {ctaPizza && (
                    <img src={ctaPizza.image_url} alt="" aria-hidden
                        className="absolute -right-24 md:-right-16 top-1/2 -translate-y-1/2 w-80 h-80 md:w-[30rem] md:h-[30rem] rounded-full object-cover opacity-30 md:opacity-100 animate-spin-slow shadow-[0_35px_70px_-15px_rgba(154,52,18,0.55)]" />
                )}
                <div className="relative max-w-6xl mx-auto px-4 py-24 md:py-32">
                    <div className="max-w-xl reveal">
                        <h2 className="font-display text-5xl md:text-7xl font-extrabold tracking-tight leading-[0.95]">
                            Hungry?<br /><span className="text-gradient-green">Your pizza</span> is {deliveryTime} min away.
                        </h2>
                        <Link to="/order" className="group mt-10 inline-flex items-center gap-2 bg-pv-yellow text-pv-ink border-[3px] border-pv-ink shadow-brut hover:shadow-brut-sm hover:translate-x-[2px] hover:translate-y-[2px] font-extrabold text-lg px-8 py-4 rounded-2xl transition active:scale-[0.98]">
                            Order Now <ArrowRight size={22} className="transition group-hover:translate-x-1" />
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
}

// A real menu photo cut into `slices` wedges. When `show` turns true the wedges fly in
// one by one from outside and join into a whole pizza, each with a numbered badge.
function PizzaAssemble({ image, slices, show }) {
    const n = Math.max(2, Math.min(slices, 12));
    const C = 110; // centre of the 220 x 220 viewBox
    const R = 96;  // pizza radius
    const pt = (deg, r = R) => [C + r * Math.cos((deg * Math.PI) / 180), C + r * Math.sin((deg * Math.PI) / 180)];
    const wedges = Array.from({ length: n }, (_, i) => {
        const a0 = -90 + (360 / n) * i;
        const a1 = a0 + 360 / n;
        const mid = (a0 + a1) / 2;
        const [x0, y0] = pt(a0);
        const [x1, y1] = pt(a1);
        const d = `M${C},${C} L${x0},${y0} A${R},${R} 0 ${360 / n > 180 ? 1 : 0} 1 ${x1},${y1} Z`;
        const [bx, by] = pt(mid, R * 0.62);
        const out = { x: Math.cos((mid * Math.PI) / 180) * 70, y: Math.sin((mid * Math.PI) / 180) * 70 };
        return { i, d, mid, bx, by, out };
    });
    const uid = useRef(`pz${Math.random().toString(36).slice(2, 8)}`).current;

    return (
        <div className="relative mx-auto mt-6 w-full max-w-[21rem] aspect-square">
            {/* Plate + glow */}
            <div className="absolute inset-[2%] rounded-full bg-white/10 border border-white/20" aria-hidden />
            <div className={`absolute inset-[12%] rounded-full bg-amber-300/40 blur-2xl transition-opacity duration-1000 ${show ? 'opacity-100' : 'opacity-0'}`}
                style={{ transitionDelay: `${n * 220}ms` }} aria-hidden />
            <svg viewBox="0 0 220 220" className="relative w-full h-full overflow-visible" role="img" aria-label={`${n} pizza slices make one free pizza`}>
                <defs>
                    {wedges.map(w => <clipPath key={w.i} id={`${uid}-${w.i}`}><path d={w.d} /></clipPath>)}
                    <filter id={`${uid}-shadow`} x="-30%" y="-30%" width="160%" height="160%">
                        <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#1e0b3a" floodOpacity="0.45" />
                    </filter>
                </defs>
                {/* Empty slots (dashed outlines) waiting to be filled */}
                {wedges.map(w => (
                    <path key={`slot-${w.i}`} d={w.d} fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.35)" strokeWidth="1.2" strokeDasharray="4 4" />
                ))}
                {/* Photo slices */}
                {wedges.map(w => (
                    <g key={w.i} filter={`url(#${uid}-shadow)`}
                        style={{
                            transform: show ? 'translate(0px, 0px) rotate(0deg)' : `translate(${w.out.x}px, ${w.out.y}px) rotate(${w.i % 2 ? 25 : -25}deg)`,
                            transformOrigin: `${w.bx}px ${w.by}px`,
                            opacity: show ? 1 : 0,
                            transition: `transform 0.9s cubic-bezier(0.34, 1.4, 0.64, 1) ${w.i * 220}ms, opacity 0.5s ease-out ${w.i * 220}ms`,
                        }}>
                        <image href={image} x={C - R} y={C - R} width={R * 2} height={R * 2} preserveAspectRatio="xMidYMid slice" clipPath={`url(#${uid}-${w.i})`} />
                        <path d={w.d} fill="none" stroke="#fff" strokeWidth="2.5" strokeLinejoin="round" />
                        {/* Numbered badge */}
                        <circle cx={w.bx} cy={w.by} r="11" fill="#fff" />
                        <text x={w.bx} y={w.by + 4.2} textAnchor="middle" fontSize="12" fontWeight="800" fill="#6d28d9" fontFamily="Plus Jakarta Sans, sans-serif">{w.i + 1}</text>
                    </g>
                ))}
            </svg>
        </div>
    );
}

// Illustrated pizza slice (crust, melted cheese, pepperoni, basil) - consistent on every
// device, unlike the 🍕 emoji which renders differently per OS.
function PizzaSlice({ className = '', style }) {
    return (
        <svg viewBox="4 3 56 58" className={className} style={style} aria-hidden>
            {/* cheese body */}
            <path d="M10 17 Q32 6 54 17 L33.5 58.5 Q32 61 30.5 58.5 Z" fill="#FCD34D" />
            <path d="M32 13 Q43 14 54 17 L33.5 58.5 Q32 61 30.5 58.5 Z" fill="#FBBF24" opacity=".55" />
            {/* cheese drips under the crust */}
            <path d="M14 22 q2 6 4 0 M24 19 q2.2 7 4.4 0 M37 19 q2 5.5 4 0 M46 21 q1.8 5 3.6 0" fill="#FCD34D" />
            {/* crust */}
            <path d="M7 15.5 Q32 2 57 15.5 Q58.5 16.5 57.5 18.5 L56 21 Q32 9 8 21 L6.5 18.5 Q5.5 16.5 7 15.5 Z" fill="#D97706" />
            <path d="M10 15 Q32 4.5 54 15" stroke="#F59E0B" strokeWidth="2.2" strokeLinecap="round" fill="none" />
            {/* pepperoni */}
            <circle cx="24" cy="27" r="5" fill="#DC2626" />
            <circle cx="22.6" cy="25.6" r="1.6" fill="#F87171" />
            <circle cx="39" cy="28.5" r="4.3" fill="#DC2626" />
            <circle cx="37.8" cy="27.3" r="1.3" fill="#F87171" />
            <circle cx="31.5" cy="41" r="3.8" fill="#DC2626" />
            <circle cx="30.5" cy="40" r="1.2" fill="#F87171" />
            {/* basil */}
            <path d="M40 38 q4.5 -2.5 6 1.5 q-4.5 2.5 -6 -1.5 Z" fill="#22973A" />
            <path d="M26.5 49 q-1 -4.5 3 -5 q1 4.5 -3 5 Z" fill="#22973A" />
        </svg>
    );
}

// "18:00" -> "6:00 PM"
const to12h = (t) => {
    const [h, m] = t.split(':').map(Number);
    return `${((h + 11) % 12) + 1}${m ? `:${String(m).padStart(2, '0')}` : ''} ${h < 12 ? 'AM' : 'PM'}`;
};

function SingleStore({ store, hours, deliveryTime, onOrder }) {
    const lat = Number(store.latitude);
    const lng = Number(store.longitude);
    const hasMap = Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0);
    const bbox = `${lng - 0.012},${lat - 0.007},${lng + 0.012},${lat + 0.007}`;
    return (
        <div className="grid lg:grid-cols-[1fr_1.35fr] gap-5 mt-10">
            <div className="reveal-left bg-pv-ink text-white rounded-3xl p-8 md:p-10 border-[3px] border-pv-ink shadow-brut flex flex-col relative overflow-hidden">
                <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-brand/40 blur-3xl" aria-hidden />
                <span className="relative w-14 h-14 rounded-2xl icon-brut"><MapPin size={26} /></span>
                <h3 className="relative font-display text-4xl font-extrabold mt-6">{store.name}</h3>
                {store.address_text && <p className="relative text-white/70 mt-2">{store.address_text}, Phagwara, Punjab</p>}
                <dl className="relative grid grid-cols-2 gap-4 mt-8">
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                        <dt className="text-xs font-bold text-white/50 uppercase tracking-wider">Open</dt>
                        <dd className="font-extrabold mt-1">{hours ? `${to12h(hours.open)} to ${to12h(hours.close)}` : 'Daily'}</dd>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                        <dt className="text-xs font-bold text-white/50 uppercase tracking-wider">Delivery</dt>
                        <dd className="font-extrabold mt-1">~{deliveryTime} minutes</dd>
                    </div>
                </dl>
                <div className="relative flex flex-wrap gap-3 mt-8 lg:mt-auto lg:pt-8">
                    <button onClick={onOrder} className="group inline-flex items-center gap-2 bg-pv-yellow text-pv-ink border-[3px] border-pv-ink shadow-brut hover:shadow-brut-sm hover:translate-x-[2px] hover:translate-y-[2px] font-extrabold px-6 py-3.5 rounded-2xl transition active:scale-[0.98]">
                        Order from {store.name} <ArrowRight size={18} className="transition group-hover:translate-x-1" />
                    </button>
                    <a href={`tel:${store.phone || '+917087041010'}`} className="btn-white px-5 py-3.5">
                        <Phone size={16} /> Call us
                    </a>
                </div>
            </div>
            <div className="reveal-right relative rounded-3xl overflow-hidden border border-slate-200 shadow-card min-h-[22rem] bg-slate-200" style={{ '--rd': '100ms' }}>
                {hasMap ? (
                    <>
                        <iframe title={`Map of ${store.name}`} loading="lazy" className="absolute inset-0 w-full h-full"
                            src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`} />
                        <a href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`} target="_blank" rel="noreferrer"
                            className="absolute bottom-4 right-4 bg-white text-ink font-extrabold text-sm rounded-xl px-4 py-2.5 shadow-xl hover:bg-slate-50 inline-flex items-center gap-2">
                            <MapPin size={16} className="text-brand" /> Get directions
                        </a>
                    </>
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-slate-400 font-bold"><MapPin className="mr-2" /> Phagwara, Punjab</div>
                )}
            </div>
        </div>
    );
}

// Positioned hero layer: parallax (outer) + pop-in entrance (inner). Kept on separate
// elements because each animates `transform` independently.
function Floating({ className, depth, delay, children }) {
    return (
        <div className={`parallax absolute z-10 ${className}`} style={{ '--depth': depth }}>
            <div className="anim-pop" style={{ '--d': delay }}>{children}</div>
        </div>
    );
}

function FloatCard({ className, icon, iconBg, title, sub }) {
    return (
        <div className={`flex items-center gap-3 bg-white/95 backdrop-blur text-ink rounded-2xl pl-2 pr-4 py-2 shadow-[0_20px_50px_-12px_rgba(120,53,15,0.35)] ${className}`}>
            <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg}`}>{icon}</span>
            <span>
                <span className="block font-extrabold leading-tight">{title}</span>
                <span className="block text-xs text-slate-500 font-semibold">{sub}</span>
            </span>
        </div>
    );
}

function StoreBadge({ href, top, label }) {
    return (
        <a href={href} className="inline-flex items-center gap-3 bg-pv-ink text-white rounded-2xl pl-4 pr-5 py-2.5 border-[3px] border-pv-ink shadow-[5px_5px_0_#FFE14D] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] transition-all">
            <Smartphone size={22} />
            <span className="leading-tight text-left">
                <span className="block text-[0.625rem] font-semibold text-white/70">{top}</span>
                <span className="block font-extrabold">{label}</span>
            </span>
        </a>
    );
}
