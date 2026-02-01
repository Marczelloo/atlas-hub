'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Database,
  HardDrive,
  Settings,
  Home,
  ChevronRight,
  Users,
  KeyRound,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';

const navigation = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Projects', href: '/projects', icon: Database },
  { name: 'Storage', href: '/storage', icon: HardDrive },
  { name: 'Settings', href: '/settings', icon: Settings },
];

const adminNavigation = [
  { name: 'Users', href: '/admin/users', icon: Users },
  { name: 'Invites', href: '/admin/invites', icon: KeyRound },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAdmin, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <aside className="flex flex-col w-64 min-h-screen border-r border-zinc-800 bg-zinc-900">
      <div className="p-4 border-b border-zinc-800">
        <Link href="/" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <Database className="h-5 w-5 text-emerald-500" />
          </div>
          <span className="font-semibold text-lg text-zinc-100">AtlasHub</span>
        </Link>
      </div>

      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {navigation.map((item) => {
            const isActive =
              pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                  {isActive && <ChevronRight className="h-4 w-4 ml-auto" />}
                </Link>
              </li>
            );
          })}
        </ul>

        {isAdmin && (
          <>
            <div className="my-4 border-t border-zinc-800" />
            <p className="px-3 mb-2 text-xs font-medium text-zinc-500 uppercase tracking-wider">
              Admin
            </p>
            <ul className="space-y-1">
              {adminNavigation.map((item) => {
                const isActive = pathname.startsWith(item.href);

                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.name}
                      {isActive && <ChevronRight className="h-4 w-4 ml-auto" />}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </nav>

      <div className="p-4 border-t border-zinc-800">
        {user && (
          <div className="mb-3">
            <p className="text-sm font-medium text-zinc-200 truncate">{user.email}</p>
            <p className="text-xs text-zinc-500 capitalize">{user.role}</p>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="w-full justify-start text-zinc-400 hover:text-red-400 hover:bg-red-500/10"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign out
        </Button>
        <p className="mt-3 text-xs text-zinc-600">AtlasHub v0.1.0</p>
      </div>
    </aside>
  );
}
