// Order status labels/colours - same wording as the customer-app screens.
export const STATUS_LABELS = {
    placed: 'Order Placed',
    accepted: 'Accepted',
    preparing: 'Preparing',
    ready: 'Ready',
    'out-for-delivery': 'On the Way',
    delivered: 'Delivered',
    cancelled: 'Order Rejected',
};

// Tailwind classes for the status badge.
export const STATUS_BADGE = {
    placed: 'bg-blue-50 text-blue-700',
    accepted: 'bg-orange-50 text-orange-700',
    preparing: 'bg-orange-50 text-orange-700',
    ready: 'bg-violet-50 text-violet-700',
    'out-for-delivery': 'bg-indigo-50 text-indigo-700',
    delivered: 'bg-green-50 text-green-800',
    cancelled: 'bg-red-50 text-red-800',
};

export const TRACK_STAGES = [
    { key: 'placed', label: 'Confirmed' },
    { key: 'preparing', label: 'Preparing' },
    { key: 'out-for-delivery', label: 'On the Way' },
    { key: 'delivered', label: 'Delivered' },
];

export const normalizeStatus = (s) => (s === 'accepted' ? 'preparing' : s === 'ready' ? 'preparing' : s);

export const stageIndex = (status) => TRACK_STAGES.findIndex(s => s.key === normalizeStatus(status));

export const isActiveOrder = (o) => !['delivered', 'cancelled'].includes(o.status);

export const PAYMENT_LABELS = { cash: 'Cash on Delivery', cod: 'Cash on Delivery', phonepe: 'PhonePe (Online)' };

export const formatDate = (iso) =>
    new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export const formatDateTime = (iso) =>
    new Date(iso).toLocaleString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });

export const rupees = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
