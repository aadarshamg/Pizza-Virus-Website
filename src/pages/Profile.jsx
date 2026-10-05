import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Package, MapPin, Tag, HelpCircle, Info, ChevronRight, LogOut, Trash2, Store } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useStore } from '../contexts/StoreContext';
import { useCart } from '../contexts/CartContext';
import { useToast } from '../contexts/ToastContext';
import { Card, Spinner } from '../components/ui';

const MENU = [
    { label: 'My Orders', icon: Package, to: '/orders' },
    { label: 'Saved Addresses', icon: MapPin, to: '/addresses' },
    { label: 'Offers & Coupons', icon: Tag, to: '/offers' },
    { label: 'Help & Support', icon: HelpCircle, to: '/support' },
    { label: 'About', icon: Info, to: '/about' },
];

export default function Profile() {
    const { user, signOut, deleteAccount } = useAuth();
    const { selectedStore, stores } = useStore();
    const { clearCart } = useCart();
    const { toast } = useToast();
    const navigate = useNavigate();
    const [slices, setSlices] = useState(null);
    const [reward, setReward] = useState({ enabled: true, required: 6, value: 250 });
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        supabase.from('profiles').select('reward_slices').eq('id', user.id).single()
            .then(({ data }) => setSlices(data?.reward_slices ?? 0));
        supabase.from('store_settings').select('key, value').is('store_id', null)
            .in('key', ['reward_enabled', 'reward_slices_required', 'reward_pizza_value'])
            .then(({ data }) => {
                const m = {};
                data?.forEach(r => { m[r.key] = r.value; });
                setReward(prev => ({
                    enabled: m.reward_enabled !== undefined ? m.reward_enabled !== 'false' : prev.enabled,
                    required: m.reward_slices_required ? Number(m.reward_slices_required) : prev.required,
                    value: m.reward_pizza_value ? Number(m.reward_pizza_value) : prev.value,
                }));
            });
    }, [user.id]);

    const handleSignOut = async () => {
        try {
            await signOut();
            navigate('/');
        } catch (e) {
            toast({ type: 'error', title: 'Sign out failed', message: e.message });
        }
    };

    const handleDelete = async () => {
        if (!window.confirm('Delete your Pizza Virus account? This permanently deletes your account, saved addresses, Pizza Rewards balance and login access. This cannot be undone.')) return;
        if (!window.confirm('Are you absolutely sure? Your account will be deleted immediately and cannot be recovered.')) return;
        setDeleting(true);
        try {
            await deleteAccount();
            clearCart();
            try { localStorage.removeItem('@pizza_addresses'); } catch { /* ignore */ }
            navigate('/');
        } catch (e) {
            toast({ type: 'error', title: 'Could Not Delete Account', message: e.message || 'Please try again or contact support.' });
            setDeleting(false);
        }
    };

    const remaining = reward.required - Math.min(slices ?? 0, reward.required);

    return (
        <div className="max-w-2xl mx-auto space-y-4">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand to-green-700 text-white p-6 flex items-center gap-4">
                <span className="absolute right-4 top-2 text-5xl opacity-30 rotate-12" aria-hidden>🍕</span>
                <img src="/logo-192.webp" alt="" className="w-16 h-16 rounded-2xl bg-white" />
                <div className="min-w-0">
                    <h1 className="text-2xl font-extrabold truncate">{user.user_metadata?.name || 'Pizza Lover'}</h1>
                    <p className="text-white/80 text-sm truncate">{user.email}</p>
                </div>
            </div>

            {reward.enabled && slices !== null && (
                <Card className="p-5">
                    <div className="flex items-center justify-between">
                        <h2 className="font-extrabold text-ink">🍕 Pizza Rewards</h2>
                        <span className="text-xs font-extrabold bg-violet-100 text-violet-700 rounded-full px-2.5 py-1">{Math.min(slices, reward.required)}/{reward.required}</span>
                    </div>
                    <div className="flex gap-1.5 mt-3 text-3xl">
                        {Array.from({ length: reward.required }, (_, i) => <span key={i} className={i < slices ? '' : 'grayscale opacity-25'}>🍕</span>)}
                    </div>
                    {slices >= reward.required ? (
                        <div className="mt-3">
                            <p className="text-sm font-extrabold text-violet-600">🎉 You've earned a free pizza worth ₹{reward.value}!</p>
                            <Link to="/cart" className="inline-block mt-2 bg-violet-600 text-white text-sm font-extrabold rounded-xl px-4 py-2">Redeem at Checkout →</Link>
                        </div>
                    ) : (
                        <p className="text-sm text-slate-500 mt-3">{remaining} more {remaining === 1 ? 'slice' : 'slices'} to earn a free pizza</p>
                    )}
                </Card>
            )}

            <Card>
                <Link to={stores.length > 1 ? '/stores' : '/profile'} className="flex items-center gap-4 p-4">
                    <span className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center"><Store size={20} className="text-brand" /></span>
                    <span className="flex-1">
                        <span className="block text-xs text-slate-500 font-semibold">Delivering from</span>
                        <span className="block font-extrabold text-ink">{selectedStore?.name || 'Select a store'}</span>
                    </span>
                    {stores.length > 1 && <ChevronRight size={18} className="text-slate-300" />}
                </Link>
            </Card>

            <Card className="divide-y divide-slate-100">
                {MENU.map(({ label, icon: Icon, to }) => (
                    <Link key={to} to={to} className="flex items-center gap-4 p-4 hover:bg-slate-50 first:rounded-t-2xl last:rounded-b-2xl">
                        <span className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center"><Icon size={20} className="text-brand" /></span>
                        <span className="flex-1 font-bold text-ink">{label}</span>
                        <ChevronRight size={18} className="text-slate-300" />
                    </Link>
                ))}
            </Card>

            <button onClick={handleSignOut} className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-600 font-extrabold rounded-2xl py-4 hover:bg-red-100">
                <LogOut size={20} /> Sign Out
            </button>
            <button onClick={handleDelete} disabled={deleting} className="w-full flex items-center justify-center gap-1.5 text-slate-400 text-xs font-bold py-2 hover:text-red-500">
                {deleting ? <Spinner size={14} /> : <Trash2 size={14} />} Delete Account
            </button>
        </div>
    );
}
