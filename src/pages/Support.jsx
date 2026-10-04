import { Phone, Mail, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, PageTitle } from '../components/ui';

export default function Support() {
    return (
        <div className="max-w-2xl mx-auto">
            <PageTitle title="Help & Support" subtitle="Choose an option below to connect with our support team." />
            <div className="grid sm:grid-cols-2 gap-4">
                <a href="tel:+917087041010">
                    <Card className="p-6 hover:border-brand-light transition h-full">
                        <span className="w-12 h-12 rounded-2xl bg-brand-50 flex items-center justify-center"><Phone className="text-brand" /></span>
                        <h2 className="font-extrabold text-ink mt-4">Call Us</h2>
                        <p className="text-slate-500 text-sm">+91 70870 41010</p>
                    </Card>
                </a>
                <a href="mailto:info@pizzavirus.com">
                    <Card className="p-6 hover:border-brand-light transition h-full">
                        <span className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center"><Mail className="text-blue-500" /></span>
                        <h2 className="font-extrabold text-ink mt-4">Email Us</h2>
                        <p className="text-slate-500 text-sm">info@pizzavirus.com</p>
                    </Card>
                </a>
            </div>
            <Link to="/legal/refund" className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-brand mt-6">
                <FileText size={16} /> Refund &amp; cancellation policy
            </Link>
        </div>
    );
}
