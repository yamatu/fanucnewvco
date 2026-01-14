import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import Cookies from 'js-cookie';
import { Customer, CustomerService, LoginRequest, RegisterRequest } from '@/services/customer.service';

interface CustomerAuthState {
  customer: Customer | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface CustomerAuthActions {
  login: (credentials: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
  setCustomer: (customer: Customer) => void;
  updateCustomer: (customer: Customer) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  checkAuth: () => Promise<void>;
}

export const useCustomerStore = create<CustomerAuthState & CustomerAuthActions>()(
  persist(
    (set, get) => ({
      // State
      customer: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Actions
      login: async (credentials) => {
        try {
          set({ isLoading: true, error: null });
          const response = await CustomerService.login(credentials);

          Cookies.set('customer_token', response.token, {
            expires: 7,
            sameSite: 'lax'
          });

          set({
            customer: response.customer,
            token: response.token,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error: any) {
          set({
            error: error.message || 'Login failed',
            isLoading: false,
          });
          throw error;
        }
      },

      register: async (data) => {
        try {
          set({ isLoading: true, error: null });
          const response = await CustomerService.register(data);

          Cookies.set('customer_token', response.token, {
            expires: 7,
            sameSite: 'lax',
          });

          set({
            customer: response.customer,
            token: response.token,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error: any) {
          set({
            error: error.message || 'Registration failed',
            isLoading: false,
          });
          throw error;
        }
      },

      logout: () => {
        Cookies.remove('customer_token');
        set({
          customer: null,
          token: null,
          isAuthenticated: false,
          error: null,
        });
      },

      setCustomer: (customer) => {
        set({
          customer,
          isAuthenticated: !!customer,
        });
      },

      updateCustomer: (customer) => {
        set({ customer });
      },

      setLoading: (loading) => {
        set({ isLoading: loading });
      },

      setError: (error) => {
        set({ error });
      },

      clearError: () => {
        set({ error: null });
      },

      checkAuth: async () => {
        try {
          set({ isLoading: true });
          const token = Cookies.get('customer_token');

          if (token) {
            try {
              const customer = await CustomerService.getProfile();
              set({
                customer,
                token,
                isAuthenticated: true,
                isLoading: false,
              });
            } catch (error) {
              // Token is invalid, clear auth state
              Cookies.remove('customer_token');
              set({
                customer: null,
                token: null,
                isAuthenticated: false,
                isLoading: false,
              });
            }
          } else {
            set({
              customer: null,
              token: null,
              isAuthenticated: false,
              isLoading: false,
            });
          }
        } catch (error) {
          set({
            customer: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      },
    }),
    {
      name: 'customer-auth-storage',
      partialize: (state) => ({
        customer: state.customer,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Selectors
export const useCustomer = () => {
  const store = useCustomerStore();
  return {
    customer: store.customer,
    token: store.token,
    isAuthenticated: store.isAuthenticated,
    isLoading: store.isLoading,
    error: store.error,
    login: store.login,
    register: store.register,
    logout: store.logout,
    setCustomer: store.setCustomer,
    updateCustomer: store.updateCustomer,
    setLoading: store.setLoading,
    setError: store.setError,
    clearError: store.clearError,
    checkAuth: store.checkAuth,
  };
};

// Helper hooks
export const useCustomerData = () => useCustomerStore((state) => state.customer);
export const useIsCustomerAuthenticated = () => useCustomerStore((state) => state.isAuthenticated);
export const useCustomerLoading = () => useCustomerStore((state) => state.isLoading);
export const useCustomerError = () => useCustomerStore((state) => state.error);
