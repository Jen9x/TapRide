'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { api } from '@/lib/api';

type Step = 'phone' | 'verify' | 'new_user';

export default function AuthPage() {
    const [step, setStep] = useState<Step>('phone');
    const [phone, setPhone] = useState('');
    const [code, setCode] = useState('');
    const [role, setRole] = useState<'passenger' | 'driver'>('passenger');
    const [displayName, setDisplayName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { user, loading: authLoading, login } = useAuth();
    const router = useRouter();

    // Redirect if already logged in
    useEffect(() => {
        if (!authLoading && user) {
            router.push(user.role === 'driver' || user.role === 'admin' ? '/dashboard' : '/passenger');
        }
    }, [authLoading, user, router]);

    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!/^\+[1-9]\d{7,14}$/.test(phone)) {
            setError('Enter a valid phone number in E.164 format (e.g. +12125551234)');
            return;
        }
        setLoading(true);
        try {
            await api.sendOtp(phone);
            setStep('verify');
        } catch (err: any) {
            setError(err.message || 'Failed to send OTP');
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!code.trim()) {
            setError('Enter the verification code');
            return;
        }
        setLoading(true);
        try {
            // Try to verify without a role first — works for returning users
            const data = await api.verifyOtp(phone, code.trim());
            login(data.token, data.user);
            router.push(data.user.role === 'driver' || data.user.role === 'admin' ? '/dashboard' : '/passenger');
        } catch (err: any) {
            // If backend says "new user, role required" — show role picker
            if (err.message?.includes('role') || err.message?.includes('New user')) {
                setStep('new_user');
                setError('');
            } else {
                setError(err.message || 'Verification failed');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (role === 'driver' && (!displayName.trim() || displayName.trim().length < 2)) {
            setError('Drivers must provide a display name (at least 2 characters)');
            return;
        }
        setLoading(true);
        try {
            const data = await api.verifyOtp(
                phone,
                code.trim(),
                role,
                role === 'driver' ? displayName.trim() : undefined,
            );
            login(data.token, data.user);
            router.push(data.user.role === 'driver' ? '/dashboard' : '/passenger');
        } catch (err: any) {
            setError(err.message || 'Signup failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page-narrow" style={{ paddingTop: '3rem' }}>
            <div className="card" style={{ padding: '2.5rem 2rem' }}>
                <h1 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '0.5rem', textAlign: 'center' }}>
                    {step === 'phone' ? 'Welcome to TapRide' : step === 'verify' ? 'Verify your phone' : 'Create your account'}
                </h1>
                <p style={{ textAlign: 'center', color: 'var(--gray-600)', marginBottom: '2rem', fontSize: '0.95rem' }}>
                    {step === 'phone'
                        ? 'Enter your phone number to sign in or create an account.'
                        : step === 'verify'
                            ? `We sent a code to ${phone}`
                            : 'Looks like you\'re new here! Choose your role.'}
                </p>

                {error && <div className="alert alert-error">{error}</div>}

                {step === 'phone' && (
                    <form onSubmit={handleSendOtp}>
                        <div className="form-group">
                            <label className="form-label">Phone number</label>
                            <input
                                className="form-input"
                                type="tel"
                                placeholder="+12125551234"
                                value={phone}
                                onChange={e => setPhone(e.target.value)}
                                autoFocus
                            />
                        </div>
                        <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '0.75rem' }} disabled={loading}>
                            {loading ? <span className="spinner" /> : 'Send verification code →'}
                        </button>
                    </form>
                )}

                {step === 'verify' && (
                    <form onSubmit={handleVerify}>
                        <div className="form-group">
                            <label className="form-label">Verification code</label>
                            <input
                                className="form-input"
                                type="text"
                                placeholder="123456"
                                value={code}
                                onChange={e => setCode(e.target.value)}
                                autoFocus
                                maxLength={8}
                                style={{ letterSpacing: '0.3em', fontWeight: 700, fontSize: '1.2rem', textAlign: 'center' }}
                            />
                        </div>
                        <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '0.75rem' }} disabled={loading}>
                            {loading ? <span className="spinner" /> : 'Sign in →'}
                        </button>
                        <button
                            type="button"
                            onClick={() => { setStep('phone'); setCode(''); setError(''); }}
                            style={{ width: '100%', textAlign: 'center', marginTop: '1rem', background: 'none', border: 'none', color: 'var(--gray-600)', fontSize: '0.88rem', cursor: 'pointer' }}
                        >
                            ← Use a different number
                        </button>
                    </form>
                )}

                {step === 'new_user' && (
                    <form onSubmit={handleSignup}>
                        <div className="form-group">
                            <label className="form-label">I am a…</label>
                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                {(['passenger', 'driver'] as const).map(r => (
                                    <button
                                        type="button"
                                        key={r}
                                        className={`status-chip ${role === r ? 'active available' : ''}`}
                                        onClick={() => setRole(r)}
                                        style={{ textTransform: 'capitalize' }}
                                    >
                                        {r === 'passenger' ? '🧳' : '🚗'} {r}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {role === 'driver' && (
                            <div className="form-group" style={{ animation: 'fadeIn 0.2s ease' }}>
                                <label className="form-label">Display name</label>
                                <input
                                    className="form-input"
                                    type="text"
                                    placeholder="How passengers will see you"
                                    value={displayName}
                                    onChange={e => setDisplayName(e.target.value)}
                                    maxLength={100}
                                />
                            </div>
                        )}

                        <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '0.75rem' }} disabled={loading}>
                            {loading ? <span className="spinner" /> : 'Create account →'}
                        </button>

                        <button
                            type="button"
                            onClick={() => { setStep('phone'); setCode(''); setError(''); }}
                            style={{ width: '100%', textAlign: 'center', marginTop: '1rem', background: 'none', border: 'none', color: 'var(--gray-600)', fontSize: '0.88rem', cursor: 'pointer' }}
                        >
                            ← Start over
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
