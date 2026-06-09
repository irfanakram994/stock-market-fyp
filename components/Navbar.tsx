'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, User, LogOut, Lock, ChevronDown } from 'lucide-react';
import ChangePasswordModal from './ChangePasswordModal';
import ProfileModal from './ProfileModal';
import { useAuth } from '@/lib/authContext';
import { fetchUserNotifications, markUserNotificationsRead, type UserNotification } from '@/lib/api';

export default function Navbar() {
    const { user, signOut } = useAuth();
    const [showDropdown, setShowDropdown] = useState(false);
    const [showProfile, setShowProfile] = useState(false);
    const [showChangePassword, setShowChangePassword] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [notifications, setNotifications] = useState<UserNotification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [toastNotification, setToastNotification] = useState<UserNotification | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const notificationRef = useRef<HTMLDivElement>(null);
    const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const seenNotificationIds = useRef<Set<string>>(new Set());
    const notificationsInitialized = useRef(false);
    const router = useRouter();

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }

            if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
                setShowNotifications(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const loadNotifications = useCallback(async (options: { allowToast?: boolean } = {}) => {
        try {
            const res = await fetchUserNotifications(5);
            if (!res.success || !res.data) {
                return;
            }

            setNotifications(res.data);
            setUnreadCount(res.data.filter((item) => !item.isRead).length);

            const newItems = res.data.filter((item) => !seenNotificationIds.current.has(item.id));
            const shouldToast = Boolean(options.allowToast && notificationsInitialized.current && newItems.length > 0);
            if (shouldToast) {
                const latest = newItems[0];
                setToastNotification(latest);

                if (toastTimerRef.current) {
                    clearTimeout(toastTimerRef.current);
                }

                toastTimerRef.current = setTimeout(() => {
                    setToastNotification(null);
                }, 2400);
            }

            res.data.forEach((item) => seenNotificationIds.current.add(item.id));
            notificationsInitialized.current = true;
        } catch {
            // Keep silent so navbar never breaks on notification fetch issues.
        }
    }, []);

    useEffect(() => {
        loadNotifications();
        const interval = setInterval(() => {
            if (document.visibilityState === 'visible') {
                void loadNotifications({ allowToast: true });
            }
        }, 180000);

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                void loadNotifications();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            clearInterval(interval);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (toastTimerRef.current) {
                clearTimeout(toastTimerRef.current);
            }
        };
    }, [loadNotifications]);

    const handleToggleNotifications = () => {
        setShowNotifications((current) => {
            const next = !current;
            if (next) void loadNotifications();
            return next;
        });
    };

    const handleNotificationClick = async (item: UserNotification) => {
        setNotifications((current) => current.map((notification) => (notification.id === item.id ? { ...notification, isRead: true } : notification)));
        setUnreadCount((current) => Math.max(0, current - 1));
        await markUserNotificationsRead([item.id]);
    };

    const handleLogout = async () => {
        setShowDropdown(false);

        try {
            await signOut();
        } finally {
            router.replace('/');
            router.refresh();
        }
    };

    const handleChangePassword = () => {
        setShowDropdown(false);
        setShowChangePassword(true);
    };

    const handleProfile = () => {
        setShowDropdown(false);
        setShowProfile(true);
    };

    return (
        <>
            <div className="h-16 bg-gradient-to-r from-dark-100 via-dark-100 to-dark-100/80 border-b border-gray-700/50 px-3 sm:px-4 flex items-center justify-end shadow-lg shadow-primary/5">
                {/* Right Section */}
                <div className="flex items-center space-x-4">
                    {/* Notifications */}
                    <div className="relative" ref={notificationRef}>
                        <button
                            onClick={handleToggleNotifications}
                            className="relative p-2 hover:bg-dark-200/60 rounded-lg transition-all hover:text-primary text-gray-400"
                        >
                            <Bell className="w-5 h-5" />
                            {unreadCount > 0 && (
                                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                            )}
                        </button>

                        {showNotifications && (
                            <div className="absolute right-0 mt-3 w-96 max-w-[calc(100vw-2rem)] rounded-xl border border-gray-700/60 bg-dark-100/95 shadow-2xl shadow-black/40 backdrop-blur-sm z-50 overflow-hidden">
                                <div className="flex items-center justify-between border-b border-gray-700/50 px-4 py-3">
                                    <div>
                                        <p className="text-sm font-semibold text-gray-100">Notifications</p>
                                        <p className="text-xs text-gray-400">Latest updates from admins</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setShowNotifications(false)}
                                        className="text-xs text-gray-400 hover:text-white"
                                    >
                                        Close
                                    </button>
                                </div>

                                <div className="max-h-96 overflow-y-auto">
                                    {notifications.length === 0 ? (
                                        <div className="px-4 py-8 text-center text-sm text-gray-400">
                                            No notifications yet.
                                        </div>
                                    ) : (
                                        notifications.map((item) => (
                                            <button
                                                key={item.id}
                                                type="button"
                                                onClick={() => handleNotificationClick(item)}
                                                className={`w-full border-b border-gray-800/70 px-4 py-3 text-left transition-colors hover:bg-dark-200/60 ${item.isRead ? 'opacity-70' : ''}`}
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-sm font-medium text-gray-100">{item.title}</p>
                                                        <p className="mt-1 text-xs leading-5 text-gray-400 line-clamp-2">{item.message}</p>
                                                    </div>
                                                    <span className={`mt-1 h-2.5 w-2.5 rounded-full ${item.isRead ? 'bg-gray-600' : 'bg-primary'}`} />
                                                </div>
                                                <p className="mt-2 text-[11px] uppercase tracking-wide text-gray-500">
                                                    {new Date(item.createdAt).toLocaleString()}
                                                </p>
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* User Profile with Dropdown */}
                    <div className="relative" ref={dropdownRef}>
                        <button
                            onClick={() => setShowDropdown(!showDropdown)}
                            className="flex items-center space-x-3 pl-4 border-l border-gray-700/50 hover:bg-dark-200/60 rounded-lg transition-all p-2 hover:text-primary"
                        >
                            <div className="text-right">
                                <div className="text-sm font-medium text-gray-100">{user?.name || 'User'}</div>
                                <div className="text-xs text-gray-400">{user?.email || ''}</div>
                            </div>
                            <div className="w-10 h-10 bg-gradient-to-br from-primary via-blue-400 to-accent rounded-full flex items-center justify-center shadow-lg shadow-primary/40 overflow-hidden">
                                {user?.profileImage ? (
                                    <img src={user.profileImage} alt="User profile" className="w-full h-full object-cover" />
                                ) : (
                                    <User className="w-5 h-5 text-white" />
                                )}
                            </div>
                            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${showDropdown ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Dropdown Menu */}
                        {showDropdown && (
                            <div className="absolute right-0 mt-2 w-56 bg-dark-100/95 backdrop-blur-sm border border-gray-700/50 rounded-lg shadow-2xl shadow-black/40 overflow-hidden z-50 animate-slide-up">
                                <div className="p-3 border-b border-gray-700/50 bg-gradient-to-r from-dark-100 to-dark-100/50">
                                    <div className="font-medium text-gray-100">{user?.name || 'User'}</div>
                                    <div className="text-sm text-gray-400">{user?.email || ''}</div>
                                </div>

                                <div className="py-2">
                                    <button
                                        onClick={handleProfile}
                                        className="w-full flex items-center space-x-3 px-4 py-2 hover:bg-primary/10 transition-all text-gray-300 hover:text-primary"
                                    >
                                        <User className="w-4 h-4" />
                                        <span>Profile</span>
                                    </button>

                                    <button
                                        onClick={handleChangePassword}
                                        className="w-full flex items-center space-x-3 px-4 py-2 hover:bg-primary/10 transition-all text-gray-300 hover:text-primary"
                                    >
                                        <Lock className="w-4 h-4" />
                                        <span>Change Password</span>
                                    </button>

                                    <button
                                        onClick={handleLogout}
                                        className="w-full flex items-center space-x-3 px-4 py-2 hover:bg-red-500/15 transition-all text-red-400/80 hover:text-red-400"
                                    >
                                        <LogOut className="w-4 h-4" />
                                        <span>Logout</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Change Password Modal */}
            <ProfileModal
                isOpen={showProfile}
                onClose={() => setShowProfile(false)}
            />

            {/* Change Password Modal */}
            <ChangePasswordModal
                isOpen={showChangePassword}
                onClose={() => setShowChangePassword(false)}
            />

            {toastNotification && (
                <div className="fixed right-6 top-20 z-[60] w-[min(24rem,calc(100vw-2rem))] rounded-xl border border-gray-700/60 bg-dark-100/95 p-4 shadow-2xl shadow-black/50 backdrop-blur-sm animate-slide-up">
                    <div className="flex items-start gap-3">
                        <div className="mt-0.5 rounded-full bg-primary/20 p-2 text-primary">
                            <Bell className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-white">{toastNotification.title}</p>
                            <p className="mt-1 text-sm text-gray-300">{toastNotification.message}</p>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
