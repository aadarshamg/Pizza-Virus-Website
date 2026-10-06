import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, Tag, MapPin, Banknote, Smartphone, UserRound, ShoppingBag } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useStore } from '../contexts/StoreContext';
import { useToast } from '../contexts/ToastContext';
import { KEYS, getJSON, remove, setJSON } from '../lib/storage';
import { computeBill } from '../utils/pricing';
import {
    CheckoutError, buildOrderItems, cancelOrder, insertOrder, redeemRewardSlices,
    startPhonePeWebPayment, validateCheckout,
} from '../lib/orders';
import { Button, Card, EmptyState, ImageOrEmoji, PageTitle, QtyStepper } from '../components/ui';

// Port of CartScreen (cart + checkout in one page, like the app).
export default function Cart() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { selectedStore } = useStore();
    const { toast } = useToast();
    const {
        cartItems, sides, subtotal, sidesTotal, couponRule, activeCoupon,
        updateQuantity, removeFromCart, addSide, updateSideQty, removeSide,
        applyCoupon, removeCoupon, clearCart,
    } = useCart();

    const [availableSides, setAvailableSides] = useState([]);
    const [couponInput, setCouponInput] = useState('');
    const [applyingCoupon, setApplyingCoupon] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('phonepe');
    const [cod, setCod] = useState({ enabled: true, extra: 0 });
    const [minOrder, setMinOrder] = useState(0);
    const [reward, setReward] = useState({ enabled: true, required: 6, value: 250, minOrderForSlice: 300, slices: 0 });
    const [rewardActive, setRewardActive] = useState(false);
    const [placing, setPlacing] = useState(false);
    const address = getJSON(KEYS.addresses, [])[0] || null;
    const [receiver, setReceiver] = useState(() => getJSON(KEYS.receiver));

    useEffect(() => {
        if (!selectedStore?.id) return;
        const storeId = selectedStore.id;
        supabase.from('addons').select('*').eq('store_id', storeId).eq('is_available', true)
            .order('is_veg', { ascending: false }).order('price', { ascending: true }).order('name', { ascending: true })
            .then(({ data }) => setAvailableSides(data || []));

        // Reward settings are global (store_id NULL); COD + min order are per store.
        Promise.all([
            supabase.from('store_settings').select('key, value').is('store_id', null)
                .in('key', ['reward_enabled', 'reward_slices_required', 'reward_pizza_value', 'reward_min_order_total']),
            supabase.from('store_settings').select('key, value').eq('store_id', storeId)
                .in('key', ['cod_enabled', 'cod_extra_charge', 'min_order_amount']),
        ]).then(([g, s]) => {
            const m = {};
            g.data?.forEach(r => { m[r.key] = r.value; });
            s.data?.forEach(r => { m[r.key] = r.value; });
            setReward(prev => ({
                ...prev,
                enabled: m.reward_enabled !== undefined ? m.reward_enabled !== 'false' : prev.enabled,
                required: m.reward_slices_required ? Number(m.reward_slices_required) : prev.required,
                value: m.reward_pizza_value ? Number(m.reward_pizza_value) : prev.value,
                minOrderForSlice: m.reward_min_order_total ? Number(m.reward_min_order_total) : prev.minOrderForSlice,
            }));
            const codEnabled = m.cod_enabled === undefined || m.cod_enabled !== 'false';
            setCod({ enabled: codEnabled, extra: m.cod_extra_charge !== undefined ? Number(m.cod_extra_charge) : 0 });
            if (!codEnabled) setPaymentMethod('phonepe');
            if (m.min_order_amount) setMinOrder(Number(m.min_order_amount));
        });
    }, [selectedStore?.id]);

    useEffect(() => {
        if (!user?.id) return;
        supabase.from('profiles').select('reward_slices').eq('id', user.id).single()
            .then(({ data }) => setReward(prev => ({ ...prev, slices: data?.reward_slices ?? 0 })));
    }, [user?.id]);

    const codFee = paymentMethod === 'cash' ? cod.extra : 0;
    const rewardDiscount = rewardActive ? reward.value : 0;
    const bill = computeBill({ subtotal, couponRule, sidesTotal, codFee, rewardDiscount });
    const canRedeem = user && reward.enabled && reward.slices >= reward.required;

    const handleApplyCoupon = async () => {
        const code = couponInput.trim().toUpperCase();
        if (!code) return;
        setApplyingCoupon(true);
        try {
            const { data, error } = await supabase.from('offers').select('*').eq('code', code).eq('is_active', true).single();
            const now = new Date();
            const fail = (title, message) => toast({ type: 'error', title, message });
            if (error || !data) return fail('Invalid Coupon', 'This coupon code is not valid or is inactive.');
            if (data.valid_from && new Date(data.valid_from) > now) return fail('Not Yet Active', 'This coupon is not active yet.');
            if (data.valid_to && new Date(data.valid_to) < now) return fail('Expired', 'This coupon has expired.');
            if (data.max_uses && (data.current_uses || 0) >= data.max_uses) return fail('Limit Reached', 'This coupon has reached its usage limit.');
            if (data.min_order_amount && subtotal < data.min_order_amount) return fail('Minimum Order', `This coupon requires a minimum order of ₹${data.min_order_amount}.`);

            const rule = { type: data.discount_type, value: data.discount_value, minOrder: data.min_order_amount || 0 };
            applyCoupon(code, rule);
            setCouponInput('');
            const saving = data.discount_type === 'percentage' ? Math.round(subtotal * data.discount_value / 100) : data.discount_value;
            toast({ type: 'success', title: 'Coupon Applied!', message: `You save ₹${saving} on this order.` });
        } catch {
            toast({ type: 'error', title: 'Error', message: 'Could not verify coupon. Please try again.' });
        } finally {
            setApplyingCoupon(false);
        }
    };

    const handleCheckout = async () => {
        if (!user) return navigate('/login?next=/cart');
        if (paymentMethod === 'cash' && !cod.enabled) {
            setPaymentMethod('phonepe');
            return toast({ type: 'error', title: 'Cash on Delivery Unavailable', message: 'Please pay online to place your order.' });
        }

        setPlacing(true);
        let order = null;
        try {
            await validateCheckout({
                user, store: selectedStore, cartItems, address,
                effectiveSubtotal: bill.effectiveSubtotal, total: bill.cartTotal,
            });
            order = await insertOrder({
                user, store: selectedStore, address, receiver, bill, codFee, rewardDiscount, activeCoupon, paymentMethod,
                items: buildOrderItems(cartItems, sides),
            });

            const sliceEarned = reward.enabled && bill.finalTotal >= reward.minOrderForSlice;

            if (paymentMethod === 'cash') {
                if (rewardActive) await redeemRewardSlices(user.id, reward.slices, reward.required);
                remove(KEYS.receiver);
                clearCart();
                navigate(`/order-success/${order.id}${sliceEarned ? '?slice=1' : ''}`, { replace: true });
                return;
            }

            // PhonePe: remember what to finish after the redirect back, then leave the site.
            const redirectUrl = await startPhonePeWebPayment(order, user.id);
            setJSON(KEYS.pendingPayment, {
                orderId: order.id, merchantOrderId: `PV${order.display_id}`, sliceEarned,
                redeemReward: rewardActive, slices: reward.slices, required: reward.required,
            });
            window.location.assign(redirectUrl);
        } catch (err) {
            if (order && paymentMethod === 'phonepe') await cancelOrder(order.id, user.id);
            const title = err instanceof CheckoutError ? err.title : 'Payment Error';
            toast({ type: 'error', title, message: err.message || 'Something went wrong. Please try again.', duration: 6000 });
            setPlacing(false);
        }
    };

    if (cartItems.length === 0 && sides.length === 0) {
        return <EmptyState emoji="🛒" title="Your cart is empty" subtitle="Add something delicious from the menu." action={<Button to="/menu">Browse Menu</Button>} />;
    }

    return (
        <>
            <PageTitle title="My Cart" subtitle={`Ordering from ${selectedStore?.name}`} />
            <div className="grid lg:grid-cols-[minmax(0,1fr)_380px] gap-6 items-start">
                {/* Left: items, sides, reward, coupon */}
                <div className="space-y-4 min-w-0">
                    {cartItems.map(item => (
                        <Card key={item.cartItemId} className="p-3 flex gap-3">
                            <ImageOrEmoji src={item.isFeastCombo ? item.image_url : item.product.image_url} alt=""
                                emoji={item.isFeastCombo ? '🎉' : '🍽️'} className="w-24 h-24 rounded-xl shrink-0" emojiSize="text-4xl" />
                            <div className="flex-1 min-w-0 flex flex-col">
                                <div className="flex gap-2">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-extrabold text-ink leading-tight">{item.isFeastCombo ? item.name : item.product.name}</h3>
                                        <ItemDetails item={item} />
                                    </div>
                                    <button onClick={() => removeFromCart(item.cartItemId)} className="text-red-500 hover:bg-red-50 rounded-lg p-1.5 h-fit" aria-label="Remove item">
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                                <div className="flex items-center justify-between mt-auto pt-2">
                                    <QtyStepper small value={item.qty} onDec={() => updateQuantity(item.cartItemId, -1)} onInc={() => updateQuantity(item.cartItemId, 1)} />
                                    <span className="font-extrabold text-ink">₹{item.unitPrice * item.qty}</span>
                                </div>
                            </div>
                        </Card>
                    ))}

                    {sides.map(s => (
                        <Card key={`side-${s.id}`} className="p-3 flex gap-3">
                            <ImageOrEmoji src={s.image_url} alt="" emoji="🥤" className="w-24 h-24 rounded-xl shrink-0" emojiSize="text-4xl" />
                            <div className="flex-1 min-w-0 flex flex-col">
                                <div className="flex gap-2">
                                    <div className="flex-1">
                                        <h3 className="font-extrabold text-ink">{s.name}</h3>
                                        <p className="text-xs text-slate-500 font-semibold">Sides &amp; Drinks</p>
                                    </div>
                                    <button onClick={() => removeSide(s.id)} className="text-red-500 hover:bg-red-50 rounded-lg p-1.5 h-fit" aria-label="Remove item">
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                                <div className="flex items-center justify-between mt-auto pt-2">
                                    <QtyStepper small value={s.qty} onDec={() => updateSideQty(s.id, -1)} onInc={() => updateSideQty(s.id, 1)} />
                                    <span className="font-extrabold text-ink">₹{s.price * s.qty}</span>
                                </div>
                            </div>
                        </Card>
                    ))}

                    {availableSides.length > 0 && (
                        <Card className="p-4">
                            <h2 className="font-extrabold text-ink text-lg">Sides &amp; Drinks</h2>
                            <p className="text-xs text-slate-500 font-medium">Add something on the side</p>
                            <div className="flex gap-3 overflow-x-auto no-scrollbar mt-3 pb-1">
                                {availableSides.map(a => {
                                    const picked = sides.find(s => s.id === a.id);
                                    return (
                                        <div key={a.id} className="shrink-0 w-36 bg-white border-[3px] border-pv-ink rounded-2xl p-2">
                                            <ImageOrEmoji src={a.image_url} alt="" emoji="🥤" className="w-full h-24 rounded-xl" emojiSize="text-3xl" />
                                            <p className="text-sm font-bold text-ink truncate mt-2">{a.name}</p>
                                            <div className="flex items-center justify-between mt-1.5">
                                                <span className="text-sm font-extrabold text-brand">+₹{a.price}</span>
                                                {picked
                                                    ? <QtyStepper small value={picked.qty} onDec={() => updateSideQty(a.id, -1)} onInc={() => updateSideQty(a.id, 1)} />
                                                    : <button onClick={() => addSide(a)} className="btn-yellow text-xs px-3 py-1 rounded-lg shadow-brut-sm">ADD</button>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </Card>
                    )}

                    {canRedeem && (
                        <Card className="p-4 bg-violet-100">
                            <div className="flex items-center justify-between">
                                <h2 className="font-extrabold text-violet-900">🍕 Free Pizza Reward</h2>
                                <span className="text-xs font-extrabold bg-pv-yellow text-pv-ink border-2 border-pv-ink rounded-full px-2.5 py-1">{reward.required}/{reward.required} Slices</span>
                            </div>
                            <p className="text-sm text-violet-800 mt-1">You have collected all {reward.required} slices! Redeem a free pizza worth ₹{reward.value} on this order.</p>
                            <button onClick={() => setRewardActive(v => !v)}
                                className={`w-full mt-3 py-3 text-sm ${rewardActive ? "btn-green" : "btn-white"}`}>
                                {rewardActive ? `✓ Free Pizza Applied −₹${reward.value}` : 'Redeem Free Pizza'}
                            </button>
                        </Card>
                    )}

                    <Card className="p-4">
                        <h2 className="font-extrabold text-ink flex items-center gap-2"><Tag size={18} className="text-brand-cta" /> Apply Coupon</h2>
                        <div className="flex gap-2 mt-3">
                            <input value={activeCoupon || couponInput} onChange={e => setCouponInput(e.target.value.toUpperCase())} disabled={!!activeCoupon}
                                onKeyDown={e => e.key === 'Enter' && handleApplyCoupon()}
                                placeholder="Enter coupon code" className="field-brut flex-1 min-w-0 px-4 py-2.5 text-sm font-bold uppercase" />
                            {activeCoupon
                                ? <Button variant="danger" onClick={removeCoupon}>REMOVE</Button>
                                : <Button variant="dark" loading={applyingCoupon} onClick={handleApplyCoupon}>APPLY</Button>}
                        </div>
                        {activeCoupon && (
                            <p className="text-sm text-brand-cta font-bold mt-2">✓ Coupon <b>{activeCoupon}</b> applied. You save ₹{bill.discount}</p>
                        )}
                        <Link to="/offers" className="inline-block text-xs font-bold text-slate-500 hover:text-brand mt-2">View available offers →</Link>
                    </Card>
                </div>

                {/* Right: address, payment, bill, place order */}
                <div className="space-y-4 lg:sticky lg:top-24">
                    <Card className="p-4">
                        <div className="flex items-center justify-between">
                            <h2 className="font-extrabold text-ink">Delivery Address</h2>
                            <Link to="/addresses?select=1" className="text-xs font-extrabold text-brand">{address ? 'CHANGE' : 'ADD ADDRESS'}</Link>
                        </div>
                        {address ? (
                            <div className="flex gap-3 mt-3">
                                <MapPin size={18} className="text-brand shrink-0 mt-0.5" />
                                <div className="text-sm">
                                    <p className="font-bold text-ink">{address.title}</p>
                                    <p className="text-slate-500">{address.address}</p>
                                    {address.phone && <p className="text-slate-500">{address.phone}</p>}
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-slate-500 mt-2">Add a delivery address to place your order.</p>
                        )}
                        {receiver?.name && (
                            <div className="flex items-center gap-2 mt-3 text-xs bg-pv-yellow text-pv-ink border-2 border-pv-ink rounded-xl px-3 py-2 font-bold">
                                <UserRound size={14} /> Receiver: {receiver.name} ({receiver.phone})
                                <button onClick={() => { remove(KEYS.receiver); setReceiver(null); }} className="ml-auto underline">Remove</button>
                            </div>
                        )}
                    </Card>

                    <Card className="p-4">
                        <h2 className="font-extrabold text-ink mb-3">Payment Method</h2>
                        <PayOption active={paymentMethod === 'phonepe'} onClick={() => setPaymentMethod('phonepe')} icon={Smartphone}
                            title="Pay Online" sub="UPI, cards, net banking via PhonePe" />
                        {cod.enabled && (
                            <PayOption active={paymentMethod === 'cash'} onClick={() => setPaymentMethod('cash')} icon={Banknote}
                                title="Cash on Delivery" sub={cod.extra > 0 ? `+₹${cod.extra} handling fee` : 'Pay when your order arrives'} />
                        )}
                    </Card>

                    <Card className="p-4">
                        <h2 className="font-extrabold text-ink mb-3">Bill Details</h2>
                        <BillRow label="Subtotal" value={`₹${bill.effectiveSubtotal}`} />
                        {bill.discount > 0 && <BillRow label="Discount" value={`-₹${bill.discount}`} className="text-brand-cta" />}
                        <BillRow label="GST (5%)" value={`₹${bill.gst}`} />
                        {codFee > 0 && <BillRow label="COD Handling Fee" value={`₹${codFee}`} />}
                        {rewardDiscount > 0 && <BillRow label="🍕 Free Pizza Reward" value={`−₹${rewardDiscount}`} className="text-violet-600" />}
                        <div className="border-t-2 border-dashed border-pv-ink/40 my-3" />
                        <div className="flex justify-between items-center">
                            <span className="font-extrabold text-ink text-lg">Total</span>
                            <span className="font-extrabold text-ink text-2xl">₹{bill.finalTotal}</span>
                        </div>
                    </Card>

                    {minOrder > 0 && bill.effectiveSubtotal < minOrder && (
                        <div className="bg-pv-yellow border-[3px] border-pv-ink text-pv-ink rounded-2xl px-4 py-3 text-sm font-bold">
                            ⚠ Add ₹{minOrder - bill.effectiveSubtotal} more · Min. order ₹{minOrder}
                        </div>
                    )}

                    {!address && user ? (
                        <Button to="/addresses?select=1" className="w-full py-4 text-base"><MapPin size={18} /> Add Delivery Address</Button>
                    ) : (
                        <Button className="w-full py-4 text-base" loading={placing} onClick={handleCheckout}>
                            <ShoppingBag size={18} />
                            {!user ? 'Sign In to Place Order' : paymentMethod === 'cash' ? `Place Order • ₹${bill.finalTotal}` : `Pay ₹${bill.finalTotal}`}
                        </Button>
                    )}
                    <p className="text-[0.6875rem] text-center text-slate-400">
                        By placing this order you agree to our <Link to="/legal/terms" className="underline">Terms</Link> and <Link to="/legal/refund" className="underline">Refund Policy</Link>.
                    </p>
                </div>
            </div>
        </>
    );
}

export function ItemDetails({ item }) {
    if (item.isFeastCombo) return <p className="text-xs text-slate-500 font-semibold">Feast Combo</p>;
    const lines = [
        item.size?.label && ['Size', item.size.label],
        item.crust && ['Crust', item.crust.name],
        item.base && ['Base', item.base.name],
        item.cheese && ['Cheese', item.cheese.name],
        item.toppings?.length > 0 && ['Extra', item.toppings.map(t => t.name).join(', ')],
        item.dips?.length > 0 && ['Dip', item.dips.map(d => d.name).join(', ')],
        item.addons?.length > 0 && ['Add-ons', item.addons.map(a => a.name).join(', ')],
        item.cheeseSliceChoice && ['Cheese Slice', item.cheeseSliceChoice === 'single' ? 'Single' : 'Double'],
        item.instructions && ['Note', item.instructions],
    ].filter(Boolean);
    return (
        <div className="mt-1 space-y-0.5">
            {lines.map(([k, v]) => (
                <p key={k} className="text-xs text-slate-500 line-clamp-1"><span className="font-semibold text-slate-600">{k}:</span> {v}</p>
            ))}
        </div>
    );
}

function PayOption({ active, onClick, icon: Icon, title, sub }) {
    return (
        <button onClick={onClick} className={`w-full flex items-center gap-3 rounded-2xl border-[3px] px-4 py-3 mb-3 last:mb-0 text-left transition-all ${active ? 'border-pv-ink bg-pv-yellow shadow-brut-sm' : 'border-pv-ink/25 bg-white hover:border-pv-ink'}`}>
            <Icon size={22} className="text-pv-ink" />
            <span className="flex-1">
                <span className="block font-extrabold text-sm text-ink">{title}</span>
                <span className="block text-xs text-slate-500">{sub}</span>
            </span>
            <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${active ? 'border-pv-ink' : 'border-pv-ink/40'}`}>
                {active && <span className="w-2.5 h-2.5 rounded-full bg-pv-ink" />}
            </span>
        </button>
    );
}

function BillRow({ label, value, className = 'text-slate-600' }) {
    return (
        <div className={`flex justify-between text-sm font-semibold py-1 ${className}`}>
            <span>{label}</span><span>{value}</span>
        </div>
    );
}
