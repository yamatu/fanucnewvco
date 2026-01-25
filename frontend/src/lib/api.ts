import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import Cookies from 'js-cookie';
import { toast } from 'react-hot-toast';

// API Configuration
const resolveApiBaseUrl = () => {
  // In the browser, use relative path so Next.js rewrites can proxy to the backend
  const isBrowser = typeof window !== 'undefined';
  if (isBrowser) {
    return '/api/v1';
  }
  // On the server (SSR), use absolute base URL
  const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';
  return `${backendUrl}/api/v1`;
};

const API_V1_URL = resolveApiBaseUrl();

// Log API base once in dev to avoid noise in SSR/CSR
try {
  if (process.env.NODE_ENV !== 'production') {
    const g: any = globalThis as any;
    if (!g.__API_BASE_URL_LOGGED) {
      g.__API_BASE_URL_LOGGED = true;
      console.log('🔧 API Base URL:', API_V1_URL);
    }
  }
} catch (_) {
  // ignore logging errors
}

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_V1_URL,
  timeout: 60000, // Increase timeout to 60 seconds
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    // Only attempt to read cookies in the browser environment
    let adminToken: string | undefined;
    let customerToken: string | undefined;
    if (typeof window !== 'undefined') {
      try {
        adminToken = Cookies.get('auth_token');
        customerToken = Cookies.get('customer_token');
      } catch (_) {
        // In case js-cookie throws in unusual environments, ignore and proceed without tokens
      }
    }

    // Choose token based on the request URL
    let token: string | undefined;

    if (config.url?.includes('/admin/') || config.url?.includes('/auth/')) {
      // Admin routes - use admin token
      token = adminToken;
    } else if (config.url?.includes('/customer/')) {
      // Customer routes - use customer token
      token = customerToken;
    } else {
      // For other routes (like public orders), prefer customer token if available
      token = customerToken || adminToken;
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error) => {
    // Only log meaningful error information
    const errorInfo: Record<string, any> = {};

    if (error?.message && error.message !== 'Error') {
      errorInfo.message = error.message;
    }
    if (error?.code) {
      errorInfo.code = error.code;
    }
    if (error?.response?.status) {
      errorInfo.status = error.response.status;
    }
    if (error?.response?.statusText) {
      errorInfo.statusText = error.response.statusText;
    }
    if (error?.config?.url) {
      errorInfo.url = error.config.url;
    }
    if (error?.config?.method) {
      errorInfo.method = error.config.method?.toUpperCase();
    }
    if (error?.config?.baseURL) {
      errorInfo.baseURL = error.config.baseURL;
    }
    if (error?.response?.data && typeof error.response.data === 'object') {
      errorInfo.data = error.response.data;
      // Also surface server-side `error` field as message fallback
      if (!errorInfo.message && (error.response.data as any).error) {
        errorInfo.message = (error.response.data as any).error;
      }
      if (!errorInfo.message && (error.response.data as any).message) {
        errorInfo.message = (error.response.data as any).message;
      }
    }
    // If server responded with non-JSON (e.g., HTML error page), capture a short preview
    if (error?.response?.data && typeof error.response.data === 'string') {
      const txt = String(error.response.data);
      errorInfo.dataText = txt.length > 300 ? `${txt.slice(0, 300)}...` : txt;
    }

    // Check if error is completely empty before logging
    const isEmptyError = !error ||
                        (typeof error === 'object' && Object.keys(error).length === 0) ||
                        Object.keys(errorInfo).length === 0;

    // Only log if we have meaningful error information
    if (!isEmptyError) {
      console.error('🚨 API Error:', errorInfo);
    }

    // Handle specific error cases
    if (error?.code === 'ECONNABORTED' ||
        error?.message?.includes('timeout') ||
        error?.message?.includes('aborted') ||
        (error?.code === 23 && error?.constructor?.name === 'TimeoutError')) {
      console.warn('🔧 Request timed out or was aborted');
      // Don't show toast for timeout errors during development as they're expected
      if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
        toast.error('Request timed out. Please try again.');
      }
    } else if (error?.response?.status === 401) {
      // Unauthorized - clear invalid tokens but don't redirect
      // Let the components handle navigation based on their context
      if (typeof window !== 'undefined') {
        try {
          const reqUrl = String(error?.config?.url || '');
          if (reqUrl.includes('/customer/')) {
            Cookies.remove('customer_token');
          } else if (reqUrl.includes('/admin/') || reqUrl.includes('/auth/')) {
            Cookies.remove('auth_token');
          }
        } catch (_) {
          // ignore cookie cleanup errors in non-browser contexts
        }
      }

      // Only show error toast if not on a login page
      if (typeof window !== 'undefined' && !window.location.pathname.includes('login')) {
        toast.error('Your session has expired. Please login again.');
      }
    } else if (error?.response?.status >= 500) {
      if (typeof window !== 'undefined') {
        toast.error('Server error. Please try again later.');
      }
    } else if (error?.response?.data?.message || error?.response?.data?.error) {
      if (typeof window !== 'undefined') {
        toast.error(error.response.data.message || error.response.data.error);
      }
    } else if (error?.code === 'ECONNREFUSED' || error?.message?.includes('Network Error')) {
      console.warn('🔧 Backend server appears to be down');
      // Don't show toast for network errors as services will handle fallback
    } else if (!error?.response && !error?.code && !error?.message) {
      // Handle cases where error object is completely empty - don't log these
      return Promise.reject(error);
    }

    return Promise.reject(error);
  }
);

// Generic API methods
export const apiClient = {
  get: <T>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> =>
    api.get(url, config),
  
  post: <T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> =>
    api.post(url, data, config),
  
  put: <T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> =>
    api.put(url, data, config),
  
  delete: <T>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> =>
    api.delete(url, config),
  
  patch: <T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> =>
    api.patch(url, data, config),
};

// Auth utilities
export const authUtils = {
  setToken: (token: string) => {
    Cookies.set('auth_token', token, { expires: 7 }); // 7 days
  },
  
  getToken: () => {
    return Cookies.get('auth_token');
  },
  
  removeToken: () => {
    Cookies.remove('auth_token');
  },
  
  isAuthenticated: () => {
    return !!Cookies.get('auth_token');
  },
};

export default api;
