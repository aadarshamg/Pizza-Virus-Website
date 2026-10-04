import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useCart } from '../contexts/CartContext';
import { useStore } from '../contexts/StoreContext';
import { useToast } from '../contexts/ToastContext';
import { DEFAULT_SIZE_LABELS, getFirstSizeKey, getSizeSectionTitle, getSizes, getUnitPrice, sortByVegThenPrice } from '../utils/pricing';
import { Button, EmptyState, FullPageSpinner, ImageOrEmoji, QtyStepper, VegMark } from '../components/ui';

// Port of ProductDetailScreen. Option data comes from the same tables:
// crusts, product_size_addons / product_cheese_options / product_base_options (per size),
// product_dip_options, product_addons, feast_combos, and size labels from store_settings.
const toggleIn = (list, item) => (list.find(x => x.id === item.id) ? list.filter(x => x.id !== item.id) : [...list, item]);

export default function ProductDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { selectedStore } = useStore();
    const { addToCart, addFeastCombo } = useCart();
    const { toast } = useToast();

    const [product, setProduct] = useState(null);
    const [notFound, setNotFound] = useState(false);
    const [sizeLabels, setSizeLabels] = useState(DEFAULT_SIZE_LABELS);
    const [sizeKey, setSizeKey] = useState(null);
    const [crusts, setCrusts] = useState([]);
    const [crust, setCrust] = useState(null);
    const [dips, setDips] = useState([]);
    const [addons, setAddons] = useState([]);
    const [feasts, setFeasts] = useState([]);
    const [perSize, setPerSize] = useState({ toppings: [], cheeses: [], bases: [] });

    const [selToppings, setSelToppings] = useState([]);
    const [selCheese, setSelCheese] = useState(null);
    const [selBase, setSelBase] = useState(null);
    const [selDips, setSelDips] = useState([]);
    const [selAddons, setSelAddons] = useState([]);
    const [selFeasts, setSelFeasts] = useState([]);
    const [cheeseSlice, setCheeseSlice] = useState(null);
    const [instructions, setInstructions] = useState('');
    const [qty, setQty] = useState(1);

    // Product + size-independent options
    useEffect(() => {
        let alive = true;
        (async () => {
            const { data: p } = await supabase.from('products').select('*, category:categories(name)').eq('id', id).maybeSingle();
            if (!alive) return;
            if (!p || !p.is_available) return setNotFound(true);
            setProduct(p);
            setSizeKey(getFirstSizeKey(p));
            document.title = `${p.name} | Pizza Virus`;

            const [crustRes, dipRes, feastRes, labelRes, addonRes] = await Promise.all([
                supabase.from('crusts').select('*').eq('product_id', p.id),
                supabase.from('product_dip_options').select('topping:toppings(*)').eq('product_id', p.id),
                supabase.from('feast_combos').select('*').eq('store_id', p.store_id).eq('is_available', true).order('sort_order', { ascending: true }),
                supabase.from('store_settings').select('key, value').in('key', ['size_label_small', 'size_label_medium', 'size_label_large', 'size_label_xlarge']),
                supabase.from('product_addons').select('addon:addons(*)').eq('product_id', p.id),
            ]);
            if (!alive) return;
            const c = crustRes.data || [];
            setCrusts(c);
            setCrust(c[0] || null);
            setDips((dipRes.data || []).map(r => r.topping).filter(Boolean).sort(sortByVegThenPrice));
            setAddons((addonRes.data || []).map(r => r.addon).filter(Boolean).sort(sortByVegThenPrice));
            setFeasts(feastRes.data || []);
            if (labelRes.data?.length) {
                const m = {};
                labelRes.data.forEach(r => { m[r.key] = r.value; });
                setSizeLabels(prev => ({
                    small: m.size_label_small || prev.small,
                    medium: m.size_label_medium || prev.medium,
                    large: m.size_label_large || prev.large,
                    xlarge: m.size_label_xlarge || prev.xlarge,
                }));
            }
        })();
        return () => { alive = false; };
    }, [id]);

    // Per-size options (toppings, cheese, base) - reset the picks when size changes.
    useEffect(() => {
        if (!product?.id || !sizeKey) return;
        const priceKey = `price_${sizeKey}`;
        const pick = (res) => (res.data || []).map(r => r.topping).filter(Boolean).map(t => ({ ...t, price: t[priceKey] }));
        Promise.all(['product_size_addons', 'product_cheese_options', 'product_base_options'].map(table =>
            supabase.from(table).select('topping:toppings(*)').eq('product_id', product.id).eq('size', sizeKey)
        )).then(([toppingRes, cheeseRes, baseRes]) => {
            setPerSize({
                toppings: pick(toppingRes),
                cheeses: pick(cheeseRes).sort(sortByVegThenPrice),
                bases: pick(baseRes).sort(sortByVegThenPrice),
            });
            setSelToppings([]);
            setSelCheese(null);
            setSelBase(null);
        });
    }, [product?.id, sizeKey]);

    const sizes = useMemo(() => (product ? getSizes(product, sizeLabels) : []), [product, sizeLabels]);
    const size = sizes.find(s => s.key === sizeKey);

    const unitPrice = product ? getUnitPrice({
        product, sizePrice: size?.price, crust, cheese: selCheese, base: selBase,
        toppings: selToppings, dips: selDips, addons: selAddons, cheeseSliceChoice: cheeseSlice,
    }) : 0;
    const totalPrice = unitPrice * qty;

    if (notFound) {
        return <EmptyState emoji="🍕" title="Item not available" subtitle="This item may have been removed or is out of stock." action={<Button to="/menu">Browse Menu</Button>} />;
    }
    if (!product) return <FullPageSpinner />;
    if (selectedStore && product.store_id && product.store_id !== selectedStore.id) {
        return <EmptyState emoji="📍" title="Not available at this store" subtitle={`This item isn't on the ${selectedStore.name} menu.`} action={<Button to="/menu">Browse Menu</Button>} />;
    }

    const vegToppings = perSize.toppings.filter(t => t.is_veg).sort((a, b) => a.price - b.price);
    const nonVegToppings = perSize.toppings.filter(t => !t.is_veg).sort((a, b) => a.price - b.price);

    const handleAdd = () => {
        if (!size) return;
        addToCart({
            product, size, crust, toppings: selToppings, cheese: selCheese, dips: selDips, addons: selAddons,
            base: selBase, cheeseSliceChoice: cheeseSlice, instructions, qty, unitPrice,
        });
        selFeasts.forEach(addFeastCombo);
        toast({
            type: 'success', title: 'Added to Cart!', message: `${qty}x ${product.name} · ₹${totalPrice}`,
            action: { label: 'View Cart', onClick: () => navigate('/cart') },
        });
    };

    return (
        <div className="pb-28 md:pb-0">
            <button onClick={() => navigate(-1)} className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-ink">
                <ArrowLeft size={18} /> Back
            </button>

            <div className="grid md:grid-cols-2 gap-8 items-start">
                {/* Image */}
                <div className="md:sticky md:top-24">
                    <div className="anim-pop relative rounded-3xl overflow-hidden aspect-square bg-brand-cream">
                        <ImageOrEmoji src={product.image_url} alt={product.name} className="w-full h-full" emojiSize="text-8xl" />
                        <span className="absolute bottom-4 right-4 bg-white rounded-lg p-1.5 shadow"><VegMark isVeg={product.is_veg} /></span>
                    </div>
                </div>

                {/* Options */}
                <div>
                    <p className="text-sm font-bold text-slate-500">{product.category?.name}</p>
                    <h1 className="text-3xl font-extrabold text-ink mt-1">{product.name}</h1>
                    {sizes.length === 1 && <p className="text-2xl font-extrabold text-brand mt-1">₹{sizes[0].price}</p>}
                    <p className="text-slate-600 mt-3 leading-relaxed">{product.description || 'Delicious freshly baked pizza with extra cheese and Italian herbs.'}</p>

                    {sizes.length > 1 && (
                        <Section title={getSizeSectionTitle(product.product_type)}>
                            <div className={`grid gap-3 ${sizes.length > 2 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2'}`}>
                                {sizes.map(s => (
                                    <button key={s.key} onClick={() => setSizeKey(s.key)}
                                        className={`rounded-2xl py-4 px-2 text-center transition ${s.key === sizeKey ? 'bg-brand-light text-white shadow-lg shadow-green-500/30' : 'bg-white border border-slate-200 text-slate-700 hover:border-brand-light'}`}>
                                        <span className="block font-extrabold text-sm">{s.label}</span>
                                        <span className="block font-extrabold mt-1.5">₹{s.price}</span>
                                    </button>
                                ))}
                            </div>
                        </Section>
                    )}

                    {crusts.length > 0 && (
                        <Section title="Choose Crust">
                            <div className="flex flex-wrap gap-2.5">
                                {crusts.map(c => (
                                    <button key={c.id} onClick={() => setCrust(c)}
                                        className={`px-4 py-3 rounded-2xl text-sm font-bold border transition ${crust?.id === c.id ? 'bg-brand-cream border-brand-light text-brand' : 'bg-white border-slate-200 text-slate-700 hover:border-brand-light'}`}>
                                        {c.name}{c.price > 0 ? ` (+₹${c.price})` : ''}
                                    </button>
                                ))}
                            </div>
                        </Section>
                    )}

                    {perSize.bases.length > 0 && (
                        <Section title="Choose Base">
                            {perSize.bases.map(b => (
                                <OptionRow key={b.id} radio active={selBase?.id === b.id} tone="teal"
                                    onClick={() => setSelBase(selBase?.id === b.id ? null : b)}
                                    name={b.name} price={b.price > 0 ? `+₹${b.price}` : 'Free'} />
                            ))}
                        </Section>
                    )}

                    {feasts.length > 0 && (
                        <Section title="Make it a FEAST?">
                            {feasts.map(f => (
                                <OptionRow key={f.id} active={!!selFeasts.find(x => x.id === f.id)} tone="amber"
                                    onClick={() => setSelFeasts(prev => toggleIn(prev, f))}
                                    leading={f.image_url ? <img src={f.image_url} alt="" className="w-9 h-9 rounded-lg object-cover" /> : <span className="text-xl">🎉</span>}
                                    name={f.name}
                                    price={<span className="text-right leading-tight"><s className="block text-xs text-slate-400">₹{f.original_price}</s>₹{f.discounted_price}</span>} />
                            ))}
                        </Section>
                    )}

                    {perSize.cheeses.length > 0 && (
                        <Section title="Choose Cheese">
                            {perSize.cheeses.map(c => (
                                <OptionRow key={c.id} radio active={selCheese?.id === c.id} tone="amber"
                                    onClick={() => setSelCheese(selCheese?.id === c.id ? null : c)}
                                    name={c.name} price={c.price > 0 ? `+₹${c.price}` : 'Free'} />
                            ))}
                        </Section>
                    )}

                    {perSize.toppings.length > 0 && (
                        <Section title="Extra Toppings">
                            {[['Veg', vegToppings, true], ['Non-Veg', nonVegToppings, false]].map(([label, list, veg]) => list.length > 0 && (
                                <div key={label} className="mb-4">
                                    <div className="flex items-center gap-2 bg-slate-100 rounded-xl px-3 py-2 mb-2">
                                        <span className={`w-2.5 h-2.5 rounded-full ${veg ? 'bg-brand' : 'bg-red-500'}`} />
                                        <span className={`text-xs font-extrabold uppercase tracking-wider flex-1 ${veg ? 'text-green-700' : 'text-red-700'}`}>{label}</span>
                                        <span className="text-[11px] font-bold text-slate-400">{list.length} options</span>
                                    </div>
                                    {list.map(t => (
                                        <OptionRow key={t.id} active={!!selToppings.find(x => x.id === t.id)}
                                            onClick={() => setSelToppings(prev => toggleIn(prev, t))}
                                            leading={<VegMark isVeg={t.is_veg} />} name={t.name} price={`+₹${t.price}`} />
                                    ))}
                                </div>
                            ))}
                        </Section>
                    )}

                    {dips.length > 0 && (
                        <Section title="Dip">
                            {dips.map(d => (
                                <OptionRow key={d.id} active={!!selDips.find(x => x.id === d.id)} tone="blue"
                                    onClick={() => setSelDips(prev => toggleIn(prev, d))}
                                    leading={d.image_url ? <img src={d.image_url} alt="" className="w-7 h-7 rounded-lg object-cover" /> : null}
                                    name={d.name} price={d.price > 0 ? `+₹${d.price}` : 'Free'} />
                            ))}
                        </Section>
                    )}

                    {addons.length > 0 && (
                        <Section title="Add-ons">
                            {addons.map(a => (
                                <OptionRow key={a.id} active={!!selAddons.find(x => x.id === a.id)}
                                    onClick={() => setSelAddons(prev => toggleIn(prev, a))}
                                    leading={a.image_url ? <img src={a.image_url} alt="" className="w-7 h-7 rounded-lg object-cover" /> : <span className="text-lg">🥤</span>}
                                    name={a.name} price={`+₹${a.price}`} />
                            ))}
                        </Section>
                    )}

                    {(!!product.cheese_slice_single_price || !!product.cheese_slice_double_price) && (
                        <Section title="Cheese Slice">
                            {!!product.cheese_slice_single_price && (
                                <OptionRow radio active={cheeseSlice === 'single'} tone="amber"
                                    onClick={() => setCheeseSlice(c => (c === 'single' ? null : 'single'))}
                                    name="Single Cheese Slice" price={`+₹${product.cheese_slice_single_price}`} />
                            )}
                            {!!product.cheese_slice_double_price && (
                                <OptionRow radio active={cheeseSlice === 'double'} tone="amber"
                                    onClick={() => setCheeseSlice(c => (c === 'double' ? null : 'double'))}
                                    name="Double Cheese Slice" price={`+₹${product.cheese_slice_double_price}`} />
                            )}
                        </Section>
                    )}

                    <Section title="Special Instructions">
                        <textarea value={instructions} onChange={e => setInstructions(e.target.value)} rows={3} maxLength={300}
                            placeholder="Any special requests? (e.g. extra sauce, less spicy, no onion...)"
                            className="w-full bg-white border-2 border-slate-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-brand-light resize-none" />
                    </Section>

                    {/* Add to cart - fixed bar on mobile, inline on desktop */}
                    <div className="fixed md:static bottom-[60px] md:bottom-auto inset-x-0 z-30 bg-white md:bg-transparent border-t md:border-0 border-slate-200 px-4 md:px-0 py-3 md:py-0 md:mt-8 flex items-center gap-4">
                        <QtyStepper value={qty} onDec={() => setQty(q => Math.max(1, q - 1))} onInc={() => setQty(q => q + 1)} />
                        <Button className="flex-1 py-4 text-base" onClick={handleAdd} disabled={!size}>
                            Add to Cart • ₹{totalPrice}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function Section({ title, children }) {
    return (
        <section className="mt-8">
            <h2 className="text-lg font-extrabold text-ink mb-3">{title}</h2>
            <div className="space-y-2">{children}</div>
        </section>
    );
}

const TONES = {
    green: { row: 'bg-brand-50 border-brand-light', text: 'text-green-800', mark: 'bg-brand-light border-brand-light' },
    amber: { row: 'bg-amber-50 border-amber-500', text: 'text-amber-800', mark: 'bg-amber-500 border-amber-500' },
    blue: { row: 'bg-blue-50 border-blue-500', text: 'text-blue-700', mark: 'bg-blue-500 border-blue-500' },
    teal: { row: 'bg-teal-50 border-teal-700', text: 'text-teal-700', mark: 'bg-teal-700 border-teal-700' },
};

function OptionRow({ active, onClick, name, price, leading, radio = false, tone = 'green' }) {
    const t = TONES[tone];
    return (
        <button type="button" onClick={onClick} role={radio ? 'radio' : 'checkbox'} aria-checked={active}
            className={`w-full flex items-center gap-3 rounded-2xl px-4 py-3.5 border-2 text-left transition ${active ? t.row : 'bg-white border-transparent hover:border-slate-200'}`}>
            {leading}
            <span className={`flex-1 text-sm font-bold ${active ? t.text : 'text-slate-700'}`}>{name}</span>
            <span className={`text-sm font-extrabold ${active ? t.text : 'text-slate-400'}`}>{price}</span>
            {radio ? (
                <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${active ? t.mark.split(' ')[1] : 'border-slate-300'}`}>
                    {active && <span className={`w-3 h-3 rounded-full ${t.mark.split(' ')[0]}`} />}
                </span>
            ) : (
                <span className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 ${active ? t.mark : 'border-slate-300'}`}>
                    {active && <Check size={14} strokeWidth={4} className="text-white" />}
                </span>
            )}
        </button>
    );
}
