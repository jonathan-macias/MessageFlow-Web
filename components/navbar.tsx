"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/context/auth-context";
import { cn } from "@/lib/cn";
import { IconChevronDown, IconLogOut, IconMenu, IconX } from "@/components/ui/icons";
import { Logo } from "@/components/ui/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";

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
  const userButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setUserOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setUserOpen(false);
        setMobileOpen(false);
        userButtonRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, []);

  function closeMenus() {
    setMobileOpen(false);
    setUserOpen(false);
  }

  if (!isAuthenticated) return null;

  const initial = (user?.email?.[0] ?? "?").toUpperCase();

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-canvas/80 backdrop-blur supports-[backdrop-filter]:bg-canvas/70">
      <nav aria-label="Main" className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/" onClick={closeMenus} className="rounded-lg" aria-label="MessageFlow home">
          <Logo />
        </Link>

        {/* Desktop links */}
        <div className="hidden items-center gap-1 sm:flex">
          {NAV_LINKS.map((link) => {
            const active = isActive(link.href, pathname);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  active ? "bg-raised text-fg" : "text-muted hover:bg-raised hover:text-fg",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-1">
          <div ref={userRef} className="relative">
            <button
              ref={userButtonRef}
              type="button"
              onClick={() => setUserOpen(!userOpen)}
              aria-haspopup="menu"
              aria-expanded={userOpen}
              aria-label="Account menu"
              className="flex items-center gap-2 rounded-lg px-1.5 py-1 text-sm text-muted transition-colors hover:bg-raised hover:text-fg"
            >
              <span
                className="flex size-6 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent"
                aria-hidden="true"
              >
                {initial}
              </span>
              <span className="hidden max-w-[140px] truncate sm:inline">{user?.email}</span>
              <IconChevronDown className={cn("size-3.5 transition-transform", userOpen && "rotate-180")} />
            </button>

            {userOpen && (
              <div
                role="menu"
                aria-label="Account"
                className="absolute right-0 top-full mt-1.5 w-52 rounded-xl border border-line bg-surface py-1 text-sm shadow-pop"
              >
                <div className="border-b border-line px-3 py-2">
                  <p className="text-xs text-subtle">Session</p>
                  <p className="truncate font-medium text-fg">{user?.email}</p>
                </div>
                <div role="none" className="px-1 py-1">
                  <ThemeToggle withLabel className="rounded-lg" />
                </div>
                <div role="none" className="border-t border-line px-1 pt-1">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      logout();
                      closeMenus();
                      router.replace("/login");
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-bad-fg transition-colors hover:bg-bad-bg"
                  >
                    <IconLogOut className="size-4" />
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Menu"
            aria-expanded={mobileOpen}
            aria-controls="mobile-menu"
            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-raised hover:text-fg sm:hidden"
          >
            {mobileOpen ? <IconX className="size-5" /> : <IconMenu className="size-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div id="mobile-menu" className="border-t border-line bg-canvas sm:hidden">
          <div className="space-y-1 px-4 py-3">
            {NAV_LINKS.map((link) => {
              const active = isActive(link.href, pathname);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={closeMenus}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "block rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active ? "bg-raised text-fg" : "text-muted hover:bg-raised hover:text-fg",
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
}
