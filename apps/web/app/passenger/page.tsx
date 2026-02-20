'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { api } from '@/lib/api';

interface Driver {
    id: string;
    display_name: string;
    photo_url: string | null;
    car_make_model: string | null;
    bio: string | null;
    allow_calls: boolean;
    rating_avg: number;
    rating_count: number;
    status: string;
    phone_number: string | null;
}

interface Review {
    id: string;
    stars: number;
    comment: string | null;
    created_at: string;
    passenger_label: string;
}

export default function PassengerPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();

    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [search, setSearch] = useState('');
    const [availableOnly, setAvailableOnly] = useState(false);
    const [loading, setLoading] = useState(true);

    // Detail panel
    const [selected, setSelected] = useState<Driver | null>(null);
    const [reviews, setReviews] = useState<Review[]>([]);
    const [reviewsLoading, setReviewsLoading] = useState(false);

    // Review form
    const [reviewStars, setReviewStars] = useState(0);
    const [reviewComment, setReviewComment] = useState('');
    const [reviewSubmitting, setReviewSubmitting] = useState(false);

    // Report modal
    const [showReport, setShowReport] = useState(false);
    const [reportReason, setReportReason] = useState('spam');
    const [reportDetails, setReportDetails] = useState('');

    const [feedback, setFeedback] = useState('');
    const [feedbackType, setFeedbackType] = useState<'success' | 'error'>('success');

    const flash = (msg: string, type: 'success' | 'error' = 'success') => {
        setFeedback(msg);
        setFeedbackType(type);
        setTimeout(() => setFeedback(''), 4000);
    };

    const fetchDrivers = useCallback(async () => {
        try {
            const data = await api.getDrivers({ search: search || undefined, available_only: availableOnly || undefined });
            setDrivers(data.drivers);
        } catch { /* silent */ }
        setLoading(false);
    }, [search, availableOnly]);

    useEffect(() => {
        if (authLoading) return;
        if (!user) { router.replace('/auth'); return; }
        fetchDrivers();
    }, [authLoading, user, fetchDrivers, router]);

    const openDriver = async (driver: Driver) => {
        setSelected(driver);
        setReviewStars(0);
        setReviewComment('');
        setShowReport(false);
        setReviewsLoading(true);
        try {
            const data = await api.getReviews(driver.id);
            setReviews(data.reviews);
        } catch {
            setReviews([]);
        }
        setReviewsLoading(false);
    };

    const handleReview = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selected || reviewStars === 0) return;
        setReviewSubmitting(true);
        try {
            await api.submitReview(selected.id, reviewStars, reviewComment.trim());
            flash('Review submitted!');
            setReviewStars(0);
            setReviewComment('');
            const data = await api.getReviews(selected.id);
            setReviews(data.reviews);
            fetchDrivers(); // refresh ratings
        } catch (err: any) {
            flash(err.message || 'Failed to submit review', 'error');
        }
        setReviewSubmitting(false);
    };

    const handleReport = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selected) return;
        try {
            await api.submitReport(selected.id, reportReason, reportDetails.trim() || undefined);
            flash('Report submitted — our team will review it.');
            setShowReport(false);
            setReportDetails('');
        } catch (err: any) {
            flash(err.message || 'Failed to submit report', 'error');
        }
    };

    const handleBlock = async () => {
        if (!selected) return;
        if (!confirm(`Block ${selected.display_name}? They won't appear in your driver list.`)) return;
        try {
            await api.blockUser(selected.id);
            flash(`Blocked ${selected.display_name}`);
            setSelected(null);
            fetchDrivers();
        } catch (err: any) {
            flash(err.message || 'Failed to block user', 'error');
        }
    };

    if (authLoading || (!user && !authLoading)) return <div className="loading-page"><span className="spinner" /> Loading…</div>;

    return (
        <div className="page-pad">
            <h1 className="section-title" style={{ marginBottom: '0.25rem' }}>Find a Driver</h1>
            <p className="section-sub">Browse available drivers and tap call to connect directly.</p>

            {feedback && <div className={`alert alert-${feedbackType}`}>{feedback}</div>}

            {/* Filters */}
            <div className="filters-bar">
                <div className="search-bar" style={{ flex: 1 }}>
                    <span>🔍</span>
                    <input
                        placeholder="Search by name…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <label className="toggle-wrap" style={{ cursor: 'pointer' }}>
                    <span className="toggle">
                        <input type="checkbox" checked={availableOnly} onChange={e => setAvailableOnly(e.target.checked)} />
                        <span className="toggle-slider" />
                    </span>
                    <span className="toggle-label">Available only</span>
                </label>
            </div>

            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
                {/* Driver list */}
                <div style={{ flex: 1 }}>
                    {loading ? (
                        <div className="loading-page"><span className="spinner" /> Loading drivers…</div>
                    ) : drivers.length === 0 ? (
                        <div className="empty-state">
                            <div className="icon">🚗</div>
                            <h3>No drivers found</h3>
                            <p>Try adjusting your search or check back later.</p>
                        </div>
                    ) : (
                        <div className="driver-grid">
                            {drivers.map(d => (
                                <div key={d.id} className="driver-card" onClick={() => openDriver(d)} style={selected?.id === d.id ? { borderColor: 'var(--green)', boxShadow: 'var(--shadow)' } : {}}>
                                    <div className="avatar">
                                        {d.photo_url ? <img src={d.photo_url} alt="" /> : d.display_name.charAt(0).toUpperCase()}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                            <strong style={{ fontSize: '1rem' }}>{d.display_name}</strong>
                                            <span className={`status-badge ${d.status}`}><span className={`status-dot ${d.status}`} /> {d.status}</span>
                                        </div>
                                        {d.car_make_model && <p style={{ fontSize: '0.85rem', color: 'var(--gray-600)', marginBottom: '0.25rem' }}>🚙 {d.car_make_model}</p>}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem' }}>
                                            <span className="stars">{'★'.repeat(Math.round(d.rating_avg))}</span>
                                            <span style={{ color: 'var(--gray-400)' }}>{d.rating_avg.toFixed(1)} ({d.rating_count})</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Detail panel */}
                {selected && (
                    <div className="card" style={{ width: 380, flexShrink: 0, padding: '1.5rem', position: 'sticky', top: 80 }}>
                        <button onClick={() => setSelected(null)} style={{ float: 'right', background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--gray-400)' }}>✕</button>

                        <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
                            <div className="avatar avatar-lg" style={{ margin: '0 auto 0.75rem' }}>
                                {selected.photo_url ? <img src={selected.photo_url} alt="" /> : selected.display_name.charAt(0).toUpperCase()}
                            </div>
                            <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>{selected.display_name}</h2>
                            <span className={`status-badge ${selected.status}`}><span className={`status-dot ${selected.status}`} /> {selected.status}</span>
                            {selected.car_make_model && <p style={{ color: 'var(--gray-600)', fontSize: '0.88rem', marginTop: '0.35rem' }}>🚙 {selected.car_make_model}</p>}
                            {selected.bio && <p style={{ color: 'var(--gray-600)', fontSize: '0.88rem', marginTop: '0.5rem' }}>{selected.bio}</p>}
                            <div style={{ marginTop: '0.5rem' }}>
                                <span className="stars" style={{ fontSize: '1.2rem' }}>{'★'.repeat(Math.round(selected.rating_avg))}</span>
                                <span style={{ color: 'var(--gray-400)', fontSize: '0.88rem', marginLeft: '0.35rem' }}>{selected.rating_avg.toFixed(1)} ({selected.rating_count} reviews)</span>
                            </div>
                        </div>

                        {/* Call button */}
                        {selected.phone_number ? (
                            <a href={`tel:${selected.phone_number}`} className="btn btn-call" style={{ display: 'flex', marginBottom: '1rem' }}>
                                📞 Call {selected.display_name}
                            </a>
                        ) : (
                            <div className="alert alert-info" style={{ textAlign: 'center', marginBottom: '1rem' }}>
                                {selected.status !== 'available' ? 'Driver is not currently available.' : 'Driver has disabled calls.'}
                            </div>
                        )}

                        <hr className="divider" />

                        {/* Reviews */}
                        <h3 style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.75rem' }}>Reviews</h3>
                        {reviewsLoading ? (
                            <div style={{ textAlign: 'center', padding: '1rem' }}><span className="spinner" /></div>
                        ) : reviews.length === 0 ? (
                            <p style={{ color: 'var(--gray-400)', fontSize: '0.88rem', marginBottom: '1rem' }}>No reviews yet.</p>
                        ) : (
                            <div style={{ maxHeight: 220, overflowY: 'auto', marginBottom: '1rem' }}>
                                {reviews.map(r => (
                                    <div key={r.id} className="review-item">
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                                            <span className="stars">{'★'.repeat(r.stars)}{'☆'.repeat(5 - r.stars)}</span>
                                            <span style={{ color: 'var(--gray-400)', fontSize: '0.78rem' }}>{r.passenger_label}</span>
                                        </div>
                                        {r.comment && <p style={{ fontSize: '0.88rem', color: 'var(--gray-600)' }}>{r.comment}</p>}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Leave a review */}
                        {user?.role === 'passenger' && (
                            <form onSubmit={handleReview} style={{ marginBottom: '1rem' }}>
                                <label className="form-label">Leave a review</label>
                                <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '0.5rem' }}>
                                    {[1, 2, 3, 4, 5].map(s => (
                                        <button key={s} type="button" className={`star-btn ${reviewStars >= s ? 'active' : ''}`} onClick={() => setReviewStars(s)}>★</button>
                                    ))}
                                </div>
                                <textarea
                                    className="form-input form-textarea"
                                    placeholder="Optional comment (max 300 chars)"
                                    value={reviewComment}
                                    onChange={e => setReviewComment(e.target.value)}
                                    maxLength={300}
                                    style={{ minHeight: 60, marginBottom: '0.5rem' }}
                                />
                                <button className="btn btn-primary btn-sm" disabled={reviewStars === 0 || reviewSubmitting} style={{ width: '100%', justifyContent: 'center' }}>
                                    {reviewSubmitting ? <span className="spinner" /> : 'Submit Review'}
                                </button>
                            </form>
                        )}

                        <hr className="divider" />

                        {/* Report & Block */}
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button className="btn btn-outline btn-sm" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setShowReport(!showReport)}>
                                🚩 Report
                            </button>
                            <button className="btn btn-danger btn-sm" style={{ flex: 1, justifyContent: 'center' }} onClick={handleBlock}>
                                🚫 Block
                            </button>
                        </div>

                        {showReport && (
                            <form onSubmit={handleReport} style={{ marginTop: '1rem' }}>
                                <div className="form-group">
                                    <label className="form-label">Reason</label>
                                    <select className="form-input form-select" value={reportReason} onChange={e => setReportReason(e.target.value)}>
                                        <option value="spam">Spam</option>
                                        <option value="harassment">Harassment</option>
                                        <option value="unsafe">Unsafe behavior</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Details (optional)</label>
                                    <textarea className="form-input form-textarea" value={reportDetails} onChange={e => setReportDetails(e.target.value)} style={{ minHeight: 60 }} />
                                </div>
                                <button className="btn btn-primary btn-sm" style={{ width: '100%', justifyContent: 'center' }}>Submit Report</button>
                            </form>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
