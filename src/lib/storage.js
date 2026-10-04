// localStorage wrappers - storage can throw (private mode, blocked site data),
// and nothing on the site should break because of it.
// Keys match the customer-app's AsyncStorage keys so the data shapes stay identical.
export const KEYS = {
    store: '@pizza_store',
    addresses: '@pizza_addresses',
    receiver: '@pizza_delivery_receiver',
    zoneCache: '@zone_check_cache',
    cart: '@pizza_web_cart',
    pendingPayment: '@pizza_pending_payment',
};

export const getJSON = (key, fallback = null) => {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    } catch {
        return fallback;
    }
};

export const setJSON = (key, value) => {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch { /* non-fatal */ }
};

export const remove = (key) => {
    try {
        localStorage.removeItem(key);
    } catch { /* non-fatal */ }
};

export const getSession = (key) => {
    try {
        return sessionStorage.getItem(key);
    } catch {
        return null;
    }
};

export const setSession = (key, value) => {
    try {
        sessionStorage.setItem(key, value);
    } catch { /* non-fatal */ }
};
