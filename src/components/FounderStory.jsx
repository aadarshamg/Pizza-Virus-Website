import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

// "Our Story" section. Content is edited in the admin portal (Website page) and stored as
// global store_settings rows. Hidden until a story is written or when switched off.
const KEYS = ['founder_enabled', 'founder_name', 'founder_title', 'founder_heading', 'founder_quote', 'founder_story', 'founder_image_url'];

export default function FounderStory({ compact = false }) {
    const [f, setF] = useState(null);

    useEffect(() => {
        supabase.from('store_settings').select('key, value').in('key', KEYS).is('store_id', null)
            .then(({ data }) => {
                const m = {};
                data?.forEach(r => { m[r.key] = r.value; });
                setF(m);
            });
    }, []);

    if (!f || f.founder_enabled === 'false' || !f.founder_story?.trim()) return null;

    const paragraphs = f.founder_story.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
    const name = f.founder_name?.trim();

    return (
        <section id="story" className={`relative overflow-hidden bg-[#FFF8EE] ${compact ? 'rounded-3xl mt-10' : 'py-20 md:py-28'}`}>
            <div className="absolute inset-0 bg-dots-warm" aria-hidden />
            <div className="absolute -right-24 top-10 w-96 h-96 rounded-full bg-orange-200/50 blur-[110px]" aria-hidden />
            <div className={`relative max-w-6xl mx-auto px-4 grid gap-12 lg:gap-16 items-center ${f.founder_image_url ? 'lg:grid-cols-[0.85fr_1.15fr]' : ''} ${compact ? 'py-10 md:py-14' : ''}`}>
                {f.founder_image_url && (
                    <div className="reveal-left relative mx-auto w-full max-w-sm">
                        {/* Offset colour block + frame behind the portrait */}
                        <div className="absolute inset-0 translate-x-5 translate-y-5 rounded-[2rem] bg-gradient-to-br from-brand to-green-700" aria-hidden />
                        <div className="relative rounded-[2rem] overflow-hidden aspect-[4/5] bg-orange-100 border-[3px] border-pv-ink shadow-brut-lg">
                            <img src={f.founder_image_url} alt={name ? `${name}, ${f.founder_title || 'founder'}` : 'Founder of Pizza Virus'}
                                loading="lazy" className="w-full h-full object-cover hover:scale-105 transition duration-700" />
                        </div>
                        {name && (
                            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-white rounded-2xl shadow-xl px-5 py-3 text-center whitespace-nowrap">
                                <p className="font-display text-lg font-extrabold text-ink leading-tight">{name}</p>
                                {f.founder_title && <p className="text-xs font-bold text-brand">{f.founder_title}</p>}
                            </div>
                        )}
                    </div>
                )}

                <div className={f.founder_image_url ? '' : 'max-w-3xl mx-auto text-center'}>
                    <div className="reveal">
                        <p className={`inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.2em] text-brand`}>
                            <span className="w-6 h-0.5 rounded bg-brand" />Our Story
                        </p>
                        <h2 className="font-display text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.05] mt-3 text-ink">
                            {f.founder_heading || 'How Pizza Virus began'}
                        </h2>
                    </div>

                    {f.founder_quote?.trim() && (
                        <blockquote className="reveal relative mt-8 pl-6 border-l-4 border-orange-400" style={{ '--rd': '100ms' }}>
                            <p className="font-display text-2xl md:text-3xl font-extrabold text-ink leading-snug">"{f.founder_quote.trim()}"</p>
                        </blockquote>
                    )}

                    <div className="mt-8 space-y-4 text-slate-600 text-base md:text-lg leading-relaxed">
                        {paragraphs.map((p, i) => (
                            <p key={i} className="reveal" style={{ '--rd': `${150 + i * 80}ms` }}>{p}</p>
                        ))}
                    </div>

                    {name && !f.founder_image_url && (
                        <p className="reveal mt-8 font-extrabold text-ink">{name}{f.founder_title && <span className="block text-sm font-bold text-brand">{f.founder_title}</span>}</p>
                    )}
                </div>
            </div>
        </section>
    );
}
