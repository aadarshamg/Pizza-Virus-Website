import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Button, Input } from '../../components/ui';
import AuthShell from './AuthShell';

// Shown once for accounts without a name (e.g. first Google sign-in), like the app's SetNameScreen.
export default function SetName() {
    const { user, updateName } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();
    const [name, setName] = useState(user?.user_metadata?.full_name || '');
    const [loading, setLoading] = useState(false);

    if (!user) return <Navigate to="/login" replace />;
    if (user.user_metadata?.name) return <Navigate to="/" replace />;

    const submit = async (e) => {
        e.preventDefault();
        const trimmed = name.trim();
        if (trimmed.length < 2) return toast({ type: 'error', title: 'Name Required', message: 'Please enter your name (at least 2 characters).' });
        setLoading(true);
        try {
            await updateName(trimmed);
            navigate('/', { replace: true });
        } catch (err) {
            toast({ type: 'error', title: 'Error', message: err.message });
            setLoading(false);
        }
    };

    return (
        <AuthShell title="What should we call you?" subtitle="We'll use this on your orders.">
            <form onSubmit={submit} className="space-y-4">
                <Input label="Full Name" icon={User} autoComplete="name" placeholder="Enter your full name" value={name} onChange={e => setName(e.target.value)} autoFocus />
                <Button type="submit" className="w-full py-4" loading={loading}>Continue</Button>
            </form>
        </AuthShell>
    );
}
