'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bars3Icon,
  XMarkIcon,
  ShoppingCartIcon,
  MagnifyingGlassIcon,
  PhoneIcon,
  EnvelopeIcon,
  UserCircleIcon
} from '@heroicons/react/24/outline';
import { useCart } from '@/store/cart.store';
import { useCustomer } from '@/store/customer.store';
import { cn } from '@/lib/utils';
import { CartSidebar } from '@/components/cart/CartSidebar';
import { Category } from '@/types';
import { CategoryService } from '@/services';
import { queryKeys } from '@/lib/react-query';

const navigation = [
  { name: 'Home', href: '/' },
  { name: 'Products', href: '/products' },
  { name: 'Categories', href: '/categories' },
  { name: 'About', href: '/about' },
  { name: 'Contact', href: '/contact' },
];

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const router = useRouter();
  const { itemCount, toggleCart } = useCart();
  const { isAuthenticated, customer, logout } = useCustomer();

  const handleLogout = () => {
    logout();
    setUserMenuOpen(false);
    router.push('/');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
      setSearchQuery('');
    }
  };

  return (
    <header className="bg-white shadow-lg sticky top-0 z-50">
      {/* Top Bar */}
      <div className="bg-yellow-500 text-black py-2">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center text-sm">
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <PhoneIcon className="h-4 w-4" />
                <span suppressHydrationWarning>+86 13348028050</span>

              </div>
              <div className="flex items-center space-x-2">
                <EnvelopeIcon className="h-4 w-4" />
                <span suppressHydrationWarning>13348028050@139.com</span>

              </div>
            </div>
            <div className="hidden md:flex items-center space-x-4">
              <span suppressHydrationWarning>Professional FANUC Parts & Services | Vcocnc Since 2005</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-3">
              <div className="bg-yellow-500 text-black px-4 py-2 rounded-lg font-bold text-xl">
                Vcocnc
              </div>
              <div className="hidden sm:block">
                <div className="text-xl font-bold text-gray-900">CNC Solutions</div>
                <div className="text-sm text-gray-600">Since 2005</div>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-8">
            {navigation.map((item) => {
              if (item.name === 'Categories') {
                return (
                  <CategoriesDropdown key={item.name} />
                );
              }
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className="text-gray-700 hover:text-yellow-600 font-medium transition-colors duration-200"
                >
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-4">
            {/* Search */}
            <div className="relative">
              <button
                onClick={() => setSearchOpen(!searchOpen)}
                className="p-2 text-gray-600 hover:text-yellow-600 transition-colors"
              >
                <MagnifyingGlassIcon className="h-6 w-6" />
              </button>
              
              {searchOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50">
                  <form onSubmit={handleSearch}>
                    <div className="flex">
                      <input
                        type="text"
                        placeholder="Search products..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                        autoFocus
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 bg-yellow-500 text-black rounded-r-md hover:bg-yellow-600 transition-colors font-semibold"
                      >
                        Search
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>

            {/* Cart */}
            <button
              onClick={toggleCart}
              className="relative p-2 text-gray-600 hover:text-yellow-600 transition-colors"
            >
              <ShoppingCartIcon className="h-6 w-6" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-yellow-500 text-black text-xs rounded-full h-5 w-5 flex items-center justify-center font-semibold">
                  {itemCount}
                </span>
              )}
            </button>

            {/* User Menu */}
            {isAuthenticated && customer ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center space-x-2 p-2 text-gray-600 hover:text-yellow-600 transition-colors"
                >
                  <UserCircleIcon className="h-6 w-6" />
                  <span className="hidden md:inline text-sm font-medium">{customer.full_name}</span>
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50">
                    <Link
                      href="/account"
                      onClick={() => setUserMenuOpen(false)}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      My Account
                    </Link>
                    <Link
                      href="/account/orders"
                      onClick={() => setUserMenuOpen(false)}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      My Orders
                    </Link>
                    <Link
                      href="/account/tickets"
                      onClick={() => setUserMenuOpen(false)}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Support Tickets
                    </Link>
                    <hr className="my-1" />
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="hidden md:flex items-center space-x-2">
                <Link
                  href="/login"
                  className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-yellow-600 transition-colors"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="px-3 py-2 text-sm font-medium text-white bg-yellow-500 rounded-md hover:bg-yellow-600 transition-colors"
                >
                  Register
                </Link>
              </div>
            )}

            {/* Mobile menu button */}
            <button
              type="button"
              className="lg:hidden p-2 text-gray-600 hover:text-yellow-600"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <XMarkIcon className="h-6 w-6" />
              ) : (
                <Bars3Icon className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-gray-200">
          <div className="px-4 py-4 space-y-4">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="block text-gray-700 hover:text-yellow-600 font-medium py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.name}
              </Link>
            ))}
            
            {/* Mobile Search */}
            <div className="pt-4 border-t border-gray-200">
              <form onSubmit={handleSearch} className="flex">
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-yellow-500 text-black rounded-r-md hover:bg-yellow-600 transition-colors font-semibold"
                >
                  Search
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Search Overlay for mobile */}
      {searchOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSearchOpen(false)}
        />
      )}

      {/* Cart Sidebar */}
      <CartSidebar />
    </header>
  );
}

