import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Home, Package, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useStore } from '../contexts/StoreContext';
import { formatOrderNumber } from '../utils/storeCode';
import { Button, Card, FullPageSpinner } from '../components/ui';

export default function OrderSuccess() {
    const { id } = useParams();
    const [params] = useSearchParams();
    const sliceEarned = params.get('slice') === '1';
    const { stores } = useStore();
    const [order, setOrder] = useState(null);
    const [slicesRequired, setSlicesRequired] = useState(6);
    const [eta, setEta] = useState(30);

    useEffect(() => {
        supabase.from('orders').select('*').eq('id', id).single().then(({ data }) => {
            setOrder(data);
            if (!data?.store_id) return;
            supabase.from('store_settings').select('value').eq('store_id', data.store_id).eq('key', 'delivery_time_minutes').maybeSingle()
                .then(({ data: s }) => { if (s?.value) setEta(Number(s.value)); });
        });
        supabase.from('store_settings').select('value').is('store_id', null).eq('key', 'reward_slices_required').maybeSingle()
            .then(({ data }) => { if (data?.value) setSlicesRequired(Number(data.value)); });
    }, [id]);

    if (!order) return <FullPageSpinner />;
    const slug = stores.find(s => s.id === order.store_id)?.slug;
    const etaTime = new Date(new Date(order.created_at).getTime() + eta * 60000)
        .toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
        <div className="max-w-lg mx-auto">
            <div className="flex justify-center my-6">
                <div className="w-24 h-24 rounded-full bg-pv-yellow text-pv-ink border-[3px] border-pv-ink shadow-brut flex items-center justify-center [&_svg]:text-pv-ink">
                    <Check size={48} strokeWidth={4} className="text-white" />
                </div>
            </div>
            <h1 className="text-3xl font-extrabold text-center text-ink">Order Placed!</h1>
            <p className="text-center text-slate-500 mt-1">We're spreading deliciousness, one pizza at a time!</p>

            <Card className="p-6 mt-6">
                <div className="bg-slate-50 rounded-2xl p-4 text-center">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Order Number</p>
                    <p className="text-2xl font-extrabold text-ink mt-1">{formatOrderNumber(slug, order.display_id)}</p>
                </div>
                <div className="flex items-center gap-4 mt-5">
                    <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center"><Package className="text-amber-500" /></div>
                    <div>
                        <p className="text-xs font-bold text-slate-500">Estimated Delivery</p>
                        <p className="text-xl font-extrabold text-ink">{eta} minutes</p>
                        <p className="text-xs text-slate-500">Around {etaTime}</p>
                    </div>
                </div>
                <div className="border-t border-dashed border-slate-200 my-5" />
                <p className="text-xs font-bold text-slate-500">Delivery Address</p>
                <p className="text-sm font-semibold text-ink mt-1">{order.delivery_address}</p>
                <div className="flex justify-between mt-4 text-sm">
                    <span className="text-slate-500 font-semibold">{order.payment_method === 'cash' ? 'Pay on delivery' : 'Paid online'}</span>
                    <span className="font-extrabold text-ink">₹{order.total}</span>
                </div>
            </Card>

            {sliceEarned && (
                <Card className="p-6 mt-4 text-center bg-gradient-to-br from-violet-600 to-purple-700 border-0 text-white">
                    <p className="text-2xl">🎊 🍕 🎊</p>
                    <span className="inline-block bg-yellow-300 text-violet-900 text-xs font-extrabold rounded-full px-3 py-1 mt-3">+1 SLICE</span>
                    <h2 className="text-xl font-extrabold mt-2">Slice Incoming!</h2>
                    <p className="text-sm text-white/85 mt-1">You're earning a pizza slice with this order! Collect <b>{slicesRequired} slices</b> and get a <b>FREE PIZZA 🎁</b></p>
                </Card>
            )}

            <div className="grid grid-cols-2 gap-3 mt-6">
                <Button variant="ghost" to="/order"><Home size={18} /> Home</Button>
                <Button to={`/orders/${order.id}`}>Track Order</Button>
            </div>
        </div>
    );
}
