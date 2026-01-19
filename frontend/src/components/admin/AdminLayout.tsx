'use client';

import { useState, ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bars3Icon,
  XMarkIcon,
  HomeIcon,
  CubeIcon,
  TagIcon,
  ShoppingBagIcon,
  UsersIcon,
  PhotoIcon,
  DocumentTextIcon,
  ArrowRightOnRectangleIcon,
  BellIcon,
  UserCircleIcon,
  EnvelopeIcon,
  TicketIcon,
  ChatBubbleLeftRightIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';
import { useAuth, useLogout } from '@/hooks/useAuth';
import AuthGuard from '@/components/auth/AuthGuard';
import { useAdminI18n } from '@/lib/admin-i18n';

const navigation = [
  { key: 'nav.dashboard', name: 'Dashboard', href: '/admin', icon: HomeIcon },
  { key: 'nav.products', name: 'Products', href: '/admin/products', icon: CubeIcon },
  { key: 'nav.categories', name: 'Categories', href: '/admin/categories', icon: TagIcon },
  { key: 'nav.orders', name: 'Orders', href: '/admin/orders', icon: ShoppingBagIcon },
  { key: 'nav.customers', name: 'Customers', href: '/admin/customers', icon: UserCircleIcon },
  { key: 'nav.tickets', name: 'Support Tickets', href: '/admin/tickets', icon: ChatBubbleLeftRightIcon },
  { key: 'nav.coupons', name: 'Coupon Management', href: '/admin/coupons', icon: TicketIcon },
  { key: 'nav.users', name: 'All Users', href: '/admin/users', icon: UsersIcon },
  { key: 'nav.contacts', name: 'Contact Messages', href: '/admin/contacts', icon: EnvelopeIcon },
  { key: 'nav.media', name: 'Media Library', href: '/admin/media', icon: PhotoIcon },
  { key: 'nav.backup', name: 'Backup & Restore', href: '/admin/backup', icon: ArrowDownTrayIcon },
  { key: 'nav.homepage', name: 'Homepage Content', href: '/admin/homepage', icon: DocumentTextIcon },
];

interface AdminLayoutProps {
  children: ReactNode;
}

function AdminLayoutInner({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const { user } = useAuth();
  const logoutMutation = useLogout();
  const { locale, setLocale, t } = useAdminI18n();

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  // Make nested routes (e.g. /admin/products/new, /admin/products/[id]/edit) still show the parent title.
  const activeNav = navigation.find(item => pathname === item.href || pathname.startsWith(item.href + '/'));

  return (
    <div className="min-h-screen bg-gray-50 flex">
        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <div className="fixed inset-0 bg-gray-600 bg-opacity-75" />
          </div>
        )}

        {/* Sidebar */}
        <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
          <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-600 text-white px-3 py-1 rounded font-bold text-lg">
                FANUC
              </div>
              <span className="text-gray-900 font-semibold">Admin</span>
            </div>
            <button
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <XMarkIcon className="h-6 w-6 text-gray-400" />
            </button>
          </div>

          <nav className="mt-6 px-3">
            <div className="space-y-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      isActive
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <item.icon
                      className={`mr-3 h-5 w-5 ${
                        isActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
                      }`}
                    />
                    {t(item.key, item.name)}
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* User info at bottom */}
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
            <div className="flex items-center space-x-3 mb-3">
              <UserCircleIcon className="h-8 w-8 text-gray-400" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.full_name || user?.username}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {user?.role}
                </p>
              </div>
            </div>
	            <button
	              onClick={handleLogout}
	              className="w-full flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
	            >
	              <ArrowRightOnRectangleIcon className="mr-3 h-4 w-4" />
	              {t('action.signOut', 'Sign out')}
	            </button>
	          </div>
	        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col lg:ml-0">
          {/* Top navigation */}
          <header className="bg-white shadow-sm border-b border-gray-200">
            <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
              <div className="flex items-center">
                <button
                  className="lg:hidden"
                  onClick={() => setSidebarOpen(true)}
                >
                  <Bars3Icon className="h-6 w-6 text-gray-500" />
                </button>
                
                <h1 className="ml-4 lg:ml-0 text-xl font-semibold text-gray-900">
                  {activeNav ? t(activeNav.key, activeNav.name) : t('admin.panel', 'Admin Panel')}
                </h1>
              </div>

              <div className="flex items-center space-x-4">
                {/* Notifications */}
                <button className="relative p-2 text-gray-400 hover:text-gray-500">
                  <BellIcon className="h-6 w-6" />
                  <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-red-400"></span>
                </button>

                {/* Language */}
                <div className="flex items-center space-x-2">
                  <span className="hidden md:block text-sm text-gray-500">{t('action.language', 'Language')}</span>
                  <select
                    value={locale}
                    onChange={(e) => setLocale(e.target.value as any)}
                    className="block px-2 py-1 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label="Language"
                  >
                    <option value="en">English</option>
                    <option value="zh">中文</option>
                  </select>
                </div>

                {/* User menu */}
                <div className="flex items-center space-x-3">
                  <UserCircleIcon className="h-8 w-8 text-gray-400" />
                  <div className="hidden md:block">
                    <p className="text-sm font-medium text-gray-900">
                      {user?.full_name || user?.username}
                    </p>
                    <p className="text-xs text-gray-500">
                      {user?.role}
                    </p>
                  </div>

                  {/* Logout button */}
                  <button
                    onClick={handleLogout}
                    className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                    title={t('action.signOut', 'Sign out')}
                  >
                    <ArrowRightOnRectangleIcon className="h-5 w-5" />
                    <span className="ml-2 hidden sm:block">{t('action.signOut', 'Sign out')}</span>
                  </button>
                </div>
              </div>
            </div>
          </header>

	        {/* Page content */}
	        <main className="flex-1 overflow-y-auto">
	            <div className="p-4 sm:p-6 lg:p-8">
	              {children}
	            </div>
	        </main>
	        </div>
	      </div>
	  );
}

export function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <AuthGuard>
      <AdminLayoutInner>{children}</AdminLayoutInner>
    </AuthGuard>
  );
}

export default AdminLayout;
