'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { api } from '@/lib/api';

interface PublicDriver {
    id: string;
    display_name: string;
    photo_url: string | null;
    car_make_model: string | null;
    bio: string | null;
    rating_avg: number;
    rating_count: number;
    status: string;
}

export default function LandingPage() {
    const { user } = useAuth();
    const [drivers, setDrivers] = useState<PublicDriver[]>([]);
    const [loadingDrivers, setLoadingDrivers] = useState(true);

    useEffect(() => {
        api.getPublicDrivers()
            .then(data => setDrivers(data.drivers))
            .catch(() => { })
            .finally(() => setLoadingDrivers(false));
    }, []);

    return (
        <>
            {/* Hero */}
            <section className="hero">
                <div className="hero-inner">
                    <h1>
                        Student rides, <span className="accent">real connections.</span>
                    </h1>
                    <p>
                        TapRide connects students with trusted drivers on campus. No bookings, no prices —
                        just tap <strong>call</strong> and coordinate directly.
                    </p>
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                        {user ? (
                            <Link
                                href={user.role === 'driver' || user.role === 'admin' ? '/dashboard' : '/passenger'}
                                className="btn btn-primary"
                                style={{ padding: '0.8rem 2rem', fontSize: '1rem' }}
                            >
                                {user.role === 'driver' || user.role === 'admin' ? 'Go to Dashboard →' : 'Browse Drivers →'}
                            </Link>
                        ) : (
                            <Link href="/auth" className="btn btn-primary" style={{ padding: '0.8rem 2rem', fontSize: '1rem' }}>
                                Get Started →
                            </Link>
                        )}
                        <Link href="/terms" className="btn btn-outline" style={{ padding: '0.8rem 2rem', fontSize: '1rem', color: 'white', borderColor: 'rgba(255,255,255,0.35)' }}>
                            Read Terms
                        </Link>
                    </div>
                </div>
            </section>

            {/* How it works */}
            <section className="section" style={{ background: 'white' }}>
                <div className="container">
                    <h2 className="section-title" style={{ textAlign: 'center' }}>How it works</h2>
                    <p className="section-sub" style={{ textAlign: 'center' }}>Three steps to connect with a driver</p>
                    <div style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', marginTop: '2rem' }}>
                        {[
                            { icon: '📱', title: '1. Sign up', text: 'Verify your phone number with a one-time code. Choose if you\'re a passenger or driver.' },
                            { icon: '🔍', title: '2. Find a driver', text: 'Browse available drivers. See their name, car, and rating in real time.' },
                            { icon: '📞', title: '3. Call & coordinate', text: 'Tap the green call button to dial the driver directly. Arrange everything from there.' },
                        ].map(card => (
                            <div key={card.title} className="card" style={{ padding: '2rem', textAlign: 'center' }}>
                                <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>{card.icon}</div>
                                <h3 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>{card.title}</h3>
                                <p style={{ color: 'var(--gray-600)', lineHeight: 1.6 }}>{card.text}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Available Drivers */}
            <section className="section" style={{ background: 'var(--gray-100)' }}>
                <div className="container">
                    <h2 className="section-title" style={{ textAlign: 'center' }}>Available Drivers</h2>
                    <p className="section-sub" style={{ textAlign: 'center' }}>
                        See who&apos;s on the road right now.{' '}
                        {!user && <span style={{ color: 'var(--green-dark)', fontWeight: 600 }}>Sign in to call them.</span>}
                    </p>

                    {loadingDrivers ? (
                        <div className="loading-page" style={{ minHeight: '20vh' }}><span className="spinner" /> Loading drivers…</div>
                    ) : drivers.length === 0 ? (
                        <div className="empty-state" style={{ padding: '3rem 0' }}>
                            <div className="icon">🚗</div>
                            <h3>No drivers yet</h3>
                            <p>Be the first to sign up as a driver!</p>
                        </div>
                    ) : (
                        <div className="driver-grid">
                            {drivers.map(d => (
                                <div key={d.id} className="driver-card" style={{ cursor: 'default' }}>
                                    <div className="avatar">
                                        {d.photo_url ? <img src={d.photo_url} alt="" /> : d.display_name.charAt(0).toUpperCase()}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                            <strong style={{ fontSize: '1rem' }}>{d.display_name}</strong>
                                            <span className={`status-badge ${d.status}`}>
                                                <span className={`status-dot ${d.status}`} /> {d.status}
                                            </span>
                                        </div>
                                        {d.car_make_model && (
                                            <p style={{ fontSize: '0.85rem', color: 'var(--gray-600)', marginBottom: '0.25rem' }}>🚙 {d.car_make_model}</p>
                                        )}
                                        {d.bio && (
                                            <p style={{ fontSize: '0.82rem', color: 'var(--gray-400)', marginBottom: '0.35rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.bio}</p>
                                        )}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                                            <span className="stars">{'★'.repeat(Math.round(d.rating_avg))}</span>
                                            <span style={{ color: 'var(--gray-400)' }}>{d.rating_avg.toFixed(1)} ({d.rating_count})</span>
                                        </div>

                                        {user ? (
                                            d.status === 'available' ? (
                                                <Link href="/passenger" className="btn btn-primary btn-sm" style={{ width: '100%', justifyContent: 'center' }}>
                                                    📞 Call Driver
                                                </Link>
                                            ) : (
                                                <span style={{ fontSize: '0.82rem', color: 'var(--gray-400)' }}>Currently {d.status}</span>
                                            )
                                        ) : (
                                            <Link href="/auth" className="btn btn-outline btn-sm" style={{ width: '100%', justifyContent: 'center' }}>
                                                Sign in to call
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* Safety note */}
            <section className="section" style={{ background: 'white' }}>
                <div className="container">
                    <div className="card" style={{ padding: '2rem', background: 'var(--green-bg)', border: '1px solid var(--green-light)' }}>
                        <h3 style={{ color: 'var(--green-dark)', marginBottom: '0.75rem', fontWeight: 700, fontSize: '1.2rem' }}>
                            🛡️ Safety first
                        </h3>
                        <ul style={{ listStyle: 'none', display: 'grid', gap: '0.5rem' }}>
                            {[
                                'Phone OTP verification — every user is real.',
                                'Driver phone number is hidden when not Available.',
                                'Rate and review drivers after your ride.',
                                'Report or block any user at any time.',
                                'Admin team reviews all reports promptly.',
                            ].map(item => (
                                <li key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', color: 'var(--gray-700)' }}>
                                    <span style={{ color: 'var(--green)', fontWeight: 700 }}>✓</span> {item}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </section>

            {/* Disclaimer */}
            <section style={{ background: 'var(--gray-100)', padding: '2rem 0', borderTop: '1px solid var(--gray-200)' }}>
                <div className="container">
                    <p style={{ color: 'var(--gray-400)', fontSize: '0.85rem', textAlign: 'center', maxWidth: 700, margin: '0 auto' }}>
                        <strong>Disclaimer:</strong> TapRide is a connection platform only. It does not provide, arrange, or guarantee
                        transportation services. Drivers operate independently and set their own availability. By using this platform
                        you agree to our <Link href="/terms" style={{ color: 'var(--green-dark)', textDecoration: 'underline' }}>Terms of Service</Link>.
                    </p>
                </div>
            </section>
        </>
    );
}
