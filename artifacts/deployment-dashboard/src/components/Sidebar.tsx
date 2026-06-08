import { Link, useLocation } from "wouter";
import { LayoutDashboard, History, ShieldCheck, Sun, Moon, X, LogOut, Server } from "lucide-react";
import { useState, useEffect } from "react";
import { storage } from "@/lib/storage";
import type { DeveloperProfile } from "@/types";
import ProfileModal from "./ProfileModal";
import { getStoredTheme, applyTheme, type Theme } from "@/lib/theme";
import { useSession } from "@/contexts/SessionContext";

interface SidebarProps {
  onClose?: () => void;
}

export default function Sidebar({ onClose }: SidebarProps) {
  const [location] = useLocation();
  const [profile, setProfile] = useState<DeveloperProfile | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<Theme>("light");
  const { logout } = useSession();

  useEffect(() => {
    storage.getProfile().then(p => {
      setProfile(p);
      setLoading(false);
    });
    const stored = getStoredTheme();
    setTheme(stored);
    applyTheme(stored);
  }, []);

  function toggleTheme() {
    const next: Theme = theme === "light" ? "dark" : "light";
    setTheme(next);
    applyTheme(next);
  }

  if (loading) return <div className="w-64 bg-sidebar h-screen border-r border-sidebar-border" />;

  const forceProfile = profile === null;

  const initials = profile
    ? profile.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  const navItem = (href: string, icon: React.ReactNode, label: string, testId: string) => {
    const active = location === href;
    return (
      <Link
        href={href}
        onClick={onClose}
        data-testid={testId}
        className={`flex items-center gap-3 px-2 py-2 rounded-md transition-colors text-sm font-medium ${
          active
            ? "bg-[#1e2a42] text-white"
            : "text-slate-400 hover:bg-[#1e2a42] hover:text-white"
        }`}
      >
        <span className={active ? "text-[#3b82f6]" : "text-slate-500 group-hover:text-slate-300"}>
          {icon}
        </span>
        {label}
      </Link>
    );
  };

  return (
    <div
      className="w-64 h-screen flex flex-col border-r"
      style={{ background: "#0f172a", borderColor: "#1e2a42", color: "#cbd5e1" }}
      data-testid="sidebar"
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-5 border-b" style={{ borderColor: "#1e2a42" }}>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-[#3b82f6] flex items-center justify-center flex-shrink-0">
            <Server className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-semibold text-white tracking-tight text-[15px]">DeployDash</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={toggleTheme}
            className="w-7 h-7 rounded flex items-center justify-center text-slate-500 hover:text-slate-300 hover:bg-[#1e2a42] transition-colors"
            data-testid="button-toggle-theme"
            title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
          >
            {theme === "light" ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="md:hidden w-7 h-7 rounded flex items-center justify-center text-slate-500 hover:text-slate-300 hover:bg-[#1e2a42] transition-colors"
              aria-label="Close sidebar"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-600 mb-2 px-2">Navigation</div>
          <nav className="space-y-0.5">
            {navItem("/", <LayoutDashboard className="w-4 h-4" />, "Dashboard", "link-dashboard")}
            {navItem("/history", <History className="w-4 h-4" />, "History", "link-history")}
          </nav>
        </div>

        <div>
          <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-600 mb-2 px-2">Management</div>
          <nav className="space-y-0.5">
            {navItem("/admin", <ShieldCheck className="w-4 h-4" />, "Admin Panel", "link-admin")}
          </nav>
        </div>

        <div>
          <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-600 mb-2 px-2">Products</div>
          <nav className="space-y-0.5">
            <div className="flex items-center gap-3 px-2 py-2 rounded-md text-sm text-slate-400">
              <div className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
              Climagro
            </div>
            <div className="flex items-center gap-3 px-2 py-2 rounded-md text-sm text-slate-400">
              <div className="w-2 h-2 rounded-full bg-[#3b82f6] flex-shrink-0" />
              EHM
            </div>
          </nav>
        </div>
      </div>

      {/* Profile + Sign out */}
      <div className="p-4 border-t space-y-1" style={{ borderColor: "#1e2a42" }}>
        <button
          onClick={() => setProfileOpen(true)}
          className="flex items-center gap-3 w-full px-2 py-2 rounded-md hover:bg-[#1e2a42] transition-colors text-left"
          data-testid={profile ? "button-open-profile" : "button-setup-profile"}
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #3b82f6, #1e2a42)", border: "1px solid #1e2a42" }}
          >
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-white truncate">{profile?.name ?? "Set up profile"}</div>
            <div className="text-xs text-slate-500 truncate capitalize">{profile?.role ?? "Not configured"}</div>
          </div>
        </button>
        <button
          onClick={logout}
          className="flex items-center gap-2.5 w-full px-2 py-1.5 rounded-md hover:bg-[#1e2a42] transition-colors text-left text-slate-500 hover:text-slate-300"
          data-testid="button-logout"
        >
          <LogOut className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="text-xs font-medium">Sign out</span>
        </button>
      </div>

      <ProfileModal
        open={profileOpen || forceProfile}
        onOpenChange={setProfileOpen}
        onProfileSaved={p => { setProfile(p); setProfileOpen(false); }}
        forceOpen={forceProfile}
      />
    </div>
  );
}
