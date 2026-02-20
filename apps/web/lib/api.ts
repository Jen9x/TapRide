const BASE = '/api';

function getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('rs_token');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = getToken();
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers as Record<string, string> || {}),
    };
    const res = await fetch(`${BASE}${path}`, { ...options, headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`);
    return data as T;
}

export const api = {
    // Auth
    sendOtp: (phone_number: string) =>
        request('/auth/send-otp', { method: 'POST', body: JSON.stringify({ phone_number }) }),

    verifyOtp: (phone_number: string, code: string, role?: string, display_name?: string) =>
        request<{ token: string; user: any; new_user: boolean }>('/auth/verify-otp', {
            method: 'POST',
            body: JSON.stringify({ phone_number, code, role, display_name }),
        }),

    // Drivers (public — no login required)
    getPublicDrivers: () =>
        request<{ drivers: any[] }>('/drivers/public'),

    // Drivers (authenticated)
    getDrivers: (params?: { search?: string; available_only?: boolean }) => {
        const q = new URLSearchParams();
        if (params?.search) q.set('search', params.search);
        if (params?.available_only) q.set('available_only', 'true');
        return request<{ drivers: any[] }>(`/drivers?${q.toString()}`);
    },

    getDriver: (id: string) =>
        request<any>(`/drivers/${id}`),

    updateStatus: (driverId: string, status: string) =>
        request(`/drivers/${driverId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),

    updateProfile: (driverId: string, data: any) =>
        request(`/drivers/${driverId}/profile`, { method: 'PATCH', body: JSON.stringify(data) }),

    updateAllowCalls: (driverId: string, allow_calls: boolean) =>
        request(`/drivers/${driverId}/allow-calls`, { method: 'PATCH', body: JSON.stringify({ allow_calls }) }),

    // Reviews
    getReviews: (driverId: string) =>
        request<{ reviews: any[] }>(`/reviews/${driverId}`),

    submitReview: (driver_id: string, stars: number, comment: string) =>
        request('/reviews', { method: 'POST', body: JSON.stringify({ driver_id, stars, comment }) }),

    // Blocks
    blockUser: (blocked_id: string) =>
        request('/blocks', { method: 'POST', body: JSON.stringify({ blocked_id }) }),

    unblockUser: (blocked_id: string) =>
        request(`/blocks/${blocked_id}`, { method: 'DELETE' }),

    getBlocks: () =>
        request<{ blocks: any[] }>('/blocks'),

    // Reports
    submitReport: (target_user_id: string, reason: string, details?: string) =>
        request('/reports', { method: 'POST', body: JSON.stringify({ target_user_id, reason, details }) }),

    // Admin
    adminGetReports: () => request<{ reports: any[] }>('/admin/reports'),
    adminGetUsers: () => request<{ users: any[] }>('/admin/users'),
    adminResolveReport: (id: string, status: string) =>
        request(`/admin/reports/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    adminBanUser: (id: string, is_banned: boolean) =>
        request(`/admin/users/${id}/ban`, { method: 'PATCH', body: JSON.stringify({ is_banned }) }),
    adminDeleteReview: (id: string) =>
        request(`/admin/reviews/${id}`, { method: 'DELETE' }),
};
