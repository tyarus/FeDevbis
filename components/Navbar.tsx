"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { ChevronDown } from "lucide-react";
import { NotificationDropdown } from "./NotificationDropdown";

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, token, logout, initialize } = useAuthStore();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    initialize();
  }, [initialize]);

  if (!isMounted) return null;

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  return (
    <nav className="sticky top-0 z-50 bg-white/85 backdrop-blur-navbar border-b border-border">
      <div className="max-content h-[52px] flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="font-semibold text-xs leading-5 text-text-primary">
          Escrow
        </Link>

        {/* Center Links */}
        <div className="hidden md:flex gap-8">
          <Link
            href="/products"
            className="text-xs leading-5 text-text-secondary hover:text-text-primary transition-colors"
          >
            Produk
          </Link>
          <Link
            href="/orders"
            className="text-xs leading-5 text-text-secondary hover:text-text-primary transition-colors"
          >
            Pesanan
          </Link>
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-4">
          {!token ? (
            <>
              <Link
                href="/login"
                className="text-xs leading-5 text-text-secondary hover:text-text-primary transition-colors"
              >
                Masuk
              </Link>
              <Link href="/register" className="btn-primary text-xs">
                Daftar
              </Link>
            </>
          ) : (
            <div className="flex items-center gap-4">
              {/* Notification Dropdown for Sellers */}
              <NotificationDropdown />

              {/* Profile Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-2 text-xs leading-5 text-text-primary hover:text-text-secondary transition-colors"
                >
                  {user?.name}
                  <ChevronDown size={16} />
                </button>

                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white border border-border rounded-card shadow-lg">
                    <Link
                      href={user?.role === "seller" ? "/seller/dashboard" : "/dashboard"}
                      className="block px-4 py-3 text-xs hover:bg-bg-secondary transition-colors"
                    >
                      Dashboard
                    </Link>
                    {user?.role === "seller" && (
                      <Link
                        href="/seller/products"
                        className="block px-4 py-3 text-xs hover:bg-bg-secondary transition-colors border-t border-border"
                      >
                        Produk Saya
                      </Link>
                    )}
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-3 text-xs text-accent-error hover:bg-bg-secondary transition-colors border-t border-border"
                    >
                      Keluar
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
