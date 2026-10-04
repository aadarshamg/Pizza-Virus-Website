import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { KEYS, getJSON, setJSON } from '../lib/storage';
import { computeBill } from '../utils/pricing';

// Web port of customer-app/src/contexts/CartContext.jsx.
// Differences: the cart is saved to localStorage (survives refresh / PhonePe redirect),
// and the cart-level "Sides & Drinks" picks (kept in CartScreen state in the app) live here too.
const CartContext = createContext({});

const newId = () => Math.random().toString(36).slice(2, 11);

export const CartProvider = ({ children }) => {
    const saved = getJSON(KEYS.cart, {});
    const [cartItems, setCartItems] = useState(saved.cartItems || []);
    const [sides, setSides] = useState(saved.sides || []);
    const [couponRule, setCouponRule] = useState(saved.couponRule || null); // { type, value, minOrder }
    const [activeCoupon, setActiveCoupon] = useState(saved.activeCoupon || null);

    useEffect(() => {
        setJSON(KEYS.cart, { cartItems, sides, couponRule, activeCoupon });
    }, [cartItems, sides, couponRule, activeCoupon]);

    const addToCart = ({ product, size, crust = null, toppings = [], cheese = null, dips = [], addons = [], base = null, cheeseSliceChoice = null, instructions = '', qty, unitPrice }) => {
        const configId = `${product.id}-${size.key}-${crust?.id || 'base'}-${toppings.map(t => t.id).sort().join(',')}-${cheese?.id || ''}-${dips.map(d => d.id).sort().join(',')}-${addons.map(a => a.id).sort().join(',')}-${base?.id || ''}-cs${cheeseSliceChoice || ''}-${instructions.trim()}`;
        // Keep only what the cart / order needs from the product row.
        const slimProduct = { id: product.id, name: product.name, image_url: product.image_url, is_veg: product.is_veg };

        setCartItems(prev => {
            const idx = prev.findIndex(i => i.configId === configId);
            if (idx >= 0) return prev.map((i, n) => (n === idx ? { ...i, qty: i.qty + qty } : i));
            return [...prev, {
                cartItemId: newId(), configId, product: slimProduct,
                size, crust, toppings, cheese, dips, addons, base, cheeseSliceChoice, instructions, qty, unitPrice,
            }];
        });
    };

    const addFeastCombo = (combo) => {
        const configId = `feast-${combo.id}`;
        setCartItems(prev => {
            const idx = prev.findIndex(i => i.configId === configId);
            if (idx >= 0) return prev.map((i, n) => (n === idx ? { ...i, qty: i.qty + 1 } : i));
            return [...prev, {
                cartItemId: newId(), configId, isFeastCombo: true,
                name: combo.name, image_url: combo.image_url, unitPrice: Number(combo.discounted_price), qty: 1,
            }];
        });
    };

    // Reorder: pre-built items, no configId merging (same as the app).
    const addRawItems = (items) => {
        setCartItems(prev => [...prev, ...items.map(item => ({ cartItemId: newId(), ...item }))]);
    };

    const updateQuantity = (cartItemId, delta) => {
        setCartItems(prev => prev.map(i => {
            if (i.cartItemId !== cartItemId) return i;
            const q = i.qty + delta;
            return q > 0 ? { ...i, qty: q } : i;
        }));
    };

    const removeFromCart = (cartItemId) => setCartItems(prev => prev.filter(i => i.cartItemId !== cartItemId));

    // Sides & Drinks (store-level `addons` table, picked on the cart page)
    const addSide = (addon) => setSides(prev => (prev.find(a => a.id === addon.id) ? prev : [...prev, {
        id: addon.id, name: addon.name, price: Number(addon.price), image_url: addon.image_url, qty: 1,
    }]));
    const updateSideQty = (id, delta) => setSides(prev => prev.map(a => (a.id === id ? { ...a, qty: Math.max(1, a.qty + delta) } : a)));
    const removeSide = (id) => setSides(prev => prev.filter(a => a.id !== id));

    const applyCoupon = (code, rule) => {
        setActiveCoupon(code.toUpperCase());
        setCouponRule(rule);
    };
    const removeCoupon = () => {
        setActiveCoupon(null);
        setCouponRule(null);
    };

    const clearCart = () => {
        setCartItems([]);
        setSides([]);
        setActiveCoupon(null);
        setCouponRule(null);
    };

    const cartCount = cartItems.reduce((a, i) => a + i.qty, 0) + sides.reduce((a, s) => a + s.qty, 0);
    const subtotal = cartItems.reduce((a, i) => a + i.unitPrice * i.qty, 0);
    const sidesTotal = sides.reduce((a, s) => a + Number(s.price) * s.qty, 0);
    const baseBill = useMemo(() => computeBill({ subtotal, couponRule, sidesTotal }), [subtotal, couponRule, sidesTotal]);

    return (
        <CartContext.Provider value={{
            cartItems, sides, cartCount, subtotal, sidesTotal, couponRule, activeCoupon,
            discount: baseBill.discount, gst: baseBill.gst,
            addToCart, addFeastCombo, addRawItems, updateQuantity, removeFromCart,
            addSide, updateSideQty, removeSide,
            applyCoupon, removeCoupon, clearCart,
        }}>
            {children}
        </CartContext.Provider>
    );
};

export const useCart = () => useContext(CartContext);
