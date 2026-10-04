// Pricing rules ported 1:1 from customer-app (ProductDetailScreen + CartContext + CartScreen)
// so an order placed on the website totals exactly the same as the same order in the app.

export const DEFAULT_SIZE_LABELS = {
    small: '6 Inch', medium: '8 Inch', large: '10 Inch', xlarge: '12 Inch',
};

const hasPrice = (price) => price !== null && price !== undefined;

export const sortByVegThenPrice = (a, b) =>
    (b.is_veg - a.is_veg) || (Number(a.price || 0) - Number(b.price || 0));

// Size choices for a product, based on its product_type.
export function getSizes(product, sizeLabels = DEFAULT_SIZE_LABELS) {
    const type = product.product_type || 'pizza';

    if (type === 'simple') {
        return hasPrice(product.base_price_small)
            ? [{ key: 'small', label: '', price: product.base_price_small, size: '' }]
            : [];
    }

    const twoWay = {
        half_full: ['Half', 'Full'],
        patty: ['Single Patty', 'Double Patty'],
        ice_cream: ['Without Ice Cream', 'With Ice Cream'],
    }[type];
    if (twoWay) {
        return [
            hasPrice(product.base_price_small) && { key: 'small', label: twoWay[0], price: product.base_price_small, size: '' },
            hasPrice(product.base_price_medium) && { key: 'medium', label: twoWay[1], price: product.base_price_medium, size: '' },
        ].filter(Boolean);
    }

    return [
        hasPrice(product.base_price_small) && { key: 'small', label: sizeLabels.small, price: product.base_price_small, size: '6"' },
        hasPrice(product.base_price_medium) && { key: 'medium', label: sizeLabels.medium, price: product.base_price_medium, size: '8"' },
        hasPrice(product.base_price_large) && { key: 'large', label: sizeLabels.large, price: product.base_price_large, size: '10"' },
        hasPrice(product.base_price_xlarge) && { key: 'xlarge', label: sizeLabels.xlarge, price: product.base_price_xlarge, size: '12"' },
    ].filter(Boolean);
}

export function getSizeSectionTitle(productType) {
    switch (productType) {
        case 'half_full': return 'Half or Full';
        case 'patty': return 'Choose Patty';
        case 'ice_cream': return 'Choose Option';
        default: return 'Choose Size';
    }
}

export function getFirstSizeKey(product) {
    if (hasPrice(product.base_price_small)) return 'small';
    if (hasPrice(product.base_price_medium)) return 'medium';
    if (hasPrice(product.base_price_large)) return 'large';
    if (hasPrice(product.base_price_xlarge)) return 'xlarge';
    return null;
}

// "Starting from" price shown on product cards.
export const getLowestPrice = (item) => Math.min(
    item.base_price_small || Infinity,
    item.base_price_medium || Infinity,
    item.base_price_large || Infinity,
    item.base_price_xlarge || Infinity,
);

// Price of ONE configured item (multiply by quantity yourself).
export function getUnitPrice({ product, sizePrice, crust, cheese, base, toppings = [], dips = [], addons = [], cheeseSliceChoice }) {
    let total = Number(sizePrice || 0);
    if (crust) total += Number(crust.price || 0);
    if (cheese) total += Number(cheese.price || 0);
    if (base) total += Number(base.price || 0);
    toppings.forEach(t => { total += Number(t.price || 0); });
    dips.forEach(d => { total += Number(d.price || 0); });
    addons.forEach(a => { total += Number(a.price || 0); });
    if (cheeseSliceChoice === 'single' && product.cheese_slice_single_price) total += Number(product.cheese_slice_single_price);
    if (cheeseSliceChoice === 'double' && product.cheese_slice_double_price) total += Number(product.cheese_slice_double_price);
    return total;
}

// Coupon discount, derived live from the current subtotal (never frozen).
export function getCouponDiscount(couponRule, subtotal) {
    if (!couponRule) return 0;
    if (couponRule.minOrder && subtotal < couponRule.minOrder) return 0;
    const raw = couponRule.type === 'percentage'
        ? Math.round(subtotal * couponRule.value / 100)
        : Number(couponRule.value);
    return Math.min(raw, subtotal);
}

// Full checkout bill - same formula as CartScreen:
//   GST (5%) is on (cart subtotal − coupon); cart-level sides/drinks, the COD fee
//   and the free-pizza reward are applied after GST.
export function computeBill({ subtotal, couponRule, sidesTotal = 0, codFee = 0, rewardDiscount = 0 }) {
    const discount = getCouponDiscount(couponRule, subtotal);
    const gst = Math.round((subtotal - discount) * 0.05);
    const cartTotal = subtotal - discount + gst;
    const effectiveSubtotal = subtotal + sidesTotal;
    const finalTotal = Math.max(0, cartTotal + codFee + sidesTotal - rewardDiscount);
    return { discount, gst, cartTotal, effectiveSubtotal, finalTotal };
}
