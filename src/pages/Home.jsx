import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ChevronRight, Zap, MapPin, Package, ClipboardList, Gift, Pizza, Crown, Leaf, Drumstick, CupSoda, Star } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useStore } from '../contexts/StoreContext';
import { isStoreOpen } from '../utils/storeStatus';
import { formatOrderNumber } from '../utils/storeCode';
import { STATUS_LABELS, TRACK_STAGES, stageIndex } from '../utils/orderStatus';
import { KEYS, getJSON } from '../lib/storage';
import ProductCard from '../components/ProductCard';
import { FullPageSpinner } from '../components/ui';

const getCatStyle = (name) => {
    const n = (name || '').toLowerCase();
    if (n.includes('classic')) return { bg: 'bg-orange-500', Icon: Pizza };
    if (n.includes('premium')) return { bg: 'bg-amber-500', Icon: Crown };
    if (n.includes('veg') && !n.includes('non')) return { bg: 'bg-brand', Icon: Leaf };
    if (n.includes('non') || n.includes('chicken') || n.includes('meat')) return { bg: 'bg-rose-600', Icon: Drumstick };
    if (n.includes('drink') || n.includes('beverage')) return { bg: 'bg-sky-500', Icon: CupSoda };
    if (n.includes('side')) return { bg: 'bg-orange-500', Icon: Package };
    const palette = [
        { bg: 'bg-orange-500', Icon: Pizza }, { bg: 'bg-amber-500', Icon: Crown }, { bg: 'bg-brand', Icon: Leaf },
        { bg: 'bg-rose-600', Icon: Drumstick }, { bg: 'bg-sky-500', Icon: CupSoda }, { bg: 'bg-violet-600', Icon: Star },
    ];
    return palette[Math.abs(name?.charCodeAt(0) || 0) % palette.length];
};

function useStoreStatus(storeId) {
    const [open, setOpen] = useState(true);
    const [minsToClose, setMinsToClose] = useState(null);
    const [deliveryTime, setDeliveryTime] = useState('35');
    const settings = useRef({});

    const apply = useCallback(() => {
        const { store_open, opening_time, closing_time } = settings.current;
        const isOpen = isStoreOpen(store_open, opening_time, closing_time);
        setOpen(isOpen);
        if (!isOpen || !opening_time || !closing_time) return setMinsToClose(null);
        const now = new Date();
        const [h, m] = closing_time.split(':').map(Number);
        const nowMins = now.getHours() * 60 + now.getMinutes();
        let closeMins = h * 60 + m;
        if (closeMins <= nowMins) closeMins += 24 * 60;
        setMinsToClose(closeMins - nowMins);
    }, []);

    useEffect(() => {
        if (!storeId) return;
        supabase.from('store_settings').select('key, value').eq('store_id', storeId)
            .in('key', ['store_open', 'opening_time', 'closing_time', 'delivery_time_minutes'])
            .then(({ data }) => {
                data?.forEach(r => { settings.current[r.key] = r.value; });
                if (settings.current.delivery_time_minutes) setDeliveryTime(settings.current.delivery_time_minutes);
                apply();
            });
        const timer = setInterval(apply, 60000);
        const channel = supabase.channel(`web-kitchen-${storeId}-${Math.random().toString(36).slice(2)}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'store_settings', filter: `store_id=eq.${storeId}` }, ({ new: row }) => {
                if (!row?.key) return;
                settings.current[row.key] = row.value;
                if (row.key === 'delivery_time_minutes') setDeliveryTime(row.value);
                apply();
            })
            .subscribe();
        return () => { clearInterval(timer); supabase.removeChannel(channel); };
    }, [storeId, apply]);

    return { open, minsToClose, deliveryTime };
}

function useActiveOrder(user) {
    const [order, setOrder] = useState(null);
    useEffect(() => {
        if (!user) return setOrder(null);
        const load = () => supabase.from('orders').select('*')
            .eq('customer_id', user.id)
            .not('status', 'in', '("delivered","cancelled")')
            .or('payment_method.eq.cash,payment_status.eq.paid')
            .order('created_at', { ascending: false }).limit(1)
            .then(({ data }) => setOrder(data?.[0] || null));
        load();
        const channel = supabase.channel(`web-home-order-${Math.random().toString(36).slice(2)}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `customer_id=eq.${user.id}` }, load)
            .subscribe();
        return () => supabase.removeChannel(channel);
    }, [user]);
    return order;
}

