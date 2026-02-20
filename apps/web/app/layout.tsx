import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/AuthContext';
import Navbar from '@/components/Navbar';

export const metadata: Metadata = {
    title: 'TapRide – Student Ride Connector',
    description: 'Connect with trusted student drivers in your community. Quick, simple, and student-powered.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body>
                <AuthProvider>
                    <Navbar />
                    <main>{children}</main>
                </AuthProvider>
            </body>
        </html>
    );
}
