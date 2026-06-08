'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Bell, ChevronDown, KeyRound, LogOut, Search, UserRound } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { adminFetch } from '@/lib/adminApi';
import { useAdminAuth } from '@/lib/adminAuthContext';
import { RolePasswordModal, RoleProfileModal } from '@/components/Admin/RoleAccountModals';

export default function AdminNavbar() {
  const router = useRouter();
  const { admin, signOut, refreshAdmin, updateAdminProfile } = useAdminAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const res = await adminFetch('/api/admin/notifications?limit=1');
        const data = await res.json();
        if (data.success) {
          setUnreadCount(data.unreadCount || 0);
        }
      } catch (error) {
        console.error('Error fetching notifications:', error);
      }
    };

    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [admin?.email]);

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

  const initial = admin?.name?.charAt(0) || admin?.email?.charAt(0)?.toUpperCase() || 'A';

  return (
    <>
      <header className="h-16 border-b border-slate-800 bg-[#08111f]/95 px-6 backdrop-blur-xl">
        <div className="flex h-full items-center justify-between gap-4">
          <div className="flex min-w-0 flex-1 items-center">
            <div className="relative w-full max-w-xl">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search users, predictions, logs..."
                className="h-10 w-full rounded-lg border border-slate-800 bg-slate-950/60 pl-10 pr-4 text-sm text-slate-200 outline-none transition-colors placeholder:text-slate-600 focus:border-emerald-300/60"
              />
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <Link
              href="/admin/notifications"
              className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-slate-800 bg-slate-950/40 text-slate-400 transition-colors hover:border-emerald-300/30 hover:text-emerald-300"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-400 px-1 text-[10px] font-bold text-slate-950">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>

            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setShowDropdown((value) => !value)}
                className="flex h-11 items-center gap-3 rounded-lg border border-slate-800 bg-slate-950/50 px-2.5 pr-3 text-left transition-colors hover:border-emerald-300/30 hover:bg-slate-900"
                aria-expanded={showDropdown}
              >
                <div className="h-8 w-8 overflow-hidden rounded-lg border border-emerald-300/20 bg-emerald-400/10">
                  {admin?.profileImage ? (
                    <Image src={admin.profileImage} alt={admin.name || 'Admin'} width={32} height={32} unoptimized className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-emerald-200">{initial}</div>
                  )}
                </div>
                <div className="hidden min-w-0 sm:block">
                  <p className="max-w-40 truncate text-sm font-semibold text-white">{admin?.name || 'Admin'}</p>
                  <p className="text-[11px] font-medium uppercase tracking-normal text-emerald-300">{admin?.role || 'Admin'}</p>
                </div>
                <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
              </button>

              {showDropdown && (
                <div className="absolute right-0 top-12 z-40 w-64 overflow-hidden rounded-lg border border-slate-800 bg-[#0b1220] shadow-2xl shadow-black/35">
                  <div className="border-b border-slate-800 px-4 py-3">
                    <p className="truncate text-sm font-semibold text-white">{admin?.name || 'Admin'}</p>
                    <p className="truncate text-xs text-slate-400">{admin?.email}</p>
                  </div>
                  <div className="p-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowProfile(true);
                        setShowDropdown(false);
                      }}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-300 transition-colors hover:bg-emerald-400/10 hover:text-emerald-200"
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
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-300 transition-colors hover:bg-emerald-400/10 hover:text-emerald-200"
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
        account={admin}
        endpoint="/api/admin/profile"
        fetcher={adminFetch}
        refreshAccount={refreshAdmin}
        onProfileSaved={updateAdminProfile}
        tone="admin"
        roleLabel="Admin"
      />
      <RolePasswordModal
        isOpen={showPassword}
        onClose={() => setShowPassword(false)}
        endpoint="/api/admin/change-password"
        fetcher={adminFetch}
        tone="admin"
        roleLabel="Admin"
      />
    </>
  );
}
