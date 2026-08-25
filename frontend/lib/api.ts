const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://null-auth-backend.vercel.app/api/v1';
const API_URL = rawApiUrl.replace(/\/+$/, '');

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('null_auth_token');
}

export function setAuthToken(token: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('null_auth_token', token);
  }
}

export function removeAuthToken() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('null_auth_token');
  }
}

export async function fetchApi<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ success: boolean; message: string; data?: T; error?: string; meta?: any }> {
  const token = getAuthToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  try {
    const response = await fetch(`${API_URL}${cleanEndpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (response.status === 401) {
      removeAuthToken();
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }

    return data;
  } catch (err: any) {
    console.error(`API Connection Error [${API_URL}${cleanEndpoint}]:`, err);
    return {
      success: false,
      message: 'Failed to connect to Null-Auth backend server.',
      error: err.message,
    };
  }
}
