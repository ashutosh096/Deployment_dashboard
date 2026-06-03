import { Link, useLocation } from "wouter";
import { LayoutDashboard, History, Settings, Rocket, Sun, Moon, ShieldCheck, X } from "lucide-react";
import { useState, useEffect } from "react";
import { storage } from "@/lib/storage";
import type { DeveloperProfile } from "@/types";
import ProfileModal from "./ProfileModal";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getStoredTheme, applyTheme, type Theme } from "@/lib/theme";

interface SidebarProps {
  onClose?: () => void;
}

export default function Sidebar({ onClose }: SidebarProps) {
  const [location] = useLocation();
  const [profile, setProfile] = useState<DeveloperProfile | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<Theme>("light");

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

  const navLink = (href: string, icon: React.ReactNode, label: string, testId: string) => (
    <Link
      href={href}
      onClick={onClose}
      className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
        location === href
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "hover:bg-sidebar-accent/50 text-sidebar-foreground/80"
      }`}
      data-testid={testId}
    >
      {icon}
      <span className="font-medium text-sm">{label}</span>
    </Link>
  );

  return (
    <div className="w-64 bg-sidebar text-sidebar-foreground h-screen flex flex-col border-r border-sidebar-border" data-testid="sidebar">
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-primary-foreground flex-shrink-0">
            <Rocket className="w-4 h-4" />
          </div>
          <span className="font-bold text-base tracking-tight">DeployDash</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={toggleTheme}
            className="w-7 h-7 rounded flex items-center justify-center text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
            data-testid="button-toggle-theme"
            title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
          >
            {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="md:hidden w-7 h-7 rounded flex items-center justify-center text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
              aria-label="Close sidebar"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 px-3 space-y-1 mt-1 overflow-y-auto">
        {navLink("/", <LayoutDashboard className="w-4 h-4 flex-shrink-0" />, "Dashboard", "link-dashboard")}
        {navLink("/history", <History className="w-4 h-4 flex-shrink-0" />, "History", "link-history")}

        <div className="pt-2 pb-1 px-3">
          <span className="text-[10px] uppercase tracking-widest font-semibold text-sidebar-foreground/40">Management</span>
        </div>
        {navLink("/admin", <ShieldCheck className="w-4 h-4 flex-shrink-0" />, "Admin Panel", "link-admin")}
      </div>

      <div className="p-3 border-t border-sidebar-border mt-auto">
        {profile ? (
          <button
            onClick={() => setProfileOpen(true)}
            className="flex items-center gap-3 w-full hover:bg-sidebar-accent/50 p-2 rounded-md transition-colors text-left"
            data-testid="button-open-profile"
          >
            <Avatar className="w-8 h-8 border border-sidebar-border flex-shrink-0">
              <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs">
                {profile.avatarInitials}
              </AvatarFallback>
            </Avatar>
            <div className="overflow-hidden min-w-0">
              <div className="text-sm font-medium truncate text-sidebar-foreground">{profile.name}</div>
              <div className="text-xs truncate text-sidebar-foreground/60">{profile.role}</div>
            </div>
          </button>
        ) : (
          <button
            onClick={() => setProfileOpen(true)}
            className="flex items-center gap-3 w-full hover:bg-sidebar-accent/50 p-2 rounded-md transition-colors text-left text-sidebar-foreground/80"
            data-testid="button-setup-profile"
          >
            <Settings className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-medium">Setup Profile</span>
          </button>
        )}
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
