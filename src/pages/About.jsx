import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { Card } from '../components/ui';
import FounderStory from '../components/FounderStory';

const LINKS = [
    ['Terms & Conditions', '/legal/terms'],
    ['Privacy Policy', '/legal/privacy'],
    ['Refund Policy', '/legal/refund'],
    ['Shipping Policy', '/legal/shipping'],
    ['Contact Us', '/legal/contact'],
];

export default function About() {
    return (
        <>
        <div className="max-w-xl mx-auto text-center">
            <img src="/logo-192.webp" alt="Pizza Virus" className="object-contain w-24 h-24 rounded-3xl mx-auto drop-shadow-xl mt-4" />
            <h1 className="text-3xl font-extrabold text-ink mt-4">Pizza Virus</h1>
            <p className="text-slate-500 font-semibold">Hunger is a Deadly Virus</p>
        </div>
        {/* Founder story (edited in admin > Website); renders nothing until a story is saved */}
        <FounderStory compact />
        <div className="max-w-xl mx-auto text-center">
            <Card className="mt-8 text-left divide-y divide-slate-100">
                {LINKS.map(([label, to]) => (
                    <Link key={to} to={to} className="flex items-center justify-between p-4 font-bold text-ink hover:bg-slate-50 first:rounded-t-2xl last:rounded-b-2xl">
                        {label} <ChevronRight size={18} className="text-slate-300" />
                    </Link>
                ))}
            </Card>
            <p className="text-xs text-slate-400 mt-8">© {new Date().getFullYear()} CLOUD PAKASALA PRIVATE LIMITED. All Rights Reserved.<br />Designed and Developed By <a href="https://falqonstudio.com" target="_blank" rel="noopener noreferrer" className="font-bold text-slate-500 hover:text-brand">Falqon Studio</a></p>
        </div>
        </>
    );
}
