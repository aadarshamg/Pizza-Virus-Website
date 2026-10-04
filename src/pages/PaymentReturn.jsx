import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { XCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { KEYS, getJSON, remove } from '../lib/storage';
import { cancelOrder, checkPhonePeStatus, redeemRewardSlices } from '../lib/orders';
import { supabase } from '../lib/supabase';
import { Button, Card, Spinner } from '../components/ui';

// PhonePe sends the customer back here after the hosted payment page.
// We confirm the real state with PhonePe (check-phonepe-order-status also updates the
// order row), then finish exactly like the app does after its SDK flow.
export default function PaymentReturn() {
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { clearCart } = useCart();
    const [state, setState] = useState('checking'); // checking | failed | error
    const [message, setMessage] = useState('');
    const ran = useRef(false);

    useEffect(() => {
        if (ran.current || !user) return;
        ran.current = true;
        const merchantOrderId = params.get('order');
        const pending = getJSON(KEYS.pendingPayment);

        (async () => {
            try {
                if (!merchantOrderId) throw new Error('Missing order reference.');
                const finalState = await checkPhonePeStatus(merchantOrderId);

                // Find our order row (pending info may be missing if storage was cleared).
                let orderId = pending?.merchantOrderId === merchantOrderId ? pending.orderId : null;
                if (!orderId) {
                    const displayId = parseInt(merchantOrderId.replace(/^PV/, ''), 10);
                    const { data } = await supabase.from('orders').select('id').eq('display_id', displayId).eq('customer_id', user.id).maybeSingle();
                    orderId = data?.id;
                }

                if (finalState === 'COMPLETED') {
                    if (pending?.merchantOrderId === merchantOrderId) {
                        if (pending.redeemReward) await redeemRewardSlices(user.id, pending.slices, pending.required);
                        remove(KEYS.receiver);
                        clearCart();
                    }
                    remove(KEYS.pendingPayment);
                    navigate(`/order-success/${orderId}${pending?.sliceEarned ? '?slice=1' : ''}`, { replace: true });
                    return;
                }

                // FAILED, or still PENDING after polling - treat as not paid (same as the app).
                if (orderId) await cancelOrder(orderId, user.id);
                remove(KEYS.pendingPayment);
                setState('failed');
            } catch (e) {
                setMessage(e.message);
                setState('error');
            }
        })();
    }, [user, params, navigate, clearCart]);

    return (
        <div className="max-w-md mx-auto py-10">
            <Card className="p-8 text-center">
                {state === 'checking' && (
                    <div className="flex flex-col items-center gap-4 py-6">
                        <Spinner size={40} />
                        <p className="font-extrabold text-ink">Confirming your payment...</p>
                        <p className="text-sm text-slate-500">Please don't close or refresh this page.</p>
                    </div>
                )}
                {state === 'failed' && (
                    <>
                        <XCircle size={56} className="text-red-500 mx-auto" />
                        <h1 className="text-2xl font-extrabold text-ink mt-4">Payment Incomplete</h1>
                        <p className="text-slate-500 mt-2">Payment was not completed, so the order was not placed. Your cart is still saved, so please try again.</p>
                        <Button to="/cart" className="w-full mt-6">Back to Cart</Button>
                    </>
                )}
                {state === 'error' && (
                    <>
                        <XCircle size={56} className="text-amber-500 mx-auto" />
                        <h1 className="text-2xl font-extrabold text-ink mt-4">Couldn't confirm payment</h1>
                        <p className="text-slate-500 mt-2">{message || 'Something went wrong.'} If money was deducted, check My Orders in a few minutes or contact support.</p>
                        <div className="flex gap-3 mt-6">
                            <Button variant="ghost" to="/orders" className="flex-1">My Orders</Button>
                            <Button to="/support" className="flex-1">Support</Button>
                        </div>
                    </>
                )}
            </Card>
        </div>
    );
}
