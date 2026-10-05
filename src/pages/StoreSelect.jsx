import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MapPin, ArrowRight } from 'lucide-react';
import { useStore } from '../contexts/StoreContext';
import { useCart } from '../contexts/CartContext';
import { FullPageSpinner, Button } from '../components/ui';

export default function StoreSelect() {
    const { stores, selectedStore, setSelectedStore, loading, loadError, refetchStores } = useStore();
    const { cartCount, clearCart } = useCart();
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const next = params.get('next') || '/order';

    // Only one store - StoreContext already selected it; move straight on.
    useEffect(() => {
        if (!loading && stores.length === 1) navigate(`/zone-check?next=${encodeURIComponent(next)}`, { replace: true });
    }, [loading, stores.length, navigate, next]);

    const choose = (store) => {
        if (selectedStore?.id !== store.id && cartCount > 0) {
            if (!window.confirm('Switching locations will clear your cart since menu items differ by store. Continue?')) return;
            clearCart();
        }
        setSelectedStore(store);
        navigate(`/zone-check?next=${encodeURIComponent(next)}`, { replace: true });
    };

    if (loading || stores.length === 1) return <FullPageSpinner />;

    return (
        <div className="min-h-screen bg-gradient-to-b from-brand to-green-700 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="text-center text-white mb-8 anim-fade-up">
                    <img src="/logo-192.webp" alt="Pizza Virus" className="w-20 h-20 rounded-3xl mx-auto shadow-xl mb-4" />
                    <h1 className="text-3xl font-extrabold">Choose Your Store</h1>
                    <p className="text-white/80 mt-1 font-medium">Select the location you'd like to order from</p>
                </div>
                <div className="space-y-3">
                    {stores.map((store, i) => (
                        <button key={store.id} onClick={() => choose(store)} style={{ '--d': `${150 + i * 90}ms` }}
                            className={`anim-fade-up w-full bg-white rounded-2xl p-4 flex items-center gap-4 text-left shadow-lg hover:scale-[1.02] active:scale-[0.99] transition ${selectedStore?.id === store.id ? 'ring-4 ring-brand-cream' : ''}`}>
                            <span className="w-12 h-12 rounded-2xl bg-brand-50 flex items-center justify-center shrink-0">
                                <MapPin className="text-brand" size={24} />
                            </span>
                            <span className="flex-1 min-w-0">
                                <span className="block font-extrabold text-ink text-lg">{store.name}</span>
                                {store.address_text && (
                                    <span className="block text-sm text-slate-500 line-clamp-2">{store.address_text}</span>
                                )}
                            </span>
                            <ArrowRight size={20} className="text-slate-400" />
                        </button>
                    ))}
                    {stores.length === 0 && (
                        <div className="bg-white rounded-2xl p-6 text-center">
                            <p className="font-bold text-ink">Couldn't load stores. Check your connection and try again.</p>
                            {loadError && <p className="text-xs text-slate-400 mt-1">{loadError}</p>}
                            <Button className="mt-4" onClick={refetchStores}>Retry</Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
