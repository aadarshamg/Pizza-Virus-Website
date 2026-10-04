import { lazy, Suspense, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MapPin, MapPinOff, Plus, X, Home as HomeIcon, Crosshair, AlertTriangle } from 'lucide-react';
import { isPointInPolygon } from 'geolib';
import { useStore } from '../contexts/StoreContext';
import { useToast } from '../contexts/ToastContext';
import { KEYS, getJSON, setJSON } from '../lib/storage';
import { Button, Card, EmptyState, Input, PageTitle, Spinner } from '../components/ui';

const MapPicker = lazy(() => import('../components/MapPicker'));

// Port of SavedAddressesScreen + MapPickerScreen. Addresses stay on this device
// (localStorage '@pizza_addresses', same shape as the app); the first one is "active".
const parseIndianPhone = (input) => {
    const digits = input.replace(/\D/g, '');
    if (digits.startsWith('91') && digits.length === 12) return digits.slice(2);
    if (digits.startsWith('0') && digits.length === 11) return digits.slice(1);
    if (digits.length === 10) return digits;
    return null;
};

export default function Addresses() {
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const selecting = params.get('select') === '1';
    const [addresses, setAddresses] = useState(() => getJSON(KEYS.addresses, []));
    const [showForm, setShowForm] = useState(false);

    const save = (list) => {
        setAddresses(list);
        setJSON(KEYS.addresses, list);
    };

    const select = (id) => {
        const chosen = addresses.find(a => a.id === id);
        save([chosen, ...addresses.filter(a => a.id !== id)]);
        if (selecting) navigate('/cart');
    };

    return (
        <div className="max-w-2xl mx-auto">
            <PageTitle back title="Saved Addresses" subtitle={selecting ? 'Choose where to deliver this order' : 'Select Delivery Location'} />

            {addresses.length === 0 && !showForm && (
                <EmptyState icon={MapPinOff} title="No Addresses Saved" subtitle="You haven't added any delivery locations yet." />
            )}

            <div className="space-y-3">
                {addresses.map((a, i) => (
                    <Card key={a.id} className={`p-4 flex gap-4 items-start cursor-pointer transition ${i === 0 ? 'ring-2 ring-brand-light' : 'hover:border-slate-300'}`}>
                        <button onClick={() => select(a.id)} className="flex gap-4 items-start flex-1 text-left">
                            <span className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${i === 0 ? 'bg-brand text-white' : 'bg-brand-50 text-brand'}`}>
                                <HomeIcon size={20} />
                            </span>
                            <span className="flex-1 min-w-0">
                                <span className="flex items-center gap-2">
                                    <span className="font-extrabold text-ink">{a.title}</span>
                                    {i === 0 && <span className="text-[10px] font-extrabold bg-green-100 text-green-700 rounded-full px-2 py-0.5">ACTIVE</span>}
                                </span>
                                <span className="block text-sm text-slate-500 mt-0.5">{a.address}</span>
                                {a.phone && <span className="block text-xs text-slate-400 mt-0.5">{a.phone}</span>}
                            </span>
                        </button>
                        <button onClick={() => save(addresses.filter(x => x.id !== a.id))} className="text-red-500 hover:bg-red-50 rounded-lg p-1.5" aria-label="Delete address">
                            <X size={16} />
                        </button>
                    </Card>
                ))}
            </div>

            {showForm ? (
                <AddressForm
                    onCancel={() => setShowForm(false)}
                    onSave={(addr) => {
                        save([addr, ...addresses]);
                        setShowForm(false);
                        if (selecting) navigate('/cart');
                    }}
                />
            ) : (
                <button onClick={() => setShowForm(true)}
                    className="w-full mt-4 border-2 border-dashed border-brand-light rounded-2xl py-4 font-extrabold text-brand flex items-center justify-center gap-2 hover:bg-brand-50">
                    <Plus size={20} /> Add New Address
                </button>
            )}
        </div>
    );
}

function AddressForm({ onSave, onCancel }) {
    const { selectedStore } = useStore();
    const { toast } = useToast();
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [pin, setPin] = useState(null);
    const [phoneError, setPhoneError] = useState('');
    const [locating, setLocating] = useState(false);
    const zone = Array.isArray(selectedStore?.delivery_zone) ? selectedStore.delivery_zone : null;
    const storeCenter = selectedStore?.latitude && selectedStore?.longitude
        ? { lat: Number(selectedStore.latitude), lng: Number(selectedStore.longitude) } : null;

    const outsideZone = pin && zone?.length >= 3 &&
        !isPointInPolygon({ latitude: pin.lat, longitude: pin.lng }, zone.map(([lat, lng]) => ({ latitude: lat, longitude: lng })));

    useEffect(() => { setPhoneError(''); }, [phone]);

    const useMyLocation = () => {
        if (!navigator.geolocation) return toast({ type: 'error', title: 'Not supported', message: 'Your browser cannot share location.' });
        setLocating(true);
        navigator.geolocation.getCurrentPosition(
            (p) => { setPin({ lat: p.coords.latitude, lng: p.coords.longitude }); setLocating(false); },
            () => { toast({ type: 'error', title: 'Location unavailable', message: 'Allow location access or tap the map to pin your spot.' }); setLocating(false); },
            { enableHighAccuracy: true, timeout: 12000 }
        );
    };

    const submit = (e) => {
        e.preventDefault();
        if (!name.trim() || !address.trim()) return toast({ type: 'error', title: 'Missing details', message: 'Please fill in all fields.' });
        const cleaned = parseIndianPhone(phone);
        if (!cleaned || !/^[6-9]\d{9}$/.test(cleaned)) return setPhoneError('Enter a valid 10-digit Indian mobile number (starts with 6-9).');
        onSave({
            id: Date.now().toString(),
            title: name.trim(),
            name: name.trim(),
            phone: cleaned,
            address: address.trim(),
            type: 'Home',
            lat: pin ? String(pin.lat) : null,
            lng: pin ? String(pin.lng) : null,
        });
    };

    return (
        <Card className="p-5 mt-4">
            <form onSubmit={submit} className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-extrabold text-ink">Add Address</h2>
                    <button type="button" onClick={onCancel} className="text-slate-400 hover:text-ink" aria-label="Close"><X size={22} /></button>
                </div>
                <Input label="Name" placeholder="Receiver's full name" value={name} onChange={e => setName(e.target.value)} />
                <Input label="Phone Number" type="tel" placeholder="+91 XXXXX XXXXX" maxLength={15} value={phone}
                    onChange={e => setPhone(e.target.value.replace(/[^\d+\- ]/g, ''))} error={phoneError} />
                <label className="block">
                    <span className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Address</span>
                    <textarea rows={3} value={address} onChange={e => setAddress(e.target.value)} placeholder="Street, Apt, Landmark, City..."
                        className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-brand-light focus:bg-white resize-none" />
                </label>

                <div>
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Pin on map (optional)</span>
                        <button type="button" onClick={useMyLocation} className="text-xs font-extrabold text-brand flex items-center gap-1">
                            {locating ? <Spinner size={14} /> : <Crosshair size={14} />} Use my location
                        </button>
                    </div>
                    <Suspense fallback={<div className="h-64 rounded-2xl bg-slate-100 flex items-center justify-center"><Spinner /></div>}>
                        <MapPicker position={pin} onChange={setPin} center={storeCenter} zone={zone} />
                    </Suspense>
                    {pin && !outsideZone && (
                        <p className="text-xs text-brand font-bold mt-2 flex items-center gap-1"><MapPin size={12} /> Pinned at {pin.lat.toFixed(5)}, {pin.lng.toFixed(5)}</p>
                    )}
                    {outsideZone && (
                        <p className="text-xs text-amber-700 font-bold mt-2 flex items-center gap-1"><AlertTriangle size={12} /> This spot looks outside our delivery area for {selectedStore?.name}.</p>
                    )}
                </div>

                <Button type="submit" className="w-full py-4">SAVE ADDRESS</Button>
            </form>
        </Card>
    );
}
