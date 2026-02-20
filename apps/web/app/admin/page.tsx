'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { api } from '@/lib/api';

interface Report {
    id: string;
    reason: string;
    details: string | null;
    status: string;
    created_at: string;
    reporter_phone: string;
    reporter_id: string;
    target_phone: string;
    target_id: string;
    target_role: string;
    target_banned: boolean;
}

interface UserRow {
    id: string;
    phone_number: string;
    role: string;
    is_banned: boolean;
    is_admin: boolean;
    created_at: string;
    display_name: string | null;
}

export default function AdminPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();

    const [tab, setTab] = useState<'reports' | 'users'>('reports');
    const [reports, setReports] = useState<Report[]>([]);
    const [users, setUsers] = useState<UserRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [feedback, setFeedback] = useState('');
    const [feedbackType, setFeedbackType] = useState<'success' | 'error'>('success');

    const flash = (msg: string, type: 'success' | 'error' = 'success') => {
        setFeedback(msg);
        setFeedbackType(type);
        setTimeout(() => setFeedback(''), 4000);
    };

    useEffect(() => {
        if (authLoading) return;
        if (!user) { router.replace('/auth'); return; }
        if (!user.is_admin) { router.replace('/passenger'); return; }
        loadData();
    }, [authLoading, user, router]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [repData, userData] = await Promise.all([
                api.adminGetReports(),
                api.adminGetUsers(),
            ]);
            setReports(repData.reports);
            setUsers(userData.users);
        } catch { /* silent */ }
        setLoading(false);
    };

    const handleResolve = async (id: string, newStatus: string) => {
        try {
            await api.adminResolveReport(id, newStatus);
            setReports(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
            flash(`Report ${newStatus}`);
        } catch (err: any) {
            flash(err.message || 'Failed to update report', 'error');
        }
    };

    const handleBan = async (id: string, ban: boolean) => {
        if (!confirm(ban ? 'Ban this user?' : 'Unban this user?')) return;
        try {
            await api.adminBanUser(id, ban);
            setUsers(prev => prev.map(u => u.id === id ? { ...u, is_banned: ban } : u));
            flash(ban ? 'User banned' : 'User unbanned');
        } catch (err: any) {
            flash(err.message || 'Failed to update ban status', 'error');
        }
    };

    if (authLoading || loading) return <div className="loading-page"><span className="spinner" /> Loading…</div>;

    return (
        <div className="page-pad">
            <h1 className="section-title" style={{ marginBottom: '0.25rem' }}>Admin Panel</h1>
            <p className="section-sub">Manage reports and users</p>

            {feedback && <div className={`alert alert-${feedbackType}`}>{feedback}</div>}

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                {(['reports', 'users'] as const).map(t => (
                    <button
                        key={t}
                        className={`btn ${tab === t ? 'btn-primary' : 'btn-outline'}`}
                        onClick={() => setTab(t)}
                        style={{ textTransform: 'capitalize' }}
                    >
                        {t === 'reports' ? '🚩' : '👤'} {t} ({t === 'reports' ? reports.length : users.length})
                    </button>
                ))}
            </div>

            {/* Reports tab */}
            {tab === 'reports' && (
                <div className="card" style={{ overflowX: 'auto' }}>
                    {reports.length === 0 ? (
                        <div className="empty-state">
                            <div className="icon">🎉</div>
                            <h3>No reports</h3>
                            <p>All clear!</p>
                        </div>
                    ) : (
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Status</th>
                                    <th>Reason</th>
                                    <th>Reporter</th>
                                    <th>Target</th>
                                    <th>Details</th>
                                    <th>Date</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reports.map(r => (
                                    <tr key={r.id}>
                                        <td>
                                            <span className={`status-badge ${r.status === 'open' ? 'busy' : 'available'}`}>
                                                {r.status}
                                            </span>
                                        </td>
                                        <td style={{ fontWeight: 600 }}>{r.reason}</td>
                                        <td style={{ fontSize: '0.82rem' }}>…{r.reporter_phone.slice(-4)}</td>
                                        <td>
                                            <span style={{ fontSize: '0.82rem' }}>…{r.target_phone.slice(-4)}</span>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--gray-400)', marginLeft: '0.25rem' }}>({r.target_role})</span>
                                            {r.target_banned && <span style={{ color: 'var(--red)', fontSize: '0.75rem', marginLeft: '0.25rem' }}>BANNED</span>}
                                        </td>
                                        <td style={{ maxWidth: 200, fontSize: '0.82rem', color: 'var(--gray-600)' }}>
                                            {r.details || '—'}
                                        </td>
                                        <td style={{ fontSize: '0.82rem', color: 'var(--gray-400)', whiteSpace: 'nowrap' }}>
                                            {new Date(r.created_at).toLocaleDateString()}
                                        </td>
                                        <td>
                                            {r.status === 'open' ? (
                                                <button className="btn btn-primary btn-sm" onClick={() => handleResolve(r.id, 'resolved')}>
                                                    Resolve
                                                </button>
                                            ) : (
                                                <button className="btn btn-outline btn-sm" onClick={() => handleResolve(r.id, 'open')}>
                                                    Reopen
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {/* Users tab */}
            {tab === 'users' && (
                <div className="card" style={{ overflowX: 'auto' }}>
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>User</th>
                                <th>Phone</th>
                                <th>Role</th>
                                <th>Joined</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(u => (
                                <tr key={u.id}>
                                    <td>
                                        <strong>{u.display_name || '—'}</strong>
                                        {u.is_admin && <span style={{ fontSize: '0.75rem', color: 'var(--green-dark)', marginLeft: '0.35rem' }}>ADMIN</span>}
                                    </td>
                                    <td style={{ fontSize: '0.85rem' }}>{u.phone_number}</td>
                                    <td>
                                        <span className={`status-badge ${u.role === 'driver' ? 'available' : u.role === 'admin' ? 'busy' : 'offline'}`}>
                                            {u.role}
                                        </span>
                                    </td>
                                    <td style={{ fontSize: '0.82rem', color: 'var(--gray-400)', whiteSpace: 'nowrap' }}>
                                        {new Date(u.created_at).toLocaleDateString()}
                                    </td>
                                    <td>
                                        {u.is_banned ? (
                                            <span style={{ color: 'var(--red)', fontWeight: 600, fontSize: '0.85rem' }}>Banned</span>
                                        ) : (
                                            <span style={{ color: 'var(--green-dark)', fontSize: '0.85rem' }}>Active</span>
                                        )}
                                    </td>
                                    <td>
                                        {!u.is_admin && (
                                            u.is_banned ? (
                                                <button className="btn btn-outline btn-sm" onClick={() => handleBan(u.id, false)}>Unban</button>
                                            ) : (
                                                <button className="btn btn-danger btn-sm" onClick={() => handleBan(u.id, true)}>Ban</button>
                                            )
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
