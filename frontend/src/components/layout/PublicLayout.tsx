'use client';

import { ReactNode } from 'react';
import Header from './Header';
import Footer from './Footer';
import CartSidebar from '../cart/CartSidebar';
import WhatsAppButton from '../ui/WhatsAppButton';

interface PublicLayoutProps {
  children: ReactNode;
}

export function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
      <CartSidebar />
      <WhatsAppButton />
    </div>
  );
}

export default PublicLayout;