function ActiveOrderStrip({ order, stores }) {
    const idx = stageIndex(order.status);
    const slug = stores.find(s => s.id === order.store_id)?.slug;
    return (
        <Link to={`/orders/${order.id}`}
            className="fixed md:sticky bottom-20 md:bottom-4 inset-x-4 md:inset-x-auto z-30 md:mt-8 block bg-white rounded-2xl shadow-2xl border-2 border-brand-light p-4 hover:bg-brand-50 transition">
            <div className="flex items-center gap-3">
                <span className="relative flex w-3 h-3 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-light opacity-75" />
                    <span className="relative inline-flex rounded-full w-3 h-3 bg-brand" />
                </span>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                        <p className="font-extrabold text-ink text-sm truncate">Order #{formatOrderNumber(slug, order.display_id)}</p>
                        <p className="text-xs font-extrabold text-brand">{STATUS_LABELS[order.status] || order.status}</p>
                    </div>
                    <div className="flex items-center mt-2">
                        {TRACK_STAGES.map((s, i) => (
                            <div key={s.key} className="flex items-center flex-1 last:flex-none">
                                <span className={`w-3 h-3 rounded-full shrink-0 ${i <= idx ? 'bg-brand' : 'bg-slate-200'} ${i === idx ? 'ring-4 ring-brand-100' : ''}`} />
                                {i < TRACK_STAGES.length - 1 && <span className={`h-1 flex-1 mx-1 rounded ${i < idx ? 'bg-brand' : 'bg-slate-200'}`} />}
                            </div>
                        ))}
                    </div>
                </div>
                <ChevronRight className="text-brand shrink-0" />
            </div>
        </Link>
    );
}

