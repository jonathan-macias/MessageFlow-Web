"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/lib/context/auth-context";

const NAV_LINKS = [
  { href: "/datasets", label: "Datasets" },
  { href: "/flows", label: "Flows" },
];

function isActive(href: string, pathname: string): boolean {
  if (href === "/datasets") return pathname === "/datasets" || pathname.startsWith("/datasets/");
  if (href === "/flows") return pathname === "/flows" || pathname.startsWith("/flows/");
  return pathname === href;
}

export function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const userRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setUserOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function closeMenus() {
    setMobileOpen(false);
    setUserOpen(false);
  }

  if (!isAuthenticated) return null;

  return (
    <nav className="sticky top-0 z-50 border-b border-black/10 dark:border-white/10 bg-white/80 dark:bg-black/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-black/60">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" onClick={closeMenus} className="font-bold text-sm tracking-tight">
          Message Flow
        </Link>

        {/* Desktop links */}
        <div className="hidden sm:flex items-center gap-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                isActive(link.href, pathname)
                  ? "bg-foreground text-background"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-foreground dark:hover:text-foreground hover:bg-black/[.04] dark:hover:bg-white/[.06]"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* User dropdown */}
          <div ref={userRef} className="relative">
            <button
              onClick={() => setUserOpen(!userOpen)}
              className="flex items-center gap-1.5 text-sm text-zinc-600 dark:text-zinc-400 hover:text-foreground dark:hover:text-foreground px-2 py-1 rounded transition-colors"
            >
              <span className="hidden sm:inline truncate max-w-[140px]">{user?.email}</span>
              <svg className={`w-3.5 h-3.5 transition-transform ${userOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {userOpen && (
              <div className="absolute right-0 top-full mt-1 w-48 rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 shadow-lg py-1 text-sm">
                <div className="px-3 py-2 border-b border-black/5 dark:border-white/5">
                  <p className="text-xs text-zinc-500">Session</p>
                  <p className="font-medium truncate">{user?.email}</p>
                </div>
                <button
                  onClick={() => {
                    logout();
                    closeMenus();
                    router.replace("/login");
                  }}
                  className="w-full text-left px-3 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="sm:hidden p-1.5 rounded hover:bg-black/[.04] dark:hover:bg-white/[.06] transition-colors"
            aria-label="Menu"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              {mobileOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="sm:hidden border-t border-black/5 dark:border-white/5 bg-white dark:bg-black">
          <div className="px-4 py-3 space-y-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={closeMenus}
                className={`block px-3 py-2 rounded text-sm font-medium transition-colors ${
                  isActive(link.href, pathname)
                    ? "bg-foreground text-background"
                    : "text-zinc-600 dark:text-zinc-400 hover:bg-black/[.04] dark:hover:bg-white/[.06]"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
