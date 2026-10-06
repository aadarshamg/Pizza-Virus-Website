import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { MapPin, CreditCard, CheckCircle, ChefHat, Truck, Package, Phone } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useStore } from '../contexts/StoreContext';
import { formatOrderNumber } from '../utils/storeCode';
import { PAYMENT_LABELS, STATUS_BADGE, STATUS_LABELS, TRACK_STAGES, formatDateTime, stageIndex } from '../utils/orderStatus';
import { Button, Card, EmptyState, FullPageSpinner, PageTitle } from '../components/ui';

const STAGE_ICONS = [CheckCircle, ChefHat, Truck, Package];

export default function OrderDetail() {
    const { id } = useParams();
    const { stores } = useStore();
    const [order, setOrder] = useState(undefined);

    useEffect(() => {
        supabase.from('orders').select('*, order_items(*)').eq('id', id).maybeSingle().then(({ data }) => setOrder(data));
        // Live status updates while the page is open.
        const channel = supabase.channel(`web-order-${id}-${Math.random().toString(36).slice(2)}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${id}` },
                ({ new: o }) => setOrder(prev => (prev ? { ...prev, ...o } : prev)))
            .subscribe();
        return () => supabase.removeChannel(channel);
    }, [id]);

    if (order === undefined) return <FullPageSpinner />;
    if (!order) return <EmptyState emoji="🔍" title="Order not found" action={<Button to="/orders">My Orders</Button>} />;

    const store = stores.find(s => s.id === order.store_id);
    const cancelled = order.status === 'cancelled';
    const idx = stageIndex(order.status);
    const itemTotal = (order.order_items || []).reduce((s, i) => s + Number(i.price || 0) * (i.quantity || 1), 0);

    return (
        <div className="max-w-3xl mx-auto">
            <PageTitle back title={`Order #${formatOrderNumber(store?.slug, order.display_id)}`} subtitle={formatDateTime(order.created_at)} />

            <Card className="p-5">
                <span className={`inline-block text-xs font-extrabold px-3 py-1 rounded-full ${STATUS_BADGE[order.status] || STATUS_BADGE.placed}`}>
                    {STATUS_LABELS[order.status] || order.status}
                </span>
                {!cancelled && (
                    <div className="flex items-start mt-6">
                        {TRACK_STAGES.map((s, i) => {
                            const Icon = STAGE_ICONS[i];
                            const done = i <= idx;
                            return (
                                <div key={s.key} className="flex items-start flex-1 last:flex-none">
                                    <div className="flex flex-col items-center w-16">
                                        <span className={`w-10 h-10 rounded-full flex items-center justify-center border-2 border-pv-ink ${done ? 'bg-pv-yellow text-pv-ink' : 'bg-white text-pv-ink/30'} ${i === idx ? 'ring-4 ring-pv-yellow/50' : ''}`}>
                                            <Icon size={18} />
                                        </span>
                                        <span className={`text-[0.6875rem] font-bold mt-1.5 text-center ${done ? 'text-ink' : 'text-slate-400'}`}>{s.label}</span>
                                    </div>
                                    {i < TRACK_STAGES.length - 1 && <span className={`h-1 flex-1 mt-5 rounded ${i < idx ? 'bg-brand' : 'bg-slate-200'}`} />}
                                </div>
                            );
                        })}
                    </div>
                )}
                {cancelled && <p className="text-sm text-slate-500 mt-3">This order was cancelled. If you paid online, the refund follows our <a href="/legal/refund" className="underline">refund policy</a>.</p>}
            </Card>

            <Card className="p-5 mt-4">
                <h2 className="font-extrabold text-ink mb-2">Items Ordered</h2>
                {(order.order_items || []).map((item, i) => {
                    const meta = [
                        item.size && item.size !== 'Add-on' && item.size !== 'Feast' && `Size: ${item.size}`,
                        item.crust_name && `Crust: ${item.crust_name}`,
                        item.base_name && `Base: ${item.base_name}`,
                        item.cheese_name && `Cheese: ${item.cheese_name}`,
                        item.toppings_text && `Extras: ${item.toppings_text}`,
                        item.dips_text && `Dip: ${item.dips_text}`,
                        item.addons_text && `Add-ons: ${item.addons_text}`,
                        item.cheese_slice_text,
                        item.instructions && `Note: ${item.instructions}`,
                    ].filter(Boolean);
                    return (
                        <div key={item.id || i} className="flex justify-between gap-4 py-3 border-b border-slate-100 last:border-0">
                            <div>
                                <p className="font-bold text-ink">{item.product_name}</p>
                                {meta.map(m => <p key={m} className="text-xs text-slate-500">{m}</p>)}
                            </div>
                            <div className="text-right shrink-0">
                                <p className="text-xs text-slate-500">×{item.quantity || 1}</p>
                                <p className="font-extrabold text-ink">₹{Number(item.price || 0) * (item.quantity || 1)}</p>
                            </div>
                        </div>
                    );
                })}
            </Card>

            <Card className="p-5 mt-4">
                <h2 className="font-extrabold text-ink mb-2">Bill Details</h2>
                <Row label="Item Total" value={`₹${itemTotal}`} />
                {Number(order.discount) > 0 && <Row label="Discount" value={`−₹${order.discount}`} className="text-brand-cta" />}
                {Number(order.gst) > 0 && <Row label="GST (5%)" value={`₹${order.gst}`} />}
                {Number(order.delivery_charge) > 0 && <Row label="COD Fee" value={`₹${order.delivery_charge}`} />}
                <div className="flex justify-between border-t border-slate-100 mt-2 pt-3">
                    <span className="font-extrabold text-ink">{order.payment_status === 'paid' ? 'Total Paid' : 'Total'}</span>
                    <span className="font-extrabold text-ink text-lg">₹{Number(order.total).toLocaleString('en-IN')}</span>
                </div>
            </Card>

            <div className="grid sm:grid-cols-2 gap-4 mt-4">
                <Card className="p-5">
                    <h2 className="font-extrabold text-ink mb-2">Delivery Address</h2>
                    <p className="text-sm text-slate-600 flex gap-2"><MapPin size={16} className="text-brand shrink-0 mt-0.5" />{order.delivery_address || 'Not available'}</p>
                    {order.customer_phone && <p className="text-sm text-slate-600 flex gap-2 mt-2"><Phone size={16} className="text-brand shrink-0 mt-0.5" />{order.customer_phone}</p>}
                </Card>
                <Card className="p-5">
                    <h2 className="font-extrabold text-ink mb-2">Payment Method</h2>
                    <p className="text-sm text-slate-600 flex gap-2"><CreditCard size={16} className="text-brand shrink-0 mt-0.5" />{PAYMENT_LABELS[order.payment_method] || order.payment_method}</p>
                    {order.payment_status === 'paid' && <span className="inline-block mt-2 text-xs font-extrabold bg-green-50 text-green-700 rounded-full px-2.5 py-1">✓ Paid</span>}
                </Card>
            </div>
        </div>
    );
}

function Row({ label, value, className = 'text-slate-600' }) {
    return <div className={`flex justify-between text-sm font-semibold py-1 ${className}`}><span>{label}</span><span>{value}</span></div>;
}
