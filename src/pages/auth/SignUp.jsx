import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Lock, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { PASSWORD_HINT, isValidPassword } from '../../utils/passwordValidation';
import { Button, Input } from '../../components/ui';
import AuthShell from './AuthShell';
import { GoogleButton } from './Login';

export default function SignUp() {
    const { user, signUp } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const next = params.get('next') || '/';
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    if (user) return <Navigate to={next} replace />;

    const submit = async (e) => {
        e.preventDefault();
        if (!name.trim() || !email.trim() || !password) return toast({ type: 'error', title: 'Error', message: 'Please fill in all fields' });
        if (!isValidPassword(password)) return toast({ type: 'error', title: 'Error', message: `Password must be ${PASSWORD_HINT.toLowerCase()}` });
        setLoading(true);
        try {
            await signUp(email.trim(), password, name.trim());
            navigate(`/verify?email=${encodeURIComponent(email.trim())}&next=${encodeURIComponent(next)}`);
        } catch (err) {
            toast({ type: 'error', title: 'Sign Up Failed', message: err.message });
            setLoading(false);
        }
    };

    return (
        <AuthShell title="Create account" subtitle="Join Pizza Virus and start collecting slices."
            footer={<>Already have an account? <Link to={`/login?next=${encodeURIComponent(next)}`} className="font-extrabold text-brand">Sign in</Link></>}>
            <form onSubmit={submit} className="space-y-4">
                <Input label="Full Name" icon={User} autoComplete="name" placeholder="Your full name" value={name} onChange={e => setName(e.target.value)} />
                <Input label="Email" icon={Mail} type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
                <Input label="Password" icon={Lock} type="password" autoComplete="new-password" placeholder={PASSWORD_HINT} value={password} onChange={e => setPassword(e.target.value)} />
                <Button type="submit" className="w-full py-4" loading={loading}>Create Account</Button>
            </form>
            <div className="flex items-center gap-3 my-5 text-xs font-bold text-slate-400"><span className="h-px flex-1 bg-slate-200" />OR<span className="h-px flex-1 bg-slate-200" /></div>
            <GoogleButton next={next} />
        </AuthShell>
    );
}
