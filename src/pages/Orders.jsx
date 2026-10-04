import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PackageMinus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useStore } from '../contexts/StoreContext';
import { useToast } from '../contexts/ToastContext';
import { formatOrderNumber } from '../utils/storeCode';
import { STATUS_BADGE, STATUS_LABELS, TRACK_STAGES, formatDate, isActiveOrder, stageIndex } from '../utils/orderStatus';
import { Card, EmptyState, FullPageSpinner, PageTitle } from '../components/ui';

const TABS = [
    { key: 'all', label: 'All Orders' },
    { key: 'delivered', label: 'Delivered' },
    { key: 'cancelled', label: 'Cancelled' },
];

// Unpaid online orders (abandoned / failed PhonePe payments) aren't real orders for the customer.
const isVisible = (o) => o.payment_method === 'cash' || o.payment_status === 'paid' || o.status === 'cancelled';

// Rebuilds cart lines from a past order (same approach as the app's Reorder).
export function orderToCartItems(order) {
    const split = (text) => (text ? text.split(', ').map(name => ({ name })) : []);
    return (order.order_items || []).filter(i => i.product_id).map(i => ({
        product: { id: i.product_id, name: i.product_name },
        size: { label: i.size },
        crust: i.crust_name ? { name: i.crust_name } : null,
        base: i.base_name ? { name: i.base_name } : null,
        cheese: i.cheese_name ? { name: i.cheese_name } : null,
        toppings: split(i.toppings_text),
        dips: split(i.dips_text),
        addons: split(i.addons_text),
        cheeseSliceChoice: i.cheese_slice_text?.startsWith('Single') ? 'single' : i.cheese_slice_text?.startsWith('Double') ? 'double' : null,
        instructions: i.instructions || '',
        qty: i.quantity,
        unitPrice: Number(i.price),
    }));
}

export default function Orders() {
    const { user } = useAuth();
    const { stores, selectedStore } = useStore();
    const { addRawItems } = useCart();
    const { toast } = useToast();
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('all');

    useEffect(() => {
        if (!user) return;
        supabase.from('orders').select('*, order_items(*)').eq('customer_id', user.id).order('created_at', { ascending: false })
            .then(({ data }) => { setOrders((data || []).filter(isVisible)); setLoading(false); });

        const channel = supabase.channel(`web-orders-${Math.random().toString(36).slice(2)}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `customer_id=eq.${user.id}` }, ({ new: o }) => {
                setOrders(prev => prev.map(x => (x.id === o.id ? { ...x, ...o } : x)));
                if (o.status === 'cancelled' && o.payment_status !== 'failed') {
                    toast({ type: 'error', title: 'Order Rejected', message: 'Sorry, your order was rejected by the restaurant. Please place a new order or contact support.', duration: 8000 });
                }
            })
            .subscribe();
        return () => supabase.removeChannel(channel);
    }, [user, toast]);

    const filtered = orders.filter(o => tab === 'all' || o.status === tab);
    const totalSpent = filtered.reduce((s, o) => s + (Number(o.total) || 0), 0);

    const reorder = (order) => {
        if (selectedStore && order.store_id !== selectedStore.id) {
            return toast({ type: 'error', title: 'Different Store', message: 'This order was from another store. Switch store to reorder it.' });
        }
        const items = orderToCartItems(order);
        if (!items.length) return toast({ type: 'error', title: 'Unable to Reorder', message: 'No reorderable items were found in this order.' });
        addRawItems(items);
        navigate('/cart');
    };

    return (
        <>
            <PageTitle title="My Orders" />
            <div className="flex gap-2 mb-6">
                {TABS.map(t => (
                    <button key={t.key} onClick={() => setTab(t.key)}
                        className={`px-4 py-2 rounded-full text-sm font-bold ${tab === t.key ? 'bg-brand text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>
                        {t.label}
                    </button>
                ))}
            </div>

            {loading ? <FullPageSpinner /> : filtered.length === 0 ? (
                <EmptyState icon={PackageMinus} title="No Orders" subtitle="Your orders will appear here." />
            ) : (
                <div className="grid md:grid-cols-2 gap-4">
                    {filtered.map(order => {
                        const active = isActiveOrder(order);
                        const idx = stageIndex(order.status);
                        return (
                            <Card key={order.id} className="p-5">
                                <div className="flex justify-between gap-3">
                                    <div>
                                        <p className="font-extrabold text-ink">#{formatOrderNumber(stores.find(s => s.id === order.store_id)?.slug, order.display_id)}</p>
                                        <p className="text-xs text-slate-500 mt-0.5">{formatDate(order.created_at)}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-extrabold text-ink">₹{order.total}</p>
                                        <p className="text-xs text-slate-500">{order.order_items?.length || 0} items</p>
                                    </div>
                                </div>
                                <span className={`inline-block mt-3 text-xs font-extrabold px-2.5 py-1 rounded-full ${STATUS_BADGE[order.status] || STATUS_BADGE.placed}`}>
                                    {STATUS_LABELS[order.status] || order.status}
                                </span>
                                {active && (
                                    <div className="flex items-center mt-4">
                                        {TRACK_STAGES.map((s, i) => (
                                            <div key={s.key} className="flex items-center flex-1 last:flex-none">
                                                <span className={`w-3 h-3 rounded-full ${i <= idx ? 'bg-brand' : 'bg-slate-200'}`} />
                                                {i < TRACK_STAGES.length - 1 && <span className={`h-1 flex-1 mx-1 rounded ${i < idx ? 'bg-brand' : 'bg-slate-200'}`} />}
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <p className="text-xs text-slate-500 mt-3 line-clamp-1">
                                    <span className="font-semibold">{active ? 'Delivering to:' : order.status === 'cancelled' ? 'Order address:' : 'Delivered to:'}</span> {order.delivery_address || 'Not available'}
                                </p>
                                <div className="flex gap-2 mt-4">
                                    <Link to={`/orders/${order.id}`} className="flex-1 text-center border-2 border-slate-200 rounded-xl py-2 text-sm font-extrabold text-ink hover:bg-slate-50">View Details</Link>
                                    {order.status === 'delivered' && (
                                        <button onClick={() => reorder(order)} className="flex-1 bg-brand text-white rounded-xl py-2 text-sm font-extrabold hover:bg-brand-cta">Reorder</button>
                                    )}
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}

            {!loading && filtered.length > 0 && (
                <Card className="p-5 mt-6 flex justify-between">
                    <div><p className="text-xs font-bold text-slate-500">Total Orders</p><p className="text-xl font-extrabold">{filtered.length}</p></div>
                    <div className="text-right"><p className="text-xs font-bold text-slate-500">Total Spent</p><p className="text-xl font-extrabold">₹{totalSpent}</p></div>
                </Card>
            )}
        </>
    );
}
