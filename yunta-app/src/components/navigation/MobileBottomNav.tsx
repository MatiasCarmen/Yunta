'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Home, Receipt, Users, Wallet, MoreHorizontal } from 'lucide-react';

interface MobileBottomNavProps {
  onMoreClick: () => void;
}

export default function MobileBottomNav({ onMoreClick }: MobileBottomNavProps) {
  const pathname = usePathname();

  const navItems = [
    {
      label: 'Inicio',
      icon: Home,
      href: '/dashboard',
      isActive: pathname === '/dashboard',
    },
    {
      label: 'Movimientos',
      icon: Receipt,
      href: '/dashboard/transactions/new',
      isActive: pathname?.startsWith('/dashboard/transactions'),
    },
    {
      label: 'Junta',
      icon: Users,
      href: '/dashboard/junta',
      isActive: pathname === '/dashboard/junta',
    },
    {
      label: 'Caja',
      icon: Wallet,
      href: '/dashboard/junta/caja',
      isActive: pathname === '/dashboard/junta/caja',
    },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 lg:hidden shadow-[0_-2px_10px_rgba(0,0,0,0.08)]"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-1 px-3 py-1.5 rounded-lg transition-all min-w-[64px] ${
                item.isActive
                  ? 'text-indigo-600 bg-indigo-50'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Icon className={`w-5 h-5 ${item.isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
              <span className="text-[10px] font-medium leading-none">{item.label}</span>
            </Link>
          );
        })}

        {/* Más button */}
        <button
          onClick={onMoreClick}
          className="flex flex-col items-center justify-center gap-1 px-3 py-1.5 rounded-lg transition-all min-w-[64px] text-slate-600 hover:bg-slate-50"
        >
          <MoreHorizontal className="w-5 h-5 stroke-2" />
          <span className="text-[10px] font-medium leading-none">Más</span>
        </button>
      </div>
    </nav>
  );
}
