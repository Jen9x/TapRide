'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';

export default function Navbar() {
    const { user, logout } = useAuth();
    const router = useRouter();

    const handleLogout = () => {
        logout();
        router.push('/');
    };

    return (
        <nav className="navbar">
            <div className="navbar-inner">
                <Link href="/" className="navbar-logo">
                    🚗 <span>Tap<b style={{ color: 'var(--green)' }}>Ride</b></span>
                </Link>
                <div className="navbar-links">
                    {!user ? (
                        <>
                            <Link href="/terms" className="btn btn-outline btn-sm">Terms</Link>
                            <Link href="/auth" className="btn btn-primary btn-sm">Sign In</Link>
                        </>
                    ) : (
                        <>
                            {user.role === 'passenger' || user.is_admin ? (
                                <Link href="/passenger" className="btn btn-outline btn-sm">Find Drivers</Link>
                            ) : null}
                            {user.role === 'driver' ? (
                                <Link href="/dashboard" className="btn btn-outline btn-sm">Dashboard</Link>
                            ) : null}
                            {user.is_admin && (
                                <Link href="/admin" className="btn btn-outline btn-sm">⚙ Admin</Link>
                            )}
                            <button onClick={handleLogout} className="btn btn-outline btn-sm">Log out</button>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
}
