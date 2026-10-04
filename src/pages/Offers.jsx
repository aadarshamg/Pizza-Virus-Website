import { useEffect, useState } from 'react';
import { Tag, Copy, Clock, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatDate } from '../utils/orderStatus';
import { Card, EmptyState, FullPageSpinner, PageTitle } from '../components/ui';

const COLORS = [
    { bg: 'bg-violet-600', light: 'bg-violet-50', text: 'text-violet-600' },
    { bg: 'bg-orange-500', light: 'bg-orange-50', text: 'text-orange-500' },
    { bg: 'bg-sky-500', light: 'bg-sky-50', text: 'text-sky-500' },
    { bg: 'bg-brand', light: 'bg-brand-50', text: 'text-brand' },
    { bg: 'bg-rose-600', light: 'bg-rose-50', text: 'text-rose-600' },
];

const title = (o) => (o.discount_type === 'percentage' ? `${o.discount_value}% OFF` : `Flat ₹${o.discount_value} OFF`);
const desc = (o) => (o.discount_type === 'percentage'
    ? `Get ${o.discount_value}% off on all pizzas`
    : `Get flat ₹${o.discount_value} off on orders above ₹${o.min_order_amount || 0}`);

export default function Offers() {
    const [offers, setOffers] = useState(null);
    const [copied, setCopied] = useState(null);

    useEffect(() => {
        supabase.from('offers').select('*').eq('is_active', true).order('created_at', { ascending: false })
            .then(({ data }) => {
                const now = new Date();
                setOffers((data || []).filter(o => !o.valid_to || new Date(o.valid_to) >= now));
            });
    }, []);

    const copy = async (code) => {
        try { await navigator.clipboard.writeText(code); } catch { /* ignore */ }
        setCopied(code);
        setTimeout(() => setCopied(null), 2000);
    };

    if (!offers) return <FullPageSpinner />;

    return (
        <>
            <PageTitle title="Deals & Offers" subtitle="Save more with amazing deals! Apply a code in your cart." />
            {offers.length === 0 ? (
                <EmptyState icon={Tag} title="No Active Offers" subtitle="Check back later for exciting deals!" />
            ) : (
                <div className="grid md:grid-cols-2 gap-4">
                    {offers.map((o, i) => {
                        const c = COLORS[i % COLORS.length];
                        return (
                            <Card key={o.id} className="p-5 flex gap-4">
                                <span className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${c.light}`}><Tag className={c.text} /></span>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h2 className="font-extrabold text-ink text-lg">{title(o)}</h2>
                                    </div>
                                    <p className="text-sm text-slate-500">{desc(o)}</p>
                                    <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-400 font-semibold">
                                        {o.min_order_amount > 0 && <span>Min order: ₹{o.min_order_amount}</span>}
                                        {o.valid_to && <span className="flex items-center gap-1"><Clock size={12} /> Valid till {formatDate(o.valid_to)}</span>}
                                    </div>
                                    <div className="flex items-center gap-2 mt-3">
                                        <span className="border-2 border-dashed border-slate-300 rounded-xl px-3 py-1.5 font-extrabold tracking-widest text-ink">{o.code}</span>
                                        <button onClick={() => copy(o.code)} className={`${c.bg} text-white text-xs font-extrabold rounded-xl px-3 py-2 flex items-center gap-1.5`}>
                                            {copied === o.code ? <Check size={14} /> : <Copy size={14} />}
                                            {copied === o.code ? 'Copied!' : 'Copy'}
                                        </button>
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}
        </>
    );
}
