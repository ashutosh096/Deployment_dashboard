import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { storage } from "@/lib/storage";
import type { DeveloperProfile, UserRole } from "@/types";
import { ShieldCheck, Code2, Eye } from "lucide-react";

interface ProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProfileSaved: (profile: DeveloperProfile) => void;
  forceOpen?: boolean;
}

const ROLES: { value: UserRole; label: string; description: string; icon: React.ReactNode }[] = [
  {
    value: "admin",
    label: "Admin",
    description: "Manage templates, users & audit logs",
    icon: <ShieldCheck className="w-4 h-4 text-amber-600" />,
  },
  {
    value: "developer",
    label: "Developer",
    description: "Run deployments & fill checklists",
    icon: <Code2 className="w-4 h-4 text-blue-600" />,
  },
  {
    value: "viewer",
    label: "Viewer",
    description: "Read-only access to all deployments",
    icon: <Eye className="w-4 h-4 text-muted-foreground" />,
  },
];

export default function ProfileModal({ open, onOpenChange, onProfileSaved, forceOpen }: ProfileModalProps) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  const [userRole, setUserRole] = useState<UserRole>("developer");

  useEffect(() => {
    if (open) {
      storage.getProfile().then(p => {
        if (p) {
          setName(p.name);
          setRole(p.role);
          setEmail(p.email);
          setUserRole(p.userRole ?? "developer");
        }
      });
    }
  }, [open]);

  const handleSave = async () => {
    if (!name || !role || !email) return;
    const initials = name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
    const existing = await storage.getProfile();

    // Check if admin has assigned a role override
    const id = existing?.id ?? crypto.randomUUID();
    const adminRoles = await storage.getUserRoles();
    const effectiveRole: UserRole = adminRoles[id] ?? userRole;

    const profile: DeveloperProfile = {
      id,
      name,
      role,
      email,
      avatarInitials: initials,
      userRole: effectiveRole,
    };
    await storage.saveProfile(profile);
    onProfileSaved(profile);
    if (!forceOpen) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={forceOpen ? undefined : onOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        data-testid="modal-profile"
        onInteractOutside={e => forceOpen && e.preventDefault()}
        onEscapeKeyDown={e => forceOpen && e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Developer Profile</DialogTitle>
          <DialogDescription>
            Enter your details to track your deployments. This information is saved locally.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Full Name</Label>
            <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="Jane Doe" data-testid="input-profile-name" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="role">Job Title</Label>
            <Input id="role" value={role} onChange={e => setRole(e.target.value)} placeholder="Senior Engineer" data-testid="input-profile-role" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="jane@example.com" data-testid="input-profile-email" />
          </div>
          <div className="grid gap-2">
            <Label>Access Level</Label>
            <div className="grid grid-cols-3 gap-2">
              {ROLES.map(r => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setUserRole(r.value)}
                  className={`flex flex-col items-start gap-1.5 p-3 rounded-lg border text-left transition-colors ${
                    userRole === r.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  {r.icon}
                  <span className="text-xs font-semibold">{r.label}</span>
                  <span className="text-[10px] text-muted-foreground leading-tight">{r.description}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={!name || !role || !email} data-testid="button-save-profile">
            Save Profile
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
