'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Bell, ChevronDown, KeyRound, LogOut, Search, UserRound } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { RolePasswordModal, RoleProfileModal } from '@/components/Admin/RoleAccountModals';
import { useSuperAdminAuth } from '@/lib/superAdminAuthContext';
import { superAdminFetch } from '@/lib/superAdminApi';

export default function SuperAdminNavbar() {
  const router = useRouter();
  const { superAdmin, signOut, refreshSuperAdmin, updateSuperAdminProfile } = useSuperAdminAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const res = await superAdminFetch('/api/super-admin/notifications?limit=1');
        const data = await res.json();
        if (data.success) {
          setUnreadCount(data.unreadCount || 0);
        }
      } catch {
        setUnreadCount(0);
      }
    };

    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  const initial = superAdmin?.name?.charAt(0) || superAdmin?.email?.charAt(0)?.toUpperCase() || 'S';

  return (
    <>
      <header className="h-16 border-b border-slate-800 bg-[#0b0d1c]/95 px-3 backdrop-blur-xl sm:px-4">
        <div className="flex h-full items-center justify-between gap-4">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="hidden h-10 shrink-0 items-center gap-2 rounded-lg border border-fuchsia-300/20 bg-fuchsia-400/10 px-2.5 text-fuchsia-100 shadow-lg shadow-fuchsia-950/20 sm:flex">
              <Image
                src="/logo-only-no-text.png"
                alt="TradeFlux"
                width={30}
                height={30}
                className="h-7 w-7 object-contain"
              />
              <span className="hidden text-sm font-semibold text-white xl:inline">TradeFlux</span>
            </div>
            <div className="relative w-full max-w-xl">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search admins, logs, modules..."
                className="h-10 w-full rounded-lg border border-slate-800 bg-slate-950/60 pl-10 pr-4 text-sm text-slate-200 outline-none transition-colors placeholder:text-slate-600 focus:border-fuchsia-300/60"
              />
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <Link
              href="/super-admin/notifications"
              className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-slate-800 bg-slate-950/40 text-slate-400 transition-colors hover:border-fuchsia-300/30 hover:text-fuchsia-300"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-fuchsia-400 px-1 text-[10px] font-bold text-slate-950">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>

            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setShowDropdown((value) => !value)}
                className="flex h-11 items-center gap-3 rounded-lg border border-slate-800 bg-slate-950/50 px-2.5 pr-3 text-left transition-colors hover:border-fuchsia-300/30 hover:bg-slate-900"
                aria-expanded={showDropdown}
              >
                <div className="h-8 w-8 overflow-hidden rounded-lg border border-fuchsia-300/20 bg-fuchsia-400/10">
                  {superAdmin?.profileImage ? (
                    <Image src={superAdmin.profileImage} alt={superAdmin.name || 'Super Admin'} width={32} height={32} unoptimized className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-fuchsia-200">{initial}</div>
                  )}
                </div>
                <div className="hidden min-w-0 sm:block">
                  <p className="max-w-44 truncate text-sm font-semibold text-white">{superAdmin?.name || 'Super Admin'}</p>
                  <p className="text-[11px] font-medium uppercase tracking-normal text-fuchsia-300">{superAdmin?.role || 'SUPER_ADMIN'}</p>
                </div>
                <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
              </button>

              {showDropdown && (
                <div className="absolute right-0 top-12 z-40 w-64 overflow-hidden rounded-lg border border-slate-800 bg-[#0d1021] shadow-2xl shadow-black/35">
                  <div className="border-b border-slate-800 px-4 py-3">
                    <p className="truncate text-sm font-semibold text-white">{superAdmin?.name || 'Super Admin'}</p>
                    <p className="truncate text-xs text-slate-400">{superAdmin?.email}</p>
                  </div>
                  <div className="p-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowProfile(true);
                        setShowDropdown(false);
                      }}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-300 transition-colors hover:bg-fuchsia-400/10 hover:text-fuchsia-200"
                    >
                      <UserRound className="h-4 w-4" />
                      Edit Profile
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowPassword(true);
                        setShowDropdown(false);
                      }}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-300 transition-colors hover:bg-fuchsia-400/10 hover:text-fuchsia-200"
                    >
                      <KeyRound className="h-4 w-4" />
                      Change Password
                    </button>
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="mt-1 flex w-full items-center gap-3 rounded-lg border-t border-slate-800 px-3 py-2.5 text-sm text-red-300 transition-colors hover:bg-red-500/10"
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <RoleProfileModal
        isOpen={showProfile}
        onClose={() => setShowProfile(false)}
        account={superAdmin}
        endpoint="/api/super-admin/profile"
        fetcher={superAdminFetch}
        refreshAccount={refreshSuperAdmin}
        onProfileSaved={updateSuperAdminProfile}
        tone="super"
        roleLabel="Super Admin"
      />
      <RolePasswordModal
        isOpen={showPassword}
        onClose={() => setShowPassword(false)}
        endpoint="/api/super-admin/change-password"
        fetcher={superAdminFetch}
        tone="super"
        roleLabel="Super Admin"
      />
    </>
  );
}
