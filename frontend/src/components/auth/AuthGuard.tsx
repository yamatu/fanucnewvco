'use client';

import { useEffect, ReactNode, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { usePermissions } from '@/hooks/useAuth';
import { toast } from 'react-hot-toast';

interface AuthGuardProps {
  children: ReactNode;
  requiredRole?: string | string[];
  fallback?: ReactNode;
}

export function AuthGuard({ children, requiredRole, fallback }: AuthGuardProps) {
  const router = useRouter();
  const { isAuthenticated, user, checkAuth, isLoading } = useAuthStore();
  const { hasRole } = usePermissions();
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    // Check authentication status on mount
    setInitialized(true);
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    // Avoid redirects on the very first effect flush.
    // Without this, a page refresh on a deep admin route can briefly see
    // isAuthenticated=false before checkAuth flips isLoading=true, causing
    // a client redirect to /admin/login and then middleware bounces back to /admin.
    if (!initialized) return;

    // Only redirect after auth check is complete and we're not loading
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push('/admin/login');
        return;
      }

      if (requiredRole && !hasRole(requiredRole)) {
        toast.error('You do not have permission to access this page');
        router.push('/admin');
        return;
      }
    }
  }, [initialized, isAuthenticated, user, requiredRole, router, hasRole, isLoading]);

  // Show loading while checking auth or if not authenticated
  if (isLoading || !isAuthenticated || (requiredRole && !hasRole(requiredRole))) {
    return fallback || <AuthGuardFallback />;
  }

  return <>{children}</>;
}

function AuthGuardFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Checking authentication...</p>
      </div>
    </div>
  );
}

// Higher-order component for protecting pages
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  requiredRole?: string | string[]
) {
  return function AuthenticatedComponent(props: P) {
    return (
      <AuthGuard requiredRole={requiredRole}>
        <Component {...props} />
      </AuthGuard>
    );
  };
}

// Role-based component wrapper
interface RoleGuardProps {
  children: ReactNode;
  allowedRoles: string | string[];
  fallback?: ReactNode;
}

export function RoleGuard({ children, allowedRoles, fallback }: RoleGuardProps) {
  const { hasRole } = usePermissions();

  if (!hasRole(allowedRoles)) {
    return fallback || (
      <div className="text-center py-8">
        <p className="text-gray-500">You do not have permission to view this content.</p>
      </div>
    );
  }

  return <>{children}</>;
}

// Admin only wrapper
export function AdminOnly({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <RoleGuard allowedRoles="admin" fallback={fallback}>
      {children}
    </RoleGuard>
  );
}

// Editor and Admin wrapper
export function EditorOnly({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <RoleGuard allowedRoles={['admin', 'editor']} fallback={fallback}>
      {children}
    </RoleGuard>
  );
}

export default AuthGuard;
