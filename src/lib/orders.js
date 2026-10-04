import { supabase } from './supabase';
import { isStoreOpen } from '../utils/storeStatus';

// Order creation - mirrors customer-app/src/screens/CartScreen.jsx (prepareCheckout +
// handleCashCheckout / handlePhonePeCheckout) so rows written by the website are
// indistinguishable from app rows in the admin and staff portals.

export class CheckoutError extends Error {
    constructor(title, message) {
        super(message);
        this.title = title;
    }
}

const money = (n) => Math.round(Number(n) * 100) / 100;
const clampQty = (q) => Math.max(1, Math.min(q, 50));

const emptyExtras = {
    crust_name: null, toppings_text: null, cheese_name: null, base_name: null,
    dips_text: null, addons_text: null, cheese_slice_text: null, instructions: null,
};

export function buildOrderItems(cartItems, sides) {
    const joinNames = (list) => (list?.length > 0 ? list.map(x => x.name).join(', ') : null);
    return [
        ...cartItems.filter(i => !i.isFeastCombo).map(item => ({
            product_id: item.product.id,
            product_name: item.product.name.trim().slice(0, 150),
            size: item.size?.label ?? '',
            crust_name: item.crust?.name || null,
            toppings_text: joinNames(item.toppings),
            cheese_name: item.cheese?.name || null,
            base_name: item.base?.name || null,
            dips_text: joinNames(item.dips),
            addons_text: joinNames(item.addons),
            cheese_slice_text: item.cheeseSliceChoice === 'single' ? 'Single Cheese Slice'
                : item.cheeseSliceChoice === 'double' ? 'Double Cheese Slice' : null,
            instructions: item.instructions?.trim() || null,
            quantity: clampQty(item.qty),
            price: money(item.unitPrice),
        })),
        ...cartItems.filter(i => i.isFeastCombo).map(item => ({
            ...emptyExtras,
            product_id: null,
            product_name: item.name,
            size: 'Feast',
            quantity: clampQty(item.qty),
            price: money(item.unitPrice),
        })),
        ...sides.map(side => ({
            ...emptyExtras,
            product_id: null,
            product_name: side.name,
            size: 'Add-on',
            quantity: clampQty(side.qty),
            price: money(side.price),
        })),
    ];
}

async function getStoreSettings(storeId, keys) {
    const { data } = await supabase.from('store_settings').select('key, value').eq('store_id', storeId).in('key', keys);
    const map = {};
    data?.forEach(r => { map[r.key] = r.value; });
    return map;
}

// All the pre-checkout checks the app does. Throws CheckoutError with a user-facing message.
export async function validateCheckout({ user, store, cartItems, effectiveSubtotal, total, address }) {
    if (!user?.id) throw new CheckoutError('Sign In Required', 'You must be logged in to place an order.');

    const { data: profile } = await supabase.from('profiles').select('is_blocked').eq('id', user.id).single();
    if (profile?.is_blocked) {
        throw new CheckoutError('Account Suspended', 'Your account has been suspended due to suspicious activity. Please contact support.');
    }
    if (!store?.id) throw new CheckoutError('No Store Selected', 'Please select a store before placing an order.');

    const s = await getStoreSettings(store.id, ['store_open', 'opening_time', 'closing_time', 'min_order_amount']);
    if (!isStoreOpen(s.store_open, s.opening_time, s.closing_time)) {
        throw new CheckoutError('Store Closed', "We're currently closed. Please check back during our operating hours.");
    }
    if (cartItems.length === 0) throw new CheckoutError('Empty Cart', 'Add items to your cart before checking out.');
    if (total <= 0) throw new CheckoutError('Invalid Total', 'Order total must be greater than zero.');
    if (!address?.address) {
        throw new CheckoutError('Delivery Address Required', 'Please add a delivery address before placing your order.');
    }
    const minOrder = s.min_order_amount ? Number(s.min_order_amount) : 0;
    if (minOrder > 0 && effectiveSubtotal < minOrder) {
        throw new CheckoutError('Minimum Order Required',
            `Minimum order amount is ₹${minOrder}. Add ₹${minOrder - effectiveSubtotal} more to place your order.`);
    }
}