export default Header;

// --- Categories Dropdown (desktop) ---
function CategoriesDropdown() {
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: queryKeys.categories.lists(),
    queryFn: () => CategoryService.getCategories(),
  });

  return (
    <div className="relative group">
      <Link
        href="/categories"
        className="text-gray-700 hover:text-yellow-600 font-medium transition-colors duration-200 py-2 px-1 block"
      >
        Categories
      </Link>
      {/* Invisible bridge to prevent hover gap */}
      <div className="absolute top-full left-0 w-full h-2 bg-transparent"></div>
      {/* Dropdown Panel */}
      {Array.isArray(categories) && categories.length > 0 && (
        <div className="invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-200 ease-in-out transform group-hover:translate-y-0 translate-y-1 absolute left-0 top-full mt-1 w-[480px] max-h-[80vh] overflow-auto rounded-xl border border-gray-100 bg-white shadow-2xl z-50 p-4 backdrop-blur-sm">
          <div className="mb-3 pb-2 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">Product Categories</h3>
          </div>
          <CategoryTree categories={categories} level={0} />
        </div>
      )}
    </div>
  );
}

function CategoryTree({ categories, level = 0 }: { categories: Category[]; level?: number }) {
  if (!categories || categories.length === 0) return null;
  return (
    <ul className="space-y-0.5">
      {categories.map((cat) => (
        <li key={cat.id}>
          <div className="flex flex-col">
            <Link
              href={`/products?category_id=${cat.id}`}
              className={cn(
                "block py-2 px-3 rounded-lg transition-all duration-150 text-sm font-medium hover:bg-gradient-to-r hover:from-yellow-50 hover:to-yellow-100 hover:text-yellow-800 hover:shadow-sm text-gray-700 group/item",
                level === 0 && "text-gray-900 font-semibold",
                level === 1 && "text-gray-700 ml-4",
                level >= 2 && "text-gray-600 ml-8"
              )}
            >
              <div className="flex items-center">
                {level === 0 && (
                  <div className="w-2 h-2 rounded-full bg-yellow-400 mr-3 group-hover/item:bg-yellow-500 transition-colors"></div>
                )}
                {level === 1 && (
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-400 mr-3 group-hover/item:bg-yellow-500 transition-colors"></div>
                )}
                {level >= 2 && (
                  <div className="w-1 h-1 rounded-full bg-gray-300 mr-3 group-hover/item:bg-yellow-400 transition-colors"></div>
                )}
                <span className="truncate">{cat.name}</span>
                {Array.isArray(cat.children) && cat.children.length > 0 && (
                  <span className="ml-auto text-xs text-gray-400 group-hover/item:text-yellow-600">
                    ({cat.children.length})
                  </span>
                )}
              </div>
            </Link>
            {Array.isArray(cat.children) && cat.children.length > 0 && (
              <div className="mt-1 border-l-2 border-gray-100 ml-6 pl-2">
                <CategoryTree categories={cat.children} level={level + 1} />
              </div>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