export default function Home() {
    const { user } = useAuth();
    const { selectedStore, stores } = useStore();
    const { open, minsToClose, deliveryTime } = useStoreStatus(selectedStore?.id);
    const activeOrder = useActiveOrder(user);
    const [data, setData] = useState({ categories: [], featured: [], banners: [], popular: [] });
    const [loading, setLoading] = useState(true);
    const address = getJSON(KEYS.addresses, [])[0];

    useEffect(() => {
        if (!selectedStore?.id) return;
        const storeId = selectedStore.id;
        const productSelect = '*, category:categories(name)';
        (async () => {
            setLoading(true);
            try {
                const [catRes, featRes, itemsRes, bannerRes] = await Promise.all([
                    supabase.from('categories').select('*').eq('store_id', storeId).order('sort_order', { ascending: true }),
                    supabase.from('products').select(productSelect).eq('store_id', storeId).eq('is_featured', true).eq('is_available', true).limit(8),
                    supabase.from('order_items').select('product_id, quantity').order('created_at', { ascending: false }).limit(500),
                    supabase.from('banners').select('*').eq('is_active', true).order('sort_order', { ascending: true }),
                ]);

                // "Popular" = most-ordered recent products, falling back to newest products.
                let popular = [];
                if (itemsRes.data?.length) {
                    const counts = {};
                    itemsRes.data.forEach(i => { if (i.product_id) counts[i.product_id] = (counts[i.product_id] || 0) + i.quantity; });
                    const topIds = Object.keys(counts).sort((a, b) => counts[b] - counts[a]).slice(0, 8);
                    if (topIds.length) {
                        const { data } = await supabase.from('products').select(productSelect).eq('store_id', storeId).in('id', topIds).eq('is_available', true);
                        popular = (data || []).sort((a, b) => counts[b.id] - counts[a.id]);
                    }
                }
                if (!popular.length) {
                    const { data } = await supabase.from('products').select(productSelect).eq('store_id', storeId).eq('is_available', true).order('created_at', { ascending: false }).limit(8);
                    popular = data || [];
                }
                setData({ categories: catRes.data || [], featured: featRes.data || [], banners: bannerRes.data || [], popular });
            } finally {
                setLoading(false);
            }
        })();
    }, [selectedStore?.id]);

    if (loading) return <FullPageSpinner label="Loading the menu..." />;
    const { categories, featured, banners, popular } = data;

    return (
        <div className="space-y-10">
            {/* Hero */}
            <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand to-green-700 text-white p-6 md:p-10">
                <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-white/10" />
                <div className="absolute right-10 -bottom-20 w-48 h-48 rounded-full bg-white/10" />
                <div className="relative md:flex items-center justify-between gap-8">
                    <div>
                        <p className="text-white/80 font-bold text-sm flex items-center gap-1.5">
                            <MapPin size={14} /> Delivering to: <span className="text-white">{address?.title || address?.address?.split(',')[0] || selectedStore?.name}</span>
                        </p>
                        <h1 className="text-3xl md:text-5xl font-extrabold mt-3 leading-tight">Hunger is a<br />Deadly Virus.</h1>
                        <p className="text-white/85 mt-3 max-w-md font-medium">Fresh, hot pizzas from {selectedStore?.name}, delivered to your door.</p>
                        <div className="flex flex-wrap gap-3 mt-6">
                            <Link to="/menu" className="bg-white text-brand font-extrabold px-6 py-3 rounded-2xl hover:bg-brand-cream">Order Now</Link>
                            <Link to="/offers" className="bg-white/15 font-extrabold px-6 py-3 rounded-2xl hover:bg-white/25">View Offers</Link>
                        </div>
                    </div>
                    {open && (
                        <div className="mt-6 md:mt-0 inline-flex items-center gap-3 bg-white/15 rounded-2xl px-5 py-4 shrink-0">
                            <Zap className="text-yellow-300" />
                            <div>
                                <p className="text-2xl font-extrabold leading-none">{deliveryTime} min</p>
                                <p className="text-xs text-white/80 font-bold mt-1">delivery</p>
                            </div>
                        </div>
                    )}
                </div>
            </section>

            {!open && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-800 rounded-2xl px-4 py-3 font-bold text-sm -mt-6">
                    <AlertCircle size={16} /> Store is closed. We'll be back soon!
                </div>
            )}
            {open && minsToClose !== null && minsToClose <= 15 && (
                <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl px-4 py-3 font-bold text-sm -mt-6">
                    <AlertCircle size={16} /> Closing in {minsToClose} min. Place your order now!
                </div>
            )}

            {banners.length > 0 && (
                <section className="flex gap-4 overflow-x-auto snap-x snap-mandatory no-scrollbar -mx-4 px-4">
                    {banners.map(b => (
                        <div key={b.id} className="relative snap-start shrink-0 w-[88%] md:w-[48%] aspect-[2/1] rounded-3xl overflow-hidden bg-slate-200">
                            <img src={b.image_url} alt={b.title || 'Offer'} className="w-full h-full object-cover" />
                            {(b.title || b.subtitle) && (
                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-5 text-white">
                                    {b.title && <p className="text-xl font-extrabold">{b.title}</p>}
                                    {b.subtitle && <p className="text-sm text-white/85">{b.subtitle}</p>}
                                </div>
                            )}
                        </div>
                    ))}
                </section>
            )}

            {categories.length > 0 && (
                <section className="reveal">
                    <SectionHeading title="Categories" link="/menu" />
                    <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1">
                        {categories.map(cat => {
                            const { bg, Icon } = getCatStyle(cat.name);
                            return (
                                <Link key={cat.id} to={`/menu?cat=${cat.id}`} className="relative shrink-0 w-28 h-32 md:w-36 md:h-40 rounded-2xl overflow-hidden group">
                                    {cat.image_url
                                        ? <img src={cat.image_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition" />
                                        : <div className={`w-full h-full ${bg} flex items-center justify-center`}><Icon size={32} className="text-white" /></div>}
                                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-2.5">
                                        <p className="text-white text-sm font-extrabold leading-tight line-clamp-2">{cat.name}</p>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </section>
            )}

            {featured.length > 0 && (
                <section>
                    <SectionHeading title="Featured" link="/menu" />
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {featured.map((p, i) => <ProductCard key={p.id} product={p} index={i} badge="FEATURED" />)}
                    </div>
                </section>
            )}

            <section className="reveal">
                <SectionHeading title="Quick Actions" />
                <div className="grid grid-cols-3 gap-3 md:gap-4">
                    <QuickCard to="/menu" className="bg-violet-600" icon={Package} title="Bulk Order" sub="Min 10 Items" />
                    <QuickCard to="/orders" className="bg-blue-500" icon={ClipboardList} title="Order History" sub="Track orders" />
                    <QuickCard to="/offers" className="bg-orange-500" icon={Gift} title="Deals" sub="Save more" />
                </div>
            </section>

            {popular.length > 0 && (
                <section>
                    <SectionHeading title="Popular Items" link="/menu" />
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {popular.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
                    </div>
                </section>
            )}

            {activeOrder && <ActiveOrderStrip order={activeOrder} stores={stores} />}
        </div>
    );
}

function SectionHeading({ title, link }) {
    return (
        <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl md:text-2xl font-extrabold text-ink">{title}</h2>
            {link && <Link to={link} className="text-sm font-extrabold text-brand hover:underline">See All →</Link>}
        </div>
    );
}

function QuickCard({ to, className, icon: Icon, title, sub }) {
    return (
        <Link to={to} className={`${className} text-white rounded-2xl p-4 md:p-5 hover:opacity-95 hover:-translate-y-0.5 transition`}>
            <Icon size={26} />
            <p className="font-extrabold mt-3 text-sm md:text-base">{title}</p>
            <p className="text-xs text-white/80 font-semibold">{sub}</p>
        </Link>
    );
}
