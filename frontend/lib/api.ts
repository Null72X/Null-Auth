const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://nullauthbackend.vercel.app/api/v1';
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

// In-memory client cache for lightning-fast tab navigation
interface CacheEntry {
  timestamp: number;
  data: any;
}

const apiCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 10000; // 10 seconds cache for rapid tab switching

export function clearApiCache() {
  apiCache.clear();
}

export interface FetchApiOptions extends RequestInit {
  skipCache?: boolean;
}

export async function fetchApi<T = any>(
  endpoint: string,
  options: FetchApiOptions = {}
): Promise<{ success: boolean; message: string; data?: T; error?: string; meta?: any }> {
  const token = getAuthToken();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const method = (options.method || 'GET').toUpperCase();
  const cacheKey = `${token || 'anon'}:${cleanEndpoint}`;

  // If writing or mutating data, invalidate cache so all tables stay fresh
  if (method !== 'GET') {
    clearApiCache();
  } else if (!options.skipCache) {
    const cached = apiCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_URL}${cleanEndpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (response.status === 401) {
      removeAuthToken();
      clearApiCache();
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }

    // Cache successful GET responses
    if (method === 'GET' && data.success) {
      apiCache.set(cacheKey, { timestamp: Date.now(), data });
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
