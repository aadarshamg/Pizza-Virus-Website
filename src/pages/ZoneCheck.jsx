import { useCallback, useEffect, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { isPointInPolygon } from 'geolib';
import { MapPin, ArrowRight, User, Phone, RotateCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useStore } from '../contexts/StoreContext';
import { KEYS, getJSON, setJSON, remove, setSession } from '../lib/storage';
import { withTimeout } from '../utils/withTimeout';
import { Button, Input, Spinner } from '../components/ui';

// Port of DeliveryZoneCheckScreen: checks the browser's location against the store's
// delivery_zone polygon. Anything that goes wrong (no permission, timeout, offline) lets
// the customer through - same as the app.
const getPosition = () => new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('no_geolocation'));
    navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: false, timeout: 12000, maximumAge: 0 });
});

export default function ZoneCheck() {
    const { selectedStore, loading } = useStore();
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const next = params.get('next') || '/order';
    const [step, setStep] = useState('checking'); // checking | outside | receiver
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');

    const proceed = useCallback(() => {
        if (selectedStore) setSession(`zone_checked_${selectedStore.id}`, '1');
        navigate(next, { replace: true });
    }, [navigate, next, selectedStore]);

    const checkZone = useCallback(async () => {
        setStep('checking');
        try {
            const cached = getJSON(KEYS.zoneCache);
            if (cached?.result === 'inside' && Date.now() - cached.ts < 3 * 60 * 1000) return proceed();
            remove(KEYS.zoneCache);

            const { data } = await withTimeout(
                supabase.from('stores').select('delivery_zone').eq('id', selectedStore.id).single(),
                10000, 'delivery_zone_fetch_timeout'
            );
            const zone = (data?.delivery_zone || []).map(([lat, lng]) => ({ latitude: lat, longitude: lng }));
            if (zone.length < 3) return proceed();

            const pos = await withTimeout(getPosition(), 60000, 'gps_timeout');
            const inside = isPointInPolygon({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }, zone);
            if (inside) {
                setJSON(KEYS.zoneCache, { result: 'inside', ts: Date.now() });
                // Ordering for themselves - drop any receiver saved earlier.
                remove(KEYS.receiver);
                proceed();
            } else {
                setStep('outside');
            }
        } catch {
            proceed();
        }
    }, [proceed, selectedStore]);

    useEffect(() => {
        if (selectedStore) checkZone();
    }, [selectedStore, checkZone]);

    if (!loading && !selectedStore) return <Navigate to={`/stores?next=${encodeURIComponent(next)}`} replace />;

    const continueWithReceiver = () => {
        setJSON(KEYS.receiver, { name: name.trim(), phone: phone.trim() });
        proceed();
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-3xl shadow-card p-8 text-center">
                {step === 'checking' && (
                    <div className="py-8 flex flex-col items-center gap-4">
                        <Spinner size={40} />
                        <p className="font-bold text-ink">Checking delivery area...</p>
                        <p className="text-xs text-slate-500">Allow location access so we can confirm we deliver to you.</p>
                        <button onClick={proceed} className="text-sm font-bold text-slate-400 hover:text-ink mt-2">Skip</button>
                    </div>
                )}

                {step === 'outside' && (
                    <>
                        <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-5">
                            <MapPin size={40} className="text-red-500" />
                        </div>
                        <h1 className="text-2xl font-extrabold text-ink">We don't deliver to your area yet</h1>
                        <p className="text-slate-500 mt-2 text-sm">
                            Pizza Virus currently delivers in select areas of Phagwara. But you can still order for someone who is in our delivery zone!
                        </p>
                        <Button className="w-full mt-6" onClick={() => setStep('receiver')}>
                            Order for Someone Else <ArrowRight size={18} />
                        </Button>
                        <Button variant="ghost" className="w-full mt-3" onClick={checkZone}>
                            <RotateCw size={16} /> Try Again
                        </Button>
                        <button onClick={proceed} className="mt-4 text-sm font-bold text-slate-400 hover:text-ink">Maybe Later</button>
                    </>
                )}

                {step === 'receiver' && (
                    <div className="text-left">
                        <h1 className="text-2xl font-extrabold text-ink">Who are you ordering for?</h1>
                        <p className="text-slate-500 mt-2 text-sm mb-6">
                            Enter the details of the person who will receive the order. Make sure their address is within our delivery area.
                        </p>
                        <Input label="Receiver's Name" icon={User} placeholder="Full name" value={name} onChange={e => setName(e.target.value)} className="mb-4" />
                        <Input label="Receiver's Phone Number" icon={Phone} type="tel" placeholder="+91 XXXXX XXXXX" value={phone} onChange={e => setPhone(e.target.value)} />
                        <Button className="w-full mt-6" disabled={!name.trim() || !phone.trim()} onClick={continueWithReceiver}>
                            Continue <ArrowRight size={18} />
                        </Button>
                        <button onClick={() => setStep('outside')} className="w-full mt-4 text-sm font-bold text-slate-400 hover:text-ink">← Go Back</button>
                    </div>
                )}
            </div>
        </div>
    );
}
