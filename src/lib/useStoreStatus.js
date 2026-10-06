import { useEffect, useRef, useState } from 'react';
import { supabase } from './supabase';
import { isStoreOpen } from '../utils/storeStatus';

// "18:00" -> "6 PM", "18:30" -> "6:30 PM"
export const to12h = (t) => {
    if (!t) return '';
    const [h, m] = t.split(':').map(Number);
    return `${((h + 11) % 12) + 1}${m ? `:${String(m).padStart(2, '0')}` : ''} ${h < 12 ? 'AM' : 'PM'}`;
};

// Live open/closed status for a store: reads store_open / opening_time / closing_time from
// store_settings, listens for admin changes in realtime and re-evaluates every minute.
// Returns { ready, open, minsToClose, opensAt, closesAt }.
export function useStoreStatus(storeId) {
    const settings = useRef({});
    const [status, setStatus] = useState({ ready: false, open: false, minsToClose: null, opensAt: '', closesAt: '' });

    useEffect(() => {
        if (!storeId) return;
        let alive = true;
        const apply = () => {
            const { store_open, opening_time, closing_time } = settings.current;
            const open = isStoreOpen(store_open, opening_time, closing_time);
            let minsToClose = null;
            if (open && closing_time) {
                const now = new Date();
                const [h, m] = closing_time.split(':').map(Number);
                const nowMins = now.getHours() * 60 + now.getMinutes();
                let close = h * 60 + m;
                if (close <= nowMins) close += 24 * 60;
                minsToClose = close - nowMins;
            }
            if (alive) setStatus({ ready: true, open, minsToClose, opensAt: to12h(opening_time), closesAt: to12h(closing_time) });
        };

        supabase.from('store_settings').select('key, value').eq('store_id', storeId)
            .in('key', ['store_open', 'opening_time', 'closing_time'])
            .then(({ data }) => {
                data?.forEach(r => { settings.current[r.key] = r.value; });
                apply();
            });
        const timer = setInterval(apply, 60000);
        const channel = supabase.channel(`store-status-${storeId}-${Math.random().toString(36).slice(2)}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'store_settings', filter: `store_id=eq.${storeId}` }, ({ new: row }) => {
                if (!row?.key) return;
                settings.current[row.key] = row.value;
                apply();
            })
            .subscribe();
        return () => { alive = false; clearInterval(timer); supabase.removeChannel(channel); };
    }, [storeId]);

    return status;
}
