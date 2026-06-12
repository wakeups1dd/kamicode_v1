"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

/* ── Icon components (inline SVGs to avoid extra deps) ──────── */

function IconHome({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
      <path d="M9 21V12h6v9" />
    </svg>
  );
}

function IconCode({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  );
}

function IconTrophy({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 010-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 000-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 19.24 7 20v2h10v-2c0-.76-.85-1.25-2.03-1.79A1.13 1.13 0 0114 17v-2.34" />
      <path d="M18 2H6v7a6 6 0 0012 0V2z" />
    </svg>
  );
}

function IconUser({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21v-2a4 4 0 00-4-4H9a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function IconSearch({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function IconChevron({ className, direction = "right" }: { className?: string; direction?: "left" | "right" }) {
  return (
    <svg
      className={`${className} transition-transform duration-200 ${direction === "left" ? "rotate-180" : ""}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function IconSettings({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  );
}

/* ── Nav Data ──────────────────────────────────────────────── */

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
}

const navItems: NavItem[] = [
  { label: "Home", href: "/", icon: IconHome },
  { label: "Problems", href: "/problems", icon: IconCode },
  { label: "Leaderboard", href: "/leaderboard", icon: IconTrophy, disabled: true },
  { label: "Profile", href: "/profile", icon: IconUser, disabled: true },
];

/* ── Sidebar Component ─────────────────────────────────────── */

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  // Don't show sidebar on problem arena pages (full-screen editor)
  const isArenaPage = /^\/problems\/[^/]+$/.test(pathname);
  if (isArenaPage) return null;

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <aside
      className={`sidebar-transition flex-shrink-0 flex flex-col bg-secondary-background border-r-4 border-black h-full select-none ${collapsed ? "w-[76px]" : "w-[240px]"
        }`}
    >
      {/* Logo Container */}
      <div className="flex items-center gap-3 px-4 h-[68px] flex-shrink-0 border-b-4 border-black">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-[6px] bg-main border-2 border-black flex items-center justify-center text-lg font-black text-main-foreground flex-shrink-0 shadow-[2px_2px_0px_0px_#000] logo-shake transition-transform">
            K
          </div>
          {!collapsed && (
            <span className="text-xl font-black tracking-tight text-foreground whitespace-nowrap">
              Kami<span className="text-main">Code</span>
            </span>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-5 space-y-2.5">
        {navItems.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;

          if (item.disabled) {
            return (
              <div
                key={item.label}
                className={`flex items-center gap-3 px-3 py-3 rounded-[6px] text-foreground/45 border-2 border-dashed border-transparent cursor-not-allowed select-none ${collapsed ? "justify-center" : ""
                  }`}
                title={collapsed ? `${item.label} (Coming Soon)` : undefined}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && (
                  <span className="text-sm font-bold whitespace-nowrap flex items-center justify-between w-full">
                    {item.label}
                    <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-[4px] border-2 border-black bg-muted text-foreground">soon</span>
                  </span>
                )}
              </div>
            );
          }

          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-3 rounded-[6px] transition-all duration-100 group relative border-2 ${collapsed ? "justify-center animate-fade" : "animate-fade"
                } ${active
                  ? "bg-main text-main-foreground border-black shadow-[2px_2px_0px_0px_#000] font-black"
                  : "text-foreground/75 border-transparent hover:border-black hover:bg-background/80 hover:text-foreground hover:shadow-[2px_2px_0px_0px_#000] hover:-translate-x-[2px] hover:-translate-y-[2px] font-bold"
                }`}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && (
                <span className="text-sm whitespace-nowrap">{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div className="px-3 py-4 space-y-2 border-t-4 border-black bg-background/25">
        {/* Search */}
        <button
          className={`flex items-center gap-3 px-3 py-2.5 rounded-[6px] text-foreground/75 border-2 border-transparent hover:border-black hover:bg-background/80 hover:text-foreground hover:shadow-[2px_2px_0px_0px_#000] hover:-translate-x-[2px] hover:-translate-y-[2px] transition-all w-full font-bold ${collapsed ? "justify-center" : ""
            }`}
          title={collapsed ? "Search" : undefined}
        >
          <IconSearch className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span className="text-sm">Search</span>}
        </button>

        {/* Settings */}
        <button
          className={`flex items-center gap-3 px-3 py-2.5 rounded-[6px] text-foreground/75 border-2 border-transparent hover:border-black hover:bg-background/80 hover:text-foreground hover:shadow-[2px_2px_0px_0px_#000] hover:-translate-x-[2px] hover:-translate-y-[2px] transition-all w-full font-bold ${collapsed ? "justify-center" : ""
            }`}
          title={collapsed ? "Settings" : undefined}
        >
          <IconSettings className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span className="text-sm">Settings</span>}
        </button>

        {/* Collapse Toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-[6px] text-foreground/50 hover:text-foreground hover:bg-background/80 border-2 border-transparent hover:border-black hover:shadow-[2px_2px_0px_0px_#000] hover:-translate-x-[2px] hover:-translate-y-[2px] transition-all w-full font-bold ${collapsed ? "justify-center" : ""
            }`}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <IconChevron
            className="w-4 h-4 flex-shrink-0"
            direction={collapsed ? "right" : "left"}
          />
          {!collapsed && <span className="text-sm">Collapse</span>}
        </button>
      </div>

      {/* User Box at bottom */}
      <div className="px-3 py-4 border-t-4 border-black bg-background/50">
        <div
          className={`flex items-center gap-3 p-2 rounded-[6px] border-2 border-black bg-secondary-background shadow-[2px_2px_0px_0px_#000] hover:shadow-[3px_3px_0px_0px_#000] hover:-translate-x-[1px] hover:-translate-y-[1px] transition-all cursor-pointer ${collapsed ? "justify-center p-1.5" : "p-2.5"
            }`}
        >
          <div className="w-8 h-8 rounded-[4px] bg-main border-2 border-black flex items-center justify-center text-sm font-black text-main-foreground flex-shrink-0">
            C
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-sm font-black text-foreground truncate">Coder</div>
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mt-0.5">Unrated</div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
