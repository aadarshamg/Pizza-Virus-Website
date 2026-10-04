import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { withTimeout } from '../utils/withTimeout';
import { KEYS, getJSON, setJSON, remove } from '../lib/storage';

// Web port of customer-app/src/contexts/StoreContext.jsx (AsyncStorage -> localStorage).
const StoreContext = createContext({});

export const StoreProvider = ({ children }) => {
    const [stores, setStores] = useState([]);
    const [selectedStore, setSelectedStoreState] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(null);
    const hydrated = useRef(false);

    const loadStores = useCallback(async () => {
        setLoading(true);
        setLoadError(null);
        try {
            const { data, error } = await withTimeout(
                supabase.from('stores').select('*').eq('is_active', true).order('display_order', { ascending: true }),
                10000,
                'stores_fetch_timeout'
            );
            if (error) throw error;
            const list = data || [];
            setStores(list);

            const saved = getJSON(KEYS.store);
            const match = saved && list.find(s => s.id === saved.id);
            if (match) setSelectedStoreState(match);
            // Only one active store - no need to make the customer pick it.
            else if (list.length === 1) {
                setSelectedStoreState(list[0]);
                setJSON(KEYS.store, { id: list[0].id });
            }
        } catch (err) {
            setLoadError(err?.message || String(err));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (hydrated.current) return;
        hydrated.current = true;
        loadStores();
    }, [loadStores]);

    const setSelectedStore = useCallback((store) => {
        setSelectedStoreState(store);
        // The cached "inside the zone" result was computed for the previous store.
        remove(KEYS.zoneCache);
        if (store) setJSON(KEYS.store, { id: store.id });
        else remove(KEYS.store);
    }, []);

    return (
        <StoreContext.Provider value={{ stores, selectedStore, setSelectedStore, loading, loadError, refetchStores: loadStores }}>
            {children}
        </StoreContext.Provider>
    );
};

export const useStore = () => useContext(StoreContext);