// Inserts the order + its items. Returns the inserted order row.
export async function insertOrder({ user, store, address, receiver, items, bill, codFee, rewardDiscount, activeCoupon, paymentMethod }) {
    const name = (receiver?.name || address.name || '').trim().slice(0, 100) || 'Customer';
    const phone = (receiver?.phone || address.phone || '').replace(/[^\d+\-() ]/g, '').slice(0, 20);
    const deliveryAddress = (address.address || '').trim().slice(0, 300);

    const { data: order, error: orderError } = await supabase.from('orders').insert([{
        customer_id: user.id,
        store_id: store.id,
        customer_name: name,
        customer_phone: phone,
        delivery_address: deliveryAddress,
        subtotal: money(bill.effectiveSubtotal),
        gst: money(bill.gst),
        delivery_charge: paymentMethod === 'cash' ? codFee : 0,
        discount: money(bill.discount + rewardDiscount),
        total: money(bill.finalTotal),
        payment_method: paymentMethod,
        payment_status: 'pending',
        promo_code: activeCoupon || null,
        special_instructions: '',
        status: 'placed',
        created_at: new Date().toISOString(),
    }]).select().single();
    if (orderError) throw new CheckoutError('Order Failed', orderError.message || 'Could not place your order. Please try again.');

    const { error: itemsError } = await supabase.from('order_items').insert(items.map(i => ({ ...i, order_id: order.id })));
    if (itemsError) {
        await cancelOrder(order.id, user.id);
        throw new CheckoutError('Order Failed', itemsError.message || 'Could not save order details. Please try again.');
    }
    return order;
}

// Customers can't delete orders (RLS) - they can only mark their own as cancelled.
export async function cancelOrder(orderId, userId) {
    const { error } = await supabase.from('orders')
        .update({ status: 'cancelled', payment_status: 'failed' })
        .eq('id', orderId)
        .eq('customer_id', userId);
    if (error) console.warn('Failed to mark order cancelled:', error.message);
}

export async function redeemRewardSlices(userId, currentSlices, slicesRequired) {
    await supabase.from('profiles')
        .update({ reward_slices: Math.max(0, currentSlices - slicesRequired) })
        .eq('id', userId);
}

// Starts PhonePe Standard Checkout; returns the PhonePe-hosted payment page URL.
export async function startPhonePeWebPayment(order, userId) {
    const merchantOrderId = `PV${order.display_id}`;
    const { data, error } = await supabase.functions.invoke('create-phonepe-web-order', {
        body: {
            orderId: merchantOrderId,
            customerId: userId,
            redirectUrl: `${window.location.origin}/payment/return?order=${encodeURIComponent(merchantOrderId)}`,
        },
    });
    if (error || !data?.success || !data?.redirectUrl) {
        throw new Error(data?.error || error?.message || 'Payment initiation failed');
    }
    return data.redirectUrl;
}

// Asks PhonePe (via the existing edge function) for the final payment state.
// The function also reconciles the order row itself. Returns 'COMPLETED' | 'FAILED' | 'PENDING'.
export async function checkPhonePeStatus(merchantOrderId, attempts = 6) {
    let state = 'PENDING';
    for (let i = 0; i < attempts; i++) {
        const { data, error } = await supabase.functions.invoke('check-phonepe-order-status', { body: { merchantOrderId } });
        if (error || !data?.success) throw new Error(data?.error || error?.message || 'Could not verify payment status');
        state = data.state;
        if (state === 'COMPLETED' || state === 'FAILED') break;
        await new Promise(r => setTimeout(r, 2000));
    }
    return state;
}
