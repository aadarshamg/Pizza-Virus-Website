import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, X, List } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useStore } from '../contexts/StoreContext';
import { getLowestPrice } from '../utils/pricing';
import MenuItemRow from '../components/MenuItemRow';
import { Button, EmptyState, FullPageSpinner } from '../components/ui';

// One-page menu: every category on a single scrolling page, with a sticky category
// sidebar (desktop) / chip bar + bottom sheet (mobile) that tracks the section in view.
// `/menu?cat=<id>` jumps straight to that category.

const DIETS = [
    { key: 'veg', label: 'Veg', dot: 'bg-brand', on: 'border-brand bg-brand-50 text-green-800' },
    { key: 'nonveg', label: 'Non-veg', dot: 'bg-red-500', on: 'border-red-400 bg-red-50 text-red-700' },
];
// Distance from the top of the viewport at which a section counts as "current".
const SPY_OFFSET = 190;

export default function Menu() {
    const { selectedStore } = useStore();
    const [params] = useSearchParams();
    const deepLinkCat = params.get('cat');

    const [categories, setCategories] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [reloadKey, setReloadKey] = useState(0);
    const [query, setQuery] = useState('');
    const [diet, setDiet] = useState(null); // null | 'veg' | 'nonveg'
    const [activeId, setActiveId] = useState(null);
    const [sheetOpen, setSheetOpen] = useState(false);
    const chipRefs = useRef({});
    const jumpedToDeepLink = useRef(false);

    useEffect(() => {
        if (!selectedStore?.id) return;
        setLoading(true);
        setError(null);
        Promise.all([
            supabase.from('categories').select('*').eq('store_id', selectedStore.id).order('sort_order', { ascending: true }),
            supabase.from('products').select('*').eq('store_id', selectedStore.id).eq('is_available', true).order('created_at', { ascending: true }),
        ]).then(([catRes, prodRes]) => {
            if (catRes.error || prodRes.error) throw catRes.error || prodRes.error;
            setCategories(catRes.data || []);
            setProducts(prodRes.data || []);
        }).catch(() => setError('Could not load the menu. Check your connection and try again.'))
            .finally(() => setLoading(false));
    }, [selectedStore?.id, reloadKey]);

    // Group -> filter (search + veg) -> drop empty categories. Cheapest first inside a category.
    const sections = useMemo(() => {
        const q = query.trim().toLowerCase();
        return categories.map(cat => {
            const catMatches = q && cat.name.toLowerCase().includes(q);
            const items = products
                .filter(p => p.category_id === cat.id)
                .filter(p => (diet === 'veg' ? p.is_veg : diet === 'nonveg' ? !p.is_veg : true))
                .filter(p => !q || catMatches || p.name.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q))
                .sort((a, b) => getLowestPrice(a) - getLowestPrice(b));
            return { ...cat, items };
        }).filter(s => s.items.length > 0);
    }, [categories, products, query, diet]);

    const totalItems = sections.reduce((n, s) => n + s.items.length, 0);

    // Scroll-spy: the current section is the last one whose top has passed SPY_OFFSET.
    useEffect(() => {
        if (!sections.length) return;
        let raf = 0;
        const update = () => {
            raf = 0;
            let current = sections[0].id;
            for (const s of sections) {
                const el = document.getElementById(`cat-${s.id}`);
                if (el && el.getBoundingClientRect().top <= SPY_OFFSET) current = s.id;
            }
            setActiveId(current);
        };
        const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
        update();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf); };
    }, [sections]);

    // Keep the active chip visible in the mobile chip bar.
    useEffect(() => {
        chipRefs.current[activeId]?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
    }, [activeId]);

    const jumpTo = useCallback((id, smooth = true) => {
        setSheetOpen(false);
        const el = document.getElementById(`cat-${id}`);
        if (!el) return;
        el.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
        setActiveId(id);
    }, []);

    // Deep link (?cat=...): jump once, after the sections have rendered.
    useEffect(() => {
        if (jumpedToDeepLink.current || !deepLinkCat || !sections.length) return;
        jumpedToDeepLink.current = true;
        requestAnimationFrame(() => jumpTo(deepLinkCat, false));
    }, [deepLinkCat, sections, jumpTo]);

    if (loading) return <FullPageSpinner label="Loading the menu..." />;
    if (error) {
        return <EmptyState emoji="📡" title="Something went wrong" subtitle={error} action={<Button onClick={() => setReloadKey(k => k + 1)}>Retry</Button>} />;
    }

    const counts = Object.fromEntries(sections.map(s => [s.id, s.items.length]));
    const filtersOn = !!query.trim() || !!diet;
    const clearFilters = () => { setQuery(''); setDiet(null); };

    return (
        <>
            <div className="mb-4">
                <h1 className="font-display text-3xl md:text-4xl font-extrabold text-ink tracking-tight">Our Menu</h1>
                <p className="text-sm text-slate-500 font-medium mt-0.5">Delivering from {selectedStore?.name}</p>
            </div>

            {/* Sticky search + filters (+ category chips on mobile) */}
            <div className="sticky top-16 z-20 -mx-4 px-4 pt-3 pb-3 bg-slate-50 border-b border-slate-200/70 shadow-[0_8px_16px_-14px_rgba(15,23,42,0.25)]">
                <div className="flex flex-wrap items-center gap-2.5">
                    <label className="flex-1 min-w-[12rem] flex items-center gap-2 bg-white border-2 border-slate-200 focus-within:border-brand-light rounded-2xl px-4 transition">
                        <Search size={18} className="text-slate-400 shrink-0" />
                        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search pizzas, burgers, momos..."
                            aria-label="Search the menu" className="w-full bg-transparent py-2.5 text-sm font-medium outline-none placeholder:text-slate-400" />
                        {query && (
                            <button onClick={() => setQuery('')} aria-label="Clear search" className="text-slate-400 hover:text-ink"><X size={16} /></button>
                        )}
                    </label>
                    {DIETS.map(d => (
                        <button key={d.key} onClick={() => setDiet(v => (v === d.key ? null : d.key))} aria-pressed={diet === d.key}
                            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-2xl border-2 text-sm font-extrabold transition ${diet === d.key ? d.on : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}>
                            <span className={`w-3.5 h-3.5 rounded border-2 flex items-center justify-center ${d.key === 'veg' ? 'border-brand' : 'border-red-500'}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${d.dot}`} />
                            </span>
                            {d.label}
                        </button>
                    ))}
                    <span className="hidden sm:inline text-xs font-bold text-slate-400 ml-1">{totalItems} items</span>
                </div>

                {/* Mobile / tablet category chips */}
                {sections.length > 0 && (
                    <div className="lg:hidden flex gap-2 overflow-x-auto no-scrollbar mt-3 -mx-4 px-4">
                        {sections.map(s => (
                            <button key={s.id} ref={el => { chipRefs.current[s.id] = el; }} onClick={() => jumpTo(s.id)}
                                className={`shrink-0 px-4 py-2 rounded-full text-sm font-bold border transition ${s.id === activeId ? 'bg-ink text-white border-ink' : 'bg-white text-slate-600 border-slate-200'}`}>
                                {s.name}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {sections.length === 0 ? (
                <EmptyState emoji="🔍" title={query ? `No items match "${query}"` : 'No items found'}
                    subtitle="Try a different word or clear the filters."
                    action={<Button variant="ghost" onClick={clearFilters}>Clear search</Button>} />
            ) : (
                <div className="lg:grid lg:grid-cols-[250px_minmax(0,1fr)] lg:gap-10 mt-6">
                    {/* Desktop sidebar */}
                    <aside className="hidden lg:block">
                        <nav className="sticky top-40 max-h-[calc(100vh-11rem)] overflow-y-auto no-scrollbar pr-2" aria-label="Menu categories">
                            <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-400 mb-3 px-3">Categories</p>
                            <ul className="space-y-0.5">
                                {categories.map(c => {
                                    const n = counts[c.id] || 0;
                                    const active = c.id === activeId;
                                    return (
                                        <li key={c.id}>
                                            <button onClick={() => n && jumpTo(c.id)} disabled={!n}
                                                className={`relative w-full flex items-center justify-between gap-3 text-left pl-4 pr-3 py-2.5 rounded-xl text-sm transition
                                                    ${active ? 'bg-brand-50 text-brand font-extrabold' : n ? 'text-slate-600 font-semibold hover:bg-white hover:text-ink' : 'text-slate-300 font-semibold cursor-default'}`}>
                                                <span className={`absolute left-0 top-2 bottom-2 w-1 rounded-full bg-brand transition-transform origin-center ${active ? 'scale-y-100' : 'scale-y-0'}`} />
                                                <span className="truncate">{c.name}</span>
                                                <span className={`text-xs tabular-nums ${active ? 'text-brand' : 'text-slate-400'}`}>{n}</span>
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        </nav>
                    </aside>

                    {/* Sections */}
                    <div>
                        {sections.map((s, si) => (
                            <section key={s.id} id={`cat-${s.id}`} className={`scroll-mt-48 lg:scroll-mt-40 ${si > 0 ? 'mt-10' : ''}`}>
                                <div className="reveal flex items-center gap-3 pb-3 border-b-2 border-slate-200">
                                    {s.image_url && <img src={s.image_url} alt="" className="w-11 h-11 rounded-full object-cover ring-2 ring-white shadow" />}
                                    <h2 className="font-display text-2xl font-extrabold text-ink tracking-tight">{s.name}</h2>
                                    <span className="text-sm font-bold text-slate-400">({s.items.length})</span>
                                </div>
                                <div className="divide-y divide-slate-200/80">
                                    {s.items.map((p, i) => <MenuItemRow key={p.id} product={p} delay={Math.min(i, 4) * 60} />)}
                                </div>
                            </section>
                        ))}
                        {filtersOn && (
                            <p className="text-center text-sm text-slate-400 font-semibold mt-10">
                                Showing {totalItems} matching items. <button onClick={clearFilters} className="text-brand font-extrabold underline">Show full menu</button>
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* Mobile: floating "Menu" pill + category bottom sheet */}
            {sections.length > 1 && (
                <button onClick={() => setSheetOpen(true)}
                    className="lg:hidden fixed left-1/2 -translate-x-1/2 bottom-24 z-30 flex items-center gap-2 bg-ink text-white font-extrabold text-sm px-5 py-3 rounded-full shadow-2xl active:scale-95 transition">
                    <List size={18} /> Menu
                </button>
            )}
            {sheetOpen && (
                <div className="lg:hidden fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Menu categories">
                    <button className="absolute inset-0 bg-black/45 anim-fade-in" onClick={() => setSheetOpen(false)} aria-label="Close" />
                    <div className="absolute inset-x-0 bottom-0 bg-white rounded-t-3xl max-h-[75vh] flex flex-col shadow-2xl animate-sheet-up">
                        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-100">
                            <p className="font-display text-xl font-extrabold text-ink">Browse menu</p>
                            <button onClick={() => setSheetOpen(false)} className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center" aria-label="Close"><X size={18} /></button>
                        </div>
                        <ul className="overflow-y-auto px-2 py-2 pb-6">
                            {sections.map(s => (
                                <li key={s.id}>
                                    <button onClick={() => jumpTo(s.id)}
                                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-left ${s.id === activeId ? 'bg-brand-50 text-brand font-extrabold' : 'text-ink font-semibold'}`}>
                                        <span>{s.name}</span>
                                        <span className="text-sm text-slate-400 font-bold">{s.items.length}</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}
        </>
    );
}
