import { useEffect, useState } from 'react';
import { NavLink, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Card, PageTitle } from '../components/ui';

// Policy text is managed in the admin portal (Legal Policies) and stored in store_settings.
const TABS = [
    { key: 'terms', label: 'Terms', title: 'Terms & Conditions', setting: 'terms_conditions_text' },
    { key: 'privacy', label: 'Privacy', title: 'Privacy Policy', setting: 'privacy_policy_text' },
    { key: 'refund', label: 'Refund', title: 'Refund & Cancellation Policy', setting: 'refund_cancellation_text' },
    { key: 'shipping', label: 'Shipping', title: 'Delivery Policy', setting: 'delivery_policy_text' },
    { key: 'contact', label: 'Contact', title: 'Contact Us' },
];

export default function Legal() {
    const { section = 'terms' } = useParams();
    const tab = TABS.find(t => t.key === section) || TABS[0];
    const [content, setContent] = useState({});

    useEffect(() => {
        const load = () => supabase.from('store_settings').select('key, value')
            .in('key', TABS.filter(t => t.setting).map(t => t.setting))
            .then(({ data }) => {
                const m = {};
                data?.forEach(r => { if (r.value) m[r.key] = r.value; });
                setContent(m);
            });
        load();
        const channel = supabase.channel(`web-legal-${Math.random().toString(36).slice(2)}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'store_settings' }, load)
            .subscribe();
        return () => supabase.removeChannel(channel);
    }, []);

    useEffect(() => { document.title = `${tab.title} | Pizza Virus`; }, [tab.title]);

    return (
        <div className="max-w-3xl mx-auto">
            <PageTitle title="Legal & Policies" />
            <div className="flex gap-1 overflow-x-auto no-scrollbar border-b border-slate-200 mb-6">
                {TABS.map(t => (
                    <NavLink key={t.key} to={`/legal/${t.key}`}
                        className={() => `px-4 py-2.5 text-sm font-bold whitespace-nowrap border-b-2 -mb-px ${t.key === tab.key ? 'border-brand text-brand' : 'border-transparent text-slate-500 hover:text-ink'}`}>
                        {t.label}
                    </NavLink>
                ))}
            </div>

            <Card className="p-6">
                <h2 className="text-xl font-extrabold text-ink mb-4">{tab.title}</h2>
                {tab.key === 'contact' ? <ContactContent /> : (
                    <div className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                        {content[tab.setting] || `No ${tab.title.toLowerCase()} content has been added yet.`}
                    </div>
                )}
            </Card>
        </div>
    );
}

function ContactContent() {
    const rows = [
        ['General Support', 'info@pizzavirus.com'],
        ['Privacy Enquiries', 'info@pizzavirus.com'],
        ['Legal Notices', 'info@pizzavirus.com'],
        ['Phone', '+91 70870 41010'],
        ['Website', 'www.pizzavirus.com'],
    ];
    return (
        <div className="space-y-6 text-sm">
            <table className="w-full">
                <tbody>
                    {rows.map(([k, v]) => (
                        <tr key={k} className="border-b border-slate-100 last:border-0">
                            <td className="py-2.5 font-bold text-ink">{k}</td>
                            <td className="py-2.5 text-slate-600">{v}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <div className="bg-slate-50 rounded-2xl p-4">
                <p className="font-extrabold text-ink mb-1">Registered Office</p>
                <p className="text-slate-600">
                    CLOUD PAKASALA PRIVATE LIMITED<br />
                    Plot 356, Simar Enclave, Extension Maheru,<br />
                    Maheru, Kapurthala, Phagwara,<br />
                    Punjab, India 144411
                </p>
            </div>
        </div>
    );
}
