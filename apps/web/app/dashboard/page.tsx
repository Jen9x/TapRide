'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { api } from '@/lib/api';

interface Profile {
    display_name: string;
    photo_url: string | null;
    car_make_model: string | null;
    bio: string | null;
    allow_calls: boolean;
    rating_avg: number;
    rating_count: number;
    status: string;
}

interface Review {
    id: string;
    stars: number;
    comment: string | null;
    created_at: string;
    passenger_label: string;
}

export default function DashboardPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();

    const [profile, setProfile] = useState<Profile | null>(null);
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [statusUpdating, setStatusUpdating] = useState('');

    // Editable fields
    const [displayName, setDisplayName] = useState('');
    const [carModel, setCarModel] = useState('');
    const [bio, setBio] = useState('');
    const [allowCalls, setAllowCalls] = useState(true);

    const [feedback, setFeedback] = useState('');
    const [feedbackType, setFeedbackType] = useState<'success' | 'error'>('success');

    const flash = (msg: string, type: 'success' | 'error' = 'success') => {
        setFeedback(msg);
        setFeedbackType(type);
        setTimeout(() => setFeedback(''), 4000);
    };

    const fetchData = useCallback(async () => {
        if (!user) return;
        try {
            const data = await api.getDriver(user.id);
            setProfile(data);
            setDisplayName(data.display_name);
            setCarModel(data.car_make_model || '');
            setBio(data.bio || '');
            setAllowCalls(data.allow_calls);

            const revData = await api.getReviews(user.id);
            setReviews(revData.reviews);
        } catch { /* silent */ }
        setLoading(false);
    }, [user]);

    useEffect(() => {
        if (authLoading) return;
        if (!user) { router.replace('/auth'); return; }
        if (user.role !== 'driver' && !user.is_admin) { router.replace('/passenger'); return; }
        fetchData();
    }, [authLoading, user, fetchData, router]);

    const handleStatusChange = async (status: string) => {
        if (!user || statusUpdating) return;
        setStatusUpdating(status);
        try {
            await api.updateStatus(user.id, status);
            setProfile(p => p ? { ...p, status } : p);
            flash(`Status set to ${status}`);
        } catch (err: any) {
            flash(err.message || 'Failed to update status', 'error');
        }
        setStatusUpdating('');
    };

    const handleProfileSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || saving) return;
        if (!displayName.trim() || displayName.trim().length < 2) {
            flash('Display name must be at least 2 characters', 'error');
            return;
        }
        setSaving(true);
        try {
            await api.updateProfile(user.id, {
                display_name: displayName.trim(),
                photo_url: profile?.photo_url || null,
                car_make_model: carModel.trim() || null,
                bio: bio.trim() || null,
            });
            flash('Profile updated!');
        } catch (err: any) {
            flash(err.message || 'Failed to save profile', 'error');
        }
        setSaving(false);
    };

    const handleToggleCalls = async (val: boolean) => {
        if (!user) return;
        setAllowCalls(val);
        try {
            await api.updateAllowCalls(user.id, val);
            flash(val ? 'Calls enabled — passengers can call you.' : 'Calls disabled.');
        } catch (err: any) {
            setAllowCalls(!val);
            flash(err.message || 'Failed to update', 'error');
        }
    };

    if (authLoading || loading) return <div className="loading-page"><span className="spinner" /> Loading…</div>;
    if (!profile) return <div className="loading-page">Could not load profile.</div>;

    const currentStatus = profile.status;

    return (
        <div className="page-pad" style={{ maxWidth: 720, margin: '0 auto' }}>
            <h1 className="section-title" style={{ marginBottom: '0.25rem' }}>Driver Dashboard</h1>
            <p className="section-sub">Manage your status, profile, and view your reviews.</p>

            {feedback && <div className={`alert alert-${feedbackType}`}>{feedback}</div>}

            {/* ── Status toggle ──────────────────────────────────── */}
            <div className="card" style={{ padding: '1.5rem', marginBottom: '1.25rem' }}>
                <h2 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.75rem' }}>Your Status</h2>
                <div className="status-toggle-group">
                    {(['available', 'busy', 'offline'] as const).map(s => (
                        <button
                            key={s}
                            className={`status-chip ${currentStatus === s ? `active ${s}` : ''}`}
                            onClick={() => handleStatusChange(s)}
                            disabled={!!statusUpdating}
                        >
                            <span className={`status-dot ${s}`} />
                            {statusUpdating === s ? <span className="spinner" /> : s.charAt(0).toUpperCase() + s.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Profile editor ─────────────────────────────────── */}
            <div className="card" style={{ padding: '1.5rem', marginBottom: '1.25rem' }}>
                <h2 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '1rem' }}>Edit Profile</h2>
                <form onSubmit={handleProfileSave}>
                    <div className="form-group">
                        <label className="form-label">Display name</label>
                        <input className="form-input" value={displayName} onChange={e => setDisplayName(e.target.value)} maxLength={100} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Car make / model</label>
                        <input className="form-input" value={carModel} onChange={e => setCarModel(e.target.value)} placeholder="e.g. Honda Civic 2021" maxLength={100} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Bio</label>
                        <textarea className="form-input form-textarea" value={bio} onChange={e => setBio(e.target.value)} placeholder="Tell passengers about yourself…" maxLength={500} />
                    </div>
                    <div className="form-group">
                        <label className="toggle-wrap" style={{ cursor: 'pointer' }}>
                            <span className="toggle">
                                <input type="checkbox" checked={allowCalls} onChange={e => handleToggleCalls(e.target.checked)} />
                                <span className="toggle-slider" />
                            </span>
                            <span className="toggle-label">Allow passengers to call me</span>
                        </label>
                    </div>
                    <button className="btn btn-primary" disabled={saving} style={{ width: '100%', justifyContent: 'center', padding: '0.75rem' }}>
                        {saving ? <span className="spinner" /> : 'Save Profile'}
                    </button>
                </form>
            </div>

            {/* ── Ratings overview ────────────────────────────────── */}
            <div className="card" style={{ padding: '1.5rem', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h2 style={{ fontWeight: 700, fontSize: '1rem' }}>Your Reviews</h2>
                    <div>
                        <span className="stars" style={{ fontSize: '1.1rem' }}>{'★'.repeat(Math.round(profile.rating_avg))}</span>
                        <span style={{ color: 'var(--gray-400)', fontSize: '0.85rem', marginLeft: '0.35rem' }}>
                            {profile.rating_avg.toFixed(1)} ({profile.rating_count})
                        </span>
                    </div>
                </div>

                {reviews.length === 0 ? (
                    <div className="empty-state" style={{ padding: '2rem 0' }}>
                        <div className="icon">⭐</div>
                        <h3>No reviews yet</h3>
                        <p>Set your status to Available and start connecting with passengers!</p>
                    </div>
                ) : (
                    <div>
                        {reviews.map(r => (
                            <div key={r.id} className="review-item">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                                    <span className="stars">{'★'.repeat(r.stars)}{'☆'.repeat(5 - r.stars)}</span>
                                    <span style={{ color: 'var(--gray-400)', fontSize: '0.78rem' }}>
                                        {r.passenger_label} · {new Date(r.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                                {r.comment && <p style={{ fontSize: '0.88rem', color: 'var(--gray-600)' }}>{r.comment}</p>}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
