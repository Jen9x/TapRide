import Link from 'next/link';

export default function TermsPage() {
    return (
        <div className="page-narrow" style={{ paddingTop: '2.5rem', paddingBottom: '4rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>Terms of Service</h1>
            <p style={{ color: 'var(--gray-400)', fontSize: '0.85rem', marginBottom: '2rem' }}>Last updated: February 2026</p>

            <div className="card" style={{ padding: '2rem' }}>
                <Section title="1. Acceptance of Terms">
                    By accessing or using TapRide (&quot;the Platform&quot;), you agree to be bound by these Terms of
                    Service. If you do not agree, do not use the Platform.
                </Section>

                <Section title="2. Platform Description">
                    TapRide is a <strong>connection platform only</strong>. It allows verified users (passengers)
                    to discover available drivers on campus and contact them directly by phone. TapRide does not
                    provide, broker, or guarantee any transportation services.
                </Section>

                <Section title="3. User Accounts">
                    <ul style={{ paddingLeft: '1.25rem', display: 'grid', gap: '0.4rem' }}>
                        <li>You must verify your phone number via a one-time code (OTP) to create an account.</li>
                        <li>You may register as either a <strong>passenger</strong> or a <strong>driver</strong>.</li>
                        <li>Providing false information may result in account suspension.</li>
                        <li>You are responsible for all activity under your account.</li>
                    </ul>
                </Section>

                <Section title="4. Driver Responsibilities">
                    Drivers operate independently. By making themselves &quot;Available,&quot; drivers indicate willingness
                    to receive calls. Drivers may set their own terms, routes, and availability. TapRide does not
                    employ, supervise, or control drivers in any way.
                </Section>

                <Section title="5. Safety &amp; Conduct">
                    <ul style={{ paddingLeft: '1.25rem', display: 'grid', gap: '0.4rem' }}>
                        <li>Harassment, threats, or unsafe behavior will result in immediate suspension.</li>
                        <li>Users may <strong>block</strong> any other user at any time.</li>
                        <li>Users may <strong>report</strong> violations (spam, harassment, unsafe conduct, or other).</li>
                        <li>The admin team reviews all reports and may ban offenders.</li>
                    </ul>
                </Section>

                <Section title="6. Reviews &amp; Ratings">
                    Passengers may leave one review per driver per 24-hour period. Reviews must be honest and
                    constructive. The admin team reserves the right to remove reviews that violate these terms.
                </Section>

                <Section title="7. Privacy">
                    <ul style={{ paddingLeft: '1.25rem', display: 'grid', gap: '0.4rem' }}>
                        <li>Your phone number is stored securely and used solely for authentication and driver contact.</li>
                        <li>A driver&apos;s phone number is only visible to logged-in users when the driver is &quot;Available&quot; and has enabled calls.</li>
                        <li>Passenger phone numbers in reviews are masked (only last 4 digits shown).</li>
                    </ul>
                </Section>

                <Section title="8. Limitation of Liability">
                    TapRide is provided &quot;as is&quot; without warranties of any kind. We are not liable for any
                    damages arising from the use of the Platform, including but not limited to rides arranged through
                    connections made on the Platform.
                </Section>

                <Section title="9. Changes to Terms">
                    We may update these terms at any time. Continued use of the Platform after changes constitutes
                    acceptance of the revised terms.
                </Section>

                <hr className="divider" />

                <p style={{ color: 'var(--gray-400)', fontSize: '0.85rem', textAlign: 'center' }}>
                    Questions? Contact the admin team.{' '}
                    <Link href="/" style={{ color: 'var(--green-dark)', textDecoration: 'underline' }}>
                        Back to home
                    </Link>
                </p>
            </div>
        </div>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div style={{ marginBottom: '1.75rem' }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--gray-800)' }}>{title}</h2>
            <div style={{ color: 'var(--gray-600)', lineHeight: 1.7, fontSize: '0.93rem' }}>{children}</div>
        </div>
    );
}
