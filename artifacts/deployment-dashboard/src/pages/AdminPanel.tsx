import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { storage, appendAuditLog } from "@/lib/storage";
import type { Deployment, ProductId, DeveloperAssignment, ChecklistSection, ChecklistItem, AuditLogEntry, UserRole, RegisteredUser } from "@/types";
import PageLayout from "@/components/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2, CircleDashed, XCircle, Activity, Users,
  RefreshCw, Search, Clock,
  ShieldCheck, LogOut, Lock, User, Pencil, Trash2, Plus,
  RotateCcw, Layers, ChevronDown, ChevronRight, AlertTriangle,
  UserCheck, FileText, Eye, Code2, AlertCircle, MessageSquare,
} from "lucide-react";
import { getPreSections, getPostSections, totalItems, checkedCount, CHECKLISTS } from "@/data/checklists";
import { formatDistanceToNow, format } from "date-fns";

/* ─── Types ─────────────────────────────────────── */
interface DeveloperSummary {
  id: string;
  name: string;
  initials: string;
  deployments: Deployment[];
  inProgress: Deployment[];
  completed: number;
  failed: number;
  lastActivity: string | null;
}

/* ─── Helpers ────────────────────────────────────── */
function getInitials(name: string) {
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

function overallProgress(dep: Deployment): number {
  const preSecs = getPreSections(dep.product);
  const postSecs = getPostSections(dep.product);
  const total = totalItems(preSecs) + totalItems(postSecs);
  if (!total) return 0;
  const done = checkedCount(preSecs, dep.prePhase.checkedItems) + checkedCount(postSecs, dep.postPhase.checkedItems);
  return Math.round((done / total) * 100);
}

const PRODUCT_BADGE: Record<ProductId, string> = {
  climagro: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
  ehm: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
};

const ROLE_UI: Record<UserRole, { label: string; icon: React.ReactNode; cls: string }> = {
  admin:     { label: "Admin",     icon: <ShieldCheck className="w-3.5 h-3.5" />, cls: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300" },
  developer: { label: "Developer", icon: <Code2 className="w-3.5 h-3.5" />,      cls: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300" },
  viewer:    { label: "Viewer",    icon: <Eye className="w-3.5 h-3.5" />,         cls: "bg-secondary text-muted-foreground" },
};

const AUDIT_ACTION_LABEL: Record<string, { label: string; cls: string }> = {
  deployment_started:      { label: "Deployment Started",    cls: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300" },
  deployment_completed:    { label: "Completed & Locked",    cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" },
  deployment_failed:       { label: "Marked Failed",         cls: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300" },
  deployment_locked:       { label: "Record Locked",         cls: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
  item_checked:            { label: "Item Checked",          cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400" },
  item_unchecked:          { label: "Item Unchecked",        cls: "bg-secondary text-muted-foreground" },
  note_added:              { label: "Note Added",            cls: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300" },
  checklist_template_edited: { label: "Checklist Edited",   cls: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300" },
  checklist_template_reset:  { label: "Checklist Reset",    cls: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300" },
  developer_assigned:      { label: "Dev Assigned",         cls: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300" },
  user_role_changed:       { label: "Role Changed",         cls: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300" },
  admin_login:             { label: "Admin Login",           cls: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
  admin_logout:            { label: "Admin Logout",          cls: "bg-secondary text-muted-foreground" },
  user_invited:            { label: "User Invited",          cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" },
  user_created:            { label: "User Created",          cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" },
  user_deleted:            { label: "User Deleted",          cls: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300" },
};

function buildSummaries(deployments: Deployment[]): DeveloperSummary[] {
  const map = new Map<string, DeveloperSummary>();
  deployments.forEach(dep => {
    if (!map.has(dep.developerId)) {
      map.set(dep.developerId, {
        id: dep.developerId, name: dep.developerName, initials: getInitials(dep.developerName),
        deployments: [], inProgress: [], completed: 0, failed: 0, lastActivity: null,
      });
    }
    const s = map.get(dep.developerId)!;
    s.deployments.push(dep);
    if (dep.status === "in-progress") s.inProgress.push(dep);
    if (dep.status === "completed") s.completed++;
    if (dep.status === "failed") s.failed++;
    const ts = dep.updatedAt || dep.startedAt;
    if (!s.lastActivity || ts > s.lastActivity) s.lastActivity = ts;
  });
  return Array.from(map.values()).sort((a, b) => {
    if (a.inProgress.length && !b.inProgress.length) return -1;
    if (!a.inProgress.length && b.inProgress.length) return 1;
    return (b.lastActivity ?? "").localeCompare(a.lastActivity ?? "");
  });
}

/* ─── Login Screen ───────────────────────────────── */
function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const ok = await storage.verifyAdminLogin(username.trim(), password);
    if (ok) {
      await storage.setAdminSession(true);
      appendAuditLog(null, "admin_login", `Admin "${username}" logged in`);
      onLogin();
    } else {
      setError("Invalid username or password.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
            <ShieldCheck className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-xl">Admin Access</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">Enter your credentials to continue</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="admin-user">User ID</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input id="admin-user" className="pl-9" placeholder="admin" value={username} onChange={e => setUsername(e.target.value)} autoComplete="username" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="admin-pass">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input id="admin-pass" type="password" className="pl-9" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" />
              </div>
            </div>
            {error && (
              <p className="text-sm text-destructive flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />{error}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={!username || !password || loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
          <p className="text-xs text-muted-foreground text-center mt-4">
            Default: <span className="font-mono bg-muted px-1 rounded">admin</span> / <span className="font-mono bg-muted px-1 rounded">admin123</span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

/* ─── Overview Tab ───────────────────────────────── */
function OverviewTab({ deployments, onViewDeployment }: { deployments: Deployment[]; onViewDeployment: (id: string) => void }) {
  const [search, setSearch] = useState("");
  const summaries = buildSummaries(deployments);
  const filtered = summaries.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));
  const total = deployments.length;
  const inProgress = deployments.filter(d => d.status === "in-progress").length;
  const completed = deployments.filter(d => d.status === "completed").length;
  const failed = deployments.filter(d => d.status === "failed").length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total", value: total, icon: <Activity className="w-4 h-4 text-muted-foreground" />, color: "" },
          { label: "In Progress", value: inProgress, icon: <CircleDashed className="w-4 h-4 text-blue-500" />, color: "text-blue-600 dark:text-blue-400" },
          { label: "Completed", value: completed, icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />, color: "text-emerald-600 dark:text-emerald-400" },
          { label: "Failed", value: failed, icon: <XCircle className="w-4 h-4 text-red-500" />, color: "text-red-600 dark:text-red-400" },
        ].map(stat => (
          <Card key={stat.label}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground font-medium">{stat.label}</span>
                {stat.icon}
              </div>
              <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input className="pl-9" placeholder="Search developers..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <span className="text-sm text-muted-foreground">{filtered.length} developer{filtered.length !== 1 ? "s" : ""}</span>
        </div>
        {filtered.length === 0 && (
          <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">
            {summaries.length === 0 ? "No deployments started yet." : "No developers match your search."}
          </CardContent></Card>
        )}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {filtered.map(dev => (
            <Card key={dev.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar className="w-10 h-10 border border-border flex-shrink-0">
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">{dev.initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-sm truncate">{dev.name}</span>
                      {dev.inProgress.length > 0 && (
                        <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 px-2 py-0.5 rounded-full font-medium flex-shrink-0">
                          {dev.inProgress.length} active
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
                      <span>{dev.deployments.length} deployments</span>
                      <span className="text-emerald-600 dark:text-emerald-400">{dev.completed} done</span>
                      {dev.failed > 0 && <span className="text-red-500">{dev.failed} failed</span>}
                    </div>
                    {dev.lastActivity && (
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3 flex-shrink-0" />
                        {formatDistanceToNow(new Date(dev.lastActivity), { addSuffix: true })}
                      </p>
                    )}
                    {dev.inProgress.slice(0, 2).map(dep => {
                      const pct = overallProgress(dep);
                      return (
                        <button key={dep.id} onClick={() => onViewDeployment(dep.id)} className="mt-2 w-full text-left group">
                          <div className="flex items-center justify-between text-xs mb-0.5">
                            <span className="truncate text-foreground/80 group-hover:text-foreground transition-colors">{dep.name}</span>
                            <span className="text-muted-foreground ml-2 flex-shrink-0">{pct}%</span>
                          </div>
                          <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Item Edit Dialog ───────────────────────────── */
function ItemEditDialog({ sectionId, item, onSave, onClose }: {
  sectionId: string; item: ChecklistItem;
  onSave: (sectionId: string, item: ChecklistItem) => void; onClose: () => void;
}) {
  const [title, setTitle] = useState(item.title);
  const [description, setDescription] = useState(item.description);
  const [critical, setCritical] = useState(!!item.critical);
  const [devRequired, setDevRequired] = useState(!!item.devRequired);
  const [clientVerify, setClientVerify] = useState(!!item.clientVerify);
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{item.title ? "Edit Item" : "Add Item"}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Title *</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Checklist item title" />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Detailed description..." rows={3} />
          </div>
          <div className="space-y-2">
            <Label>Flags</Label>
            <div className="space-y-2.5">
              {([
                { label: "Critical", value: critical, set: setCritical, color: "text-red-600 dark:text-red-400" },
                { label: "Dev Required", value: devRequired, set: setDevRequired, color: "text-blue-600 dark:text-blue-400" },
                { label: "Client Verify", value: clientVerify, set: setClientVerify, color: "text-amber-600 dark:text-amber-400" },
              ] as const).map(flag => (
                <div key={flag.label} className="flex items-center gap-2.5">
                  <Switch checked={flag.value} onCheckedChange={flag.set} id={`flag-${flag.label}`} />
                  <Label htmlFor={`flag-${flag.label}`} className={`text-sm cursor-pointer ${flag.color}`}>{flag.label}</Label>
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(sectionId, { ...item, title: title.trim(), description: description.trim(), critical: critical || undefined, devRequired: devRequired || undefined, clientVerify: clientVerify || undefined })} disabled={!title.trim()}>Save Item</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Section Edit Dialog ────────────────────────── */
function SectionEditDialog({ section, isNew, onSave, onClose }: {
  section: ChecklistSection; isNew: boolean;
  onSave: (section: ChecklistSection) => void; onClose: () => void;
}) {
  const [title, setTitle] = useState(section.title);
  const [color, setColor] = useState(section.color);
  const [phase, setPhase] = useState<"pre" | "post">(section.phase);
  const COLORS = ["#6366f1", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#94a3b8", "#ec4899", "#14b8a6", "#f97316"];
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>{isNew ? "Add Section" : "Edit Section"}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Section Title *</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. 3. Database preparation" />
          </div>
          <div className="space-y-1.5">
            <Label>Phase</Label>
            <div className="flex gap-2">
              {(["pre", "post"] as const).map(p => (
                <button key={p} onClick={() => setPhase(p)} className={`flex-1 py-1.5 rounded-md text-sm font-medium border transition-colors ${phase === p ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}>
                  {p === "pre" ? "Pre-deploy" : "Post-deploy"}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Color</Label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map(c => (
                <button key={c} onClick={() => setColor(c)} className={`w-7 h-7 rounded-full border-2 transition-all ${color === c ? "border-foreground scale-110" : "border-transparent hover:border-muted-foreground"}`} style={{ background: c }} />
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave({ ...section, title: title.trim(), color, phase })} disabled={!title.trim()}>
            {isNew ? "Add Section" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Checklist Editor ───────────────────────────── */
function ChecklistEditor({ product }: { product: ProductId }) {
  const [sections, setSections] = useState<ChecklistSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [editItemDialog, setEditItemDialog] = useState<{ sectionId: string; item: ChecklistItem } | null>(null);
  const [editSectionDialog, setEditSectionDialog] = useState<ChecklistSection | null>(null);
  const [addSectionDialog, setAddSectionDialog] = useState(false);

  const loadSections = useCallback(async () => {
    setLoading(true);
    const overrides = await storage.getChecklistOverrides(product);
    setSections(overrides ?? CHECKLISTS[product]);
    setLoading(false);
  }, [product]);

  useEffect(() => { loadSections(); }, [loadSections]);

  const save = async (newSections: ChecklistSection[]) => {
    setSaving(true);
    await storage.saveChecklistOverrides(product, newSections);
    setSections(newSections);
    appendAuditLog(null, "checklist_template_edited", `Edited ${product.toUpperCase()} checklist template`);
    setSaving(false);
  };

  const handleReset = async () => {
    if (!confirm(`Reset ${product.toUpperCase()} checklist to defaults?`)) return;
    await storage.resetChecklistOverrides(product);
    setSections(CHECKLISTS[product]);
    appendAuditLog(null, "checklist_template_reset", `Reset ${product.toUpperCase()} checklist to defaults`);
  };

  const handleDeleteItem = (sectionId: string, itemId: string) => {
    if (!confirm("Delete this checklist item?")) return;
    save(sections.map(s => s.id === sectionId ? { ...s, items: s.items.filter(i => i.id !== itemId) } : s));
  };
  const handleDeleteSection = (sectionId: string) => {
    if (!confirm("Delete this entire section and all its items?")) return;
    save(sections.filter(s => s.id !== sectionId));
  };
  const handleSaveItem = (sectionId: string, item: ChecklistItem) => {
    const updated = sections.map(s => {
      if (s.id !== sectionId) return s;
      const idx = s.items.findIndex(i => i.id === item.id);
      if (idx >= 0) { const items = [...s.items]; items[idx] = item; return { ...s, items }; }
      return { ...s, items: [...s.items, item] };
    });
    save(updated);
    setEditItemDialog(null);
  };
  const handleSaveSection = (section: ChecklistSection) => {
    const idx = sections.findIndex(s => s.id === section.id);
    if (idx >= 0) { const updated = [...sections]; updated[idx] = { ...updated[idx], ...section }; save(updated); }
    else save([...sections, { ...section, items: [] }]);
    setEditSectionDialog(null);
    setAddSectionDialog(false);
  };

  if (loading) return <div className="py-8 text-center text-muted-foreground text-sm">Loading...</div>;
  const totalItemCount = sections.reduce((a, s) => a + s.items.length, 0);
  const preSections = sections.filter(s => s.phase === "pre");
  const postSections = sections.filter(s => s.phase === "post");

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-muted-foreground">
          {sections.length} sections · {totalItemCount} items{saving && <span className="ml-2 text-primary">Saving...</span>}
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleReset} className="gap-1.5">
            <RotateCcw className="w-3.5 h-3.5" />Reset defaults
          </Button>
          <Button size="sm" onClick={() => setAddSectionDialog(true)} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" />Add section
          </Button>
        </div>
      </div>
      {[{ label: "Pre-deployment", items: preSections }, { label: "Post-deployment", items: postSections }].map(group => (
        <div key={group.label} className="space-y-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{group.label}</h3>
          {group.items.length === 0 && <p className="text-xs text-muted-foreground pl-1">No sections yet</p>}
          {group.items.map(section => (
            <Card key={section.id} className="overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/40 transition-colors select-none" onClick={() => setExpandedSection(expandedSection === section.id ? null : section.id)}>
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: section.color }} />
                <span className="font-medium text-sm flex-1 truncate">{section.title}</span>
                <span className="text-xs text-muted-foreground mr-1">{section.items.length} items</span>
                <div className="flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
                  <button onClick={() => setEditSectionDialog(section)} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleDeleteSection(section.id)} className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
                {expandedSection === section.id ? <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
              </div>
              {expandedSection === section.id && (
                <div className="border-t border-border">
                  {section.items.map(item => (
                    <div key={item.id} className="flex items-start gap-3 px-4 py-2.5 border-b border-border/50 last:border-0 hover:bg-muted/20 group">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-sm font-medium">{item.title}</span>
                          {item.critical && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 font-medium">Critical</span>}
                          {item.devRequired && <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-medium">Dev</span>}
                          {item.clientVerify && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 font-medium">Client</span>}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.description}</p>
                      </div>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5">
                        <button onClick={() => setEditItemDialog({ sectionId: section.id, item })} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleDeleteItem(section.id, item.id)} className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  ))}
                  <div className="px-4 py-2.5">
                    <button onClick={() => setEditItemDialog({ sectionId: section.id, item: { id: crypto.randomUUID(), title: "", description: "" } })} className="text-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-1.5 font-medium">
                      <Plus className="w-3.5 h-3.5" />Add item
                    </button>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      ))}
      {editItemDialog && <ItemEditDialog sectionId={editItemDialog.sectionId} item={editItemDialog.item} onSave={handleSaveItem} onClose={() => setEditItemDialog(null)} />}
      {(editSectionDialog !== null || addSectionDialog) && (
        <SectionEditDialog section={editSectionDialog ?? { id: crypto.randomUUID(), title: "", color: "#6366f1", phase: "pre", items: [] }} isNew={addSectionDialog && editSectionDialog === null} onSave={handleSaveSection} onClose={() => { setEditSectionDialog(null); setAddSectionDialog(false); }} />
      )}
    </div>
  );
}

/* ─── Developers Tab ─────────────────────────────── */
function DevelopersTab({ deployments }: { deployments: Deployment[] }) {
  const summaries = buildSummaries(deployments);
  if (summaries.length === 0) return (
    <div className="text-center py-16 text-muted-foreground">
      <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
      <p className="text-sm">No developers yet. Start a deployment to see them here.</p>
    </div>
  );
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {summaries.map(dev => {
        const successRate = dev.deployments.length ? Math.round((dev.completed / dev.deployments.length) * 100) : 0;
        const byProduct: Record<ProductId, number> = { climagro: 0, ehm: 0 };
        dev.deployments.forEach(d => byProduct[d.product]++);
        const notes = dev.deployments.reduce((a, d) => a + Object.values(d.itemNotes ?? {}).reduce((b, n) => b + n.length, 0), 0);
        return (
          <Card key={dev.id}>
            <CardContent className="pt-5 pb-5">
              <div className="flex items-start gap-3 mb-4">
                <Avatar className="w-11 h-11 border border-border flex-shrink-0">
                  <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">{dev.initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">{dev.name}</div>
                  {dev.inProgress.length > 0
                    ? <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 px-2 py-0.5 rounded-full font-medium">{dev.inProgress.length} active</span>
                    : <span className="text-xs text-muted-foreground">No active deployments</span>
                  }
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="bg-muted/50 rounded-md p-2 text-center">
                  <div className="text-lg font-bold">{dev.deployments.length}</div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Total</div>
                </div>
                <div className="bg-muted/50 rounded-md p-2 text-center">
                  <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{successRate}%</div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Success</div>
                </div>
              </div>
              <div className="space-y-1.5">
                {(Object.entries(byProduct) as [ProductId, number][]).map(([product, count]) => (
                  <div key={product} className="flex items-center justify-between text-xs">
                    <span className={`px-2 py-0.5 rounded font-medium ${PRODUCT_BADGE[product]}`}>{product.toUpperCase()}</span>
                    <span className="text-muted-foreground">{count} deployment{count !== 1 ? "s" : ""}</span>
                  </div>
                ))}
              </div>
              {notes > 0 && (
                <div className="flex items-center gap-1.5 mt-3 text-xs text-amber-700 dark:text-amber-400">
                  <MessageSquare className="w-3 h-3" />{notes} note{notes !== 1 ? "s" : ""} across all deployments
                </div>
              )}
              {dev.lastActivity && (
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                  <Clock className="w-3 h-3 flex-shrink-0" />{formatDistanceToNow(new Date(dev.lastActivity), { addSuffix: true })}
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

/* ─── Assignments Tab ────────────────────────────── */
const PRODUCTS: { id: ProductId; label: string; badgeClass: string }[] = [
  { id: "climagro", label: "Climagro", badgeClass: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300 border border-violet-200 dark:border-violet-800" },
  { id: "ehm", label: "EHM", badgeClass: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300 border border-sky-200 dark:border-sky-800" },
];

function AssignmentsTab({ deployments }: { deployments: Deployment[] }) {
  const [assignments, setAssignments] = useState<DeveloperAssignment[]>([]);
  const [saving, setSaving] = useState<string | null>(null);
  const summaries = buildSummaries(deployments);
  useEffect(() => { storage.getDeveloperAssignments().then(setAssignments); }, []);
  const getAssignment = (developerId: string): DeveloperAssignment =>
    assignments.find(a => a.developerId === developerId) ?? { developerId, developerName: "", products: [] };
  const toggleProduct = async (dev: DeveloperSummary, product: ProductId) => {
    setSaving(dev.id);
    const current = getAssignment(dev.id);
    const newProducts = current.products.includes(product) ? current.products.filter(p => p !== product) : [...current.products, product];
    await storage.upsertDeveloperAssignment({ developerId: dev.id, developerName: dev.name, products: newProducts });
    appendAuditLog(null, "developer_assigned", `Updated ${dev.name}'s assignment: ${newProducts.join(", ") || "none"}`);
    setAssignments(await storage.getDeveloperAssignments());
    setSaving(null);
  };
  if (summaries.length === 0) return (
    <div className="text-center py-16 text-muted-foreground">
      <UserCheck className="w-10 h-10 mx-auto mb-3 opacity-30" />
      <p className="text-sm">No developers yet. Start a deployment first.</p>
    </div>
  );
  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">Assign which developers are authorized to deploy each website.</p>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm min-w-[400px]">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Developer</th>
              {PRODUCTS.map(p => (
                <th key={p.id} className="text-center px-4 py-3">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded ${p.badgeClass}`}>{p.label}</span>
                </th>
              ))}
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide hidden sm:table-cell">Last Active</th>
            </tr>
          </thead>
          <tbody>
            {summaries.map((dev, idx) => {
              const assignment = getAssignment(dev.id);
              return (
                <tr key={dev.id} className={`border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors ${idx % 2 === 0 ? "" : "bg-muted/10"}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar className="w-8 h-8 border border-border flex-shrink-0">
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">{dev.initials}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-sm">{dev.name}</div>
                        <div className="text-xs text-muted-foreground">{dev.deployments.length} deployments</div>
                      </div>
                    </div>
                  </td>
                  {PRODUCTS.map(product => (
                    <td key={product.id} className="px-4 py-3 text-center">
                      <div className="flex justify-center">
                        <Checkbox checked={assignment.products.includes(product.id)} onCheckedChange={() => toggleProduct(dev, product.id)} disabled={saving === dev.id} className="w-5 h-5" />
                      </div>
                    </td>
                  ))}
                  <td className="px-4 py-3 text-muted-foreground text-xs hidden sm:table-cell">
                    {dev.lastActivity ? formatDistanceToNow(new Date(dev.lastActivity), { addSuffix: true }) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {PRODUCTS.map(product => {
          const assigned = assignments.filter(a => a.products.includes(product.id));
          return (
            <Card key={product.id}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded ${product.badgeClass}`}>{product.label}</span>
                  <span className="text-sm font-semibold">{assigned.length} assigned</span>
                </div>
                {assigned.length === 0
                  ? <p className="text-xs text-muted-foreground">No developers assigned</p>
                  : <div className="flex flex-wrap gap-1.5">
                      {assigned.map(a => <span key={a.developerId} className="text-xs bg-muted px-2 py-0.5 rounded font-medium">{a.developerName || summaries.find(s => s.id === a.developerId)?.name || "Unknown"}</span>)}
                    </div>
                }
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Create User Dialog ─────────────────────────── */
function generatePassword(len = 12): string {
  const chars = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$";
  return Array.from(crypto.getRandomValues(new Uint8Array(len))).map(b => chars[b % chars.length]).join("");
}

interface CreateUserDialogProps {
  onClose: () => void;
  onCreated: (user: RegisteredUser, sendInvite: boolean, passphrase: string) => void;
  currentUserName: string;
}

function CreateUserDialog({ onClose, onCreated, currentUserName }: CreateUserDialogProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [userRole, setUserRole] = useState<UserRole>("developer");
  const [password, setPassword] = useState(generatePassword);
  const [sendInvite, setSendInvite] = useState(false);
  const [passphrase, setPassphrase] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showPass, setShowPass] = useState(false);

  const handleCreate = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError("Name, email, and password are required.");
      return;
    }
    const existing = await storage.findRegisteredUserByEmail(email.trim());
    if (existing) { setError("A user with this email already exists."); return; }
    setSaving(true);
    const user: RegisteredUser = {
      id: crypto.randomUUID(),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      jobTitle: jobTitle.trim(),
      userRole,
      password: password.trim(),
      createdAt: new Date().toISOString(),
      invitedByName: currentUserName,
    };
    await storage.addRegisteredUser(user);
    onCreated(user, sendInvite, passphrase);
    setSaving(false);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create User Account</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Full Name *</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Jane Doe" />
            </div>
            <div className="space-y-1.5">
              <Label>Job Title</Label>
              <Input value={jobTitle} onChange={e => setJobTitle(e.target.value)} placeholder="Senior Engineer" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Email Address *</Label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="jane@example.com" />
          </div>
          <div className="space-y-1.5">
            <Label>Access Level</Label>
            <Select value={userRole} onValueChange={v => setUserRole(v as UserRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin — full access</SelectItem>
                <SelectItem value="developer">Developer — run deployments</SelectItem>
                <SelectItem value="viewer">Viewer — read-only</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="flex items-center justify-between">
              <span>Temporary Password *</span>
              <button type="button" onClick={() => setPassword(generatePassword())} className="text-xs text-primary hover:underline">Regenerate</button>
            </Label>
            <div className="relative">
              <Input
                type={showPass ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="pr-10 font-mono text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPass(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Eye className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="flex items-start gap-2 p-3 rounded-lg border border-border bg-muted/30">
            <Checkbox id="send-invite" checked={sendInvite} onCheckedChange={v => setSendInvite(!!v)} className="mt-0.5" />
            <div className="flex-1 space-y-2">
              <div>
                <Label htmlFor="send-invite" className="cursor-pointer text-sm font-medium">Send invite email</Label>
                <p className="text-xs text-muted-foreground">Sends credentials via the API server (requires SMTP config)</p>
              </div>
              {sendInvite && (
                <div className="space-y-1">
                  <Label className="text-xs">API server passphrase</Label>
                  <Input
                    type="password"
                    placeholder="Enter INVITE_API_KEY from server env"
                    value={passphrase}
                    onChange={e => setPassphrase(e.target.value)}
                    className="h-8 text-xs"
                  />
                  <p className="text-[10px] text-muted-foreground">This is the <span className="font-mono">INVITE_API_KEY</span> set on the API server. It is never stored.</p>
                </div>
              )}
            </div>
          </div>
          {error && (
            <p className="text-sm text-destructive flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />{error}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleCreate} disabled={!name.trim() || !email.trim() || !password.trim() || saving} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" />{saving ? "Creating..." : "Create User"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Users Tab ──────────────────────────────────── */
function UsersTab() {
  const [users, setUsers] = useState<RegisteredUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [inviteStatus, setInviteStatus] = useState<Record<string, "sending" | "sent" | "error">>({});
  /* Passphrase is entered once per session and never stored in the bundle or localStorage */
  const [passphrase, setPassphrase] = useState("");
  const [showPassphrase, setShowPassphrase] = useState(false);

  const load = useCallback(async () => {
    setUsers(await storage.getRegisteredUsers());
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const handleCreated = async (user: RegisteredUser, sendInvite: boolean, invitePassphrase: string) => {
    appendAuditLog(null, "user_created", `Created user account for "${user.name}" (${user.email})`);
    setCreating(false);
    await load();
    if (sendInvite) await sendInviteEmail(user, invitePassphrase);
  };

  const sendInviteEmail = async (user: RegisteredUser, ph?: string) => {
    const key = ph ?? passphrase;
    setInviteStatus(s => ({ ...s, [user.id]: "sending" }));
    try {
      const apiBase = import.meta.env.VITE_API_URL ?? "";
      const dashboardUrl = window.location.origin + (import.meta.env.BASE_URL ?? "/");
      const resp = await fetch(`${apiBase}/api/send-invite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(key.trim() ? { "Authorization": `Bearer ${key.trim()}` } : {}),
        },
        body: JSON.stringify({
          name: user.name,
          email: user.email,
          jobTitle: user.jobTitle,
          userRole: user.userRole,
          tempPassword: user.password,
          dashboardUrl,
        }),
      });
      if (resp.ok) {
        setInviteStatus(s => ({ ...s, [user.id]: "sent" }));
        appendAuditLog(null, "user_invited", `Sent invite email to "${user.name}" (${user.email})`);
      } else {
        const data = await resp.json().catch(() => ({}));
        setInviteStatus(s => ({ ...s, [user.id]: "error" }));
        alert(`Email failed: ${data.error ?? resp.statusText}${data.hint ? `\n\nHint: ${data.hint}` : ""}`);
      }
    } catch {
      setInviteStatus(s => ({ ...s, [user.id]: "error" }));
      alert("Could not reach the API server. Make sure it is running.");
    }
  };

  const handleDelete = async (user: RegisteredUser) => {
    if (!confirm(`Delete account for "${user.name}" (${user.email})? They will be signed out on next reload.`)) return;
    await storage.deleteRegisteredUser(user.id);
    appendAuditLog(null, "user_deleted", `Deleted user account for "${user.name}" (${user.email})`);
    load();
  };

  const handleRoleChange = async (user: RegisteredUser, role: UserRole) => {
    await storage.updateRegisteredUser({ ...user, userRole: role });
    appendAuditLog(null, "user_role_changed", `Changed ${user.name}'s access level to "${role}"`);
    load();
  };

  if (loading) return <div className="py-8 text-center text-muted-foreground text-sm">Loading users...</div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="font-semibold">Registered Users</p>
          <p className="text-sm text-muted-foreground">{users.length} account{users.length !== 1 ? "s" : ""} · Login requires email + password</p>
        </div>
        <Button size="sm" onClick={() => setCreating(true)} className="gap-1.5">
          <Plus className="w-3.5 h-3.5" />Add User
        </Button>
      </div>

      <div className="flex items-start gap-3 p-3 rounded-lg border border-border bg-muted/30 text-sm text-muted-foreground">
        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <div className="flex-1 space-y-2">
          <p>Users are stored locally. The invite email feature requires the API server with SMTP env vars. To send invites, enter the <span className="font-mono text-xs text-foreground">INVITE_API_KEY</span> from the server below — it is never stored in the browser.</p>
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-xs">
              <input
                type={showPassphrase ? "text" : "password"}
                placeholder="INVITE_API_KEY (from server)"
                value={passphrase}
                onChange={e => setPassphrase(e.target.value)}
                className="w-full h-8 pl-3 pr-8 text-xs bg-background border border-input rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <button
                type="button"
                onClick={() => setShowPassphrase(v => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Eye className="w-3.5 h-3.5" />
              </button>
            </div>
            {passphrase && <span className="text-xs text-emerald-600 dark:text-emerald-400">✓ Passphrase set</span>}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {users.map(user => {
          const ui = ROLE_UI[user.userRole];
          const initials = user.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
          const status = inviteStatus[user.id];
          return (
            <Card key={user.id}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <Avatar className="w-9 h-9 border border-border flex-shrink-0">
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{user.name}</span>
                      <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-medium ${ui.cls}`}>
                        {ui.icon}{ui.label}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">{user.email}{user.jobTitle ? ` · ${user.jobTitle}` : ""}</div>
                    {user.invitedByName && (
                      <div className="text-xs text-muted-foreground">Added by {user.invitedByName} · {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      disabled={status === "sending"}
                      onClick={() => sendInviteEmail(user)}
                    >
                      <MessageSquare className="w-3 h-3" />
                      {status === "sending" ? "Sending…" : status === "sent" ? "Sent ✓" : status === "error" ? "Failed" : "Invite"}
                    </Button>
                    <Select value={user.userRole} onValueChange={v => handleRoleChange(user, v as UserRole)}>
                      <SelectTrigger className="w-32 h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="developer">Developer</SelectItem>
                        <SelectItem value="viewer">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                    <button
                      onClick={() => handleDelete(user)}
                      className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      title="Delete user"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {creating && (
        <CreateUserDialog
          onClose={() => setCreating(false)}
          onCreated={handleCreated}
          currentUserName="Admin"
        />
      )}
    </div>
  );
}

/* ─── Audit Log Tab ──────────────────────────────── */
function AuditLogTab() {
  const [log, setLog] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterAction, setFilterAction] = useState<string>("all");

  useEffect(() => {
    storage.getAuditLog().then(entries => { setLog(entries); setLoading(false); });
  }, []);

  const filtered = log.filter(entry => {
    if (filterAction !== "all" && !entry.action.includes(filterAction)) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!entry.details.toLowerCase().includes(q) && !entry.userName.toLowerCase().includes(q) && !(entry.deploymentRunId ?? "").toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const ACTION_GROUPS = [
    { value: "all", label: "All actions" },
    { value: "deployment", label: "Deployments" },
    { value: "item", label: "Checklist items" },
    { value: "note", label: "Notes" },
    { value: "checklist_template", label: "Templates" },
    { value: "user", label: "User / Role" },
    { value: "admin", label: "Admin" },
  ];

  if (loading) return <div className="py-8 text-center text-muted-foreground text-sm">Loading audit log...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input className="pl-9" placeholder="Search log..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterAction} onValueChange={setFilterAction}>
          <SelectTrigger className="w-44 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ACTION_GROUPS.map(g => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground ml-auto">{filtered.length} entries</span>
      </div>

      {log.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No audit log entries yet. Actions will be recorded here.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">No entries match your search.</div>
      ) : (
        <div className="space-y-1.5">
          {filtered.map((entry, idx) => {
            const actionInfo = AUDIT_ACTION_LABEL[entry.action] ?? { label: entry.action, cls: "bg-secondary text-muted-foreground" };
            const roleInfo = ROLE_UI[entry.userRole];
            return (
              <div key={entry.id} className={`flex items-start gap-3 px-4 py-3 rounded-lg border border-border/50 bg-card hover:bg-muted/30 transition-colors ${idx === 0 ? "border-primary/20" : ""}`}>
                <Avatar className="w-7 h-7 border border-border flex-shrink-0 mt-0.5">
                  <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-semibold">
                    {entry.userName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="text-sm font-medium">{entry.userName}</span>
                    <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-medium ${roleInfo.cls}`}>
                      {roleInfo.icon}{roleInfo.label}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${actionInfo.cls}`}>
                      {actionInfo.label}
                    </span>
                    {entry.deploymentRunId && (
                      <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        {entry.deploymentRunId}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{entry.details}</p>
                </div>
                <span className="text-xs text-muted-foreground flex-shrink-0 whitespace-nowrap" title={format(new Date(entry.timestamp), "PPpp")}>
                  {formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true })}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs text-muted-foreground flex items-center gap-1.5 pt-1">
        <Lock className="w-3 h-3" />
        The audit log is append-only. Entries cannot be edited or deleted.
      </p>
    </div>
  );
}

/* ─── Settings Tab ───────────────────────────────── */
function SettingsTab({ onLogout }: { onLogout: () => void }) {
  const [username, setUsername] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  useEffect(() => { storage.getAdminCredentials().then(c => setUsername(c.username)); }, []);

  const handleSave = async () => {
    setStatus(null);
    const ok = await storage.verifyAdminLogin(username, currentPassword);
    if (!ok) { setStatus({ type: "error", msg: "Current password is incorrect." }); return; }
    if (newPassword.length < 4) { setStatus({ type: "error", msg: "New password must be at least 4 characters." }); return; }
    if (newPassword !== confirmPassword) { setStatus({ type: "error", msg: "Passwords do not match." }); return; }
    await storage.saveAdminCredentials({ username: username.trim(), password: newPassword });
    setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    setStatus({ type: "success", msg: "Credentials updated successfully." });
  };

  return (
    <div className="max-w-sm space-y-5">
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Change Admin Credentials</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>User ID</Label>
            <Input value={username} onChange={e => setUsername(e.target.value)} placeholder="admin" />
          </div>
          <div className="space-y-1.5">
            <Label>Current Password</Label>
            <Input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="••••••••" />
          </div>
          <div className="space-y-1.5">
            <Label>New Password</Label>
            <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="••••••••" />
          </div>
          <div className="space-y-1.5">
            <Label>Confirm New Password</Label>
            <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" />
          </div>
          {status && (
            <p className={`text-sm flex items-center gap-1.5 ${status.type === "success" ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
              {status.type === "error" && <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />}
              {status.msg}
            </p>
          )}
          <Button onClick={handleSave} disabled={!username || !currentPassword || !newPassword || !confirmPassword} className="w-full">Update Credentials</Button>
        </CardContent>
      </Card>
      <Card className="border-destructive/20">
        <CardContent className="pt-4 pb-4">
          <Button variant="outline" className="w-full gap-2 border-destructive/30 text-destructive hover:bg-destructive/5 hover:text-destructive" onClick={onLogout}>
            <LogOut className="w-4 h-4" />Sign out of admin
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

/* ─── Main Component ─────────────────────────────── */
export default function AdminPanel() {
  const [, setLocation] = useLocation();
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { storage.isAdminLoggedIn().then(setIsLoggedIn); }, []);

  const load = useCallback(async () => {
    setRefreshing(true);
    setDeployments(await storage.getAllDeployments());
    setLastRefresh(new Date());
    setRefreshing(false);
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      load();
      const interval = setInterval(load, 30_000);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [isLoggedIn, load]);

  const handleLogout = async () => {
    appendAuditLog(null, "admin_logout", "Admin signed out");
    await storage.setAdminSession(false);
    setIsLoggedIn(false);
  };

  if (isLoggedIn === null) return null;
  if (!isLoggedIn) return <LoginScreen onLogin={() => setIsLoggedIn(true)} />;

  return (
    <PageLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              <h1 className="text-2xl font-bold tracking-tight">Admin Panel</h1>
            </div>
            <p className="text-muted-foreground text-sm mt-0.5">Manage deployments, checklists, user roles, and audit logs</p>
          </div>
          <button
            onClick={load}
            disabled={refreshing}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2.5 py-1.5 rounded-md hover:bg-muted disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">{formatDistanceToNow(lastRefresh, { addSuffix: true })}</span>
            <span className="sm:hidden">Refresh</span>
          </button>
        </div>

        <Tabs defaultValue="overview" className="space-y-5">
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <TabsList className="inline-flex gap-0.5 h-9 p-1 whitespace-nowrap">
              <TabsTrigger value="overview" className="gap-1.5 text-xs sm:text-sm px-2 sm:px-3">
                <Activity className="w-3.5 h-3.5" /><span>Overview</span>
              </TabsTrigger>
              <TabsTrigger value="checklist-climagro" className="gap-1.5 text-xs sm:text-sm px-2 sm:px-3">
                <Layers className="w-3.5 h-3.5" /><span className="hidden sm:inline">Climagro </span>Checklist
              </TabsTrigger>
              <TabsTrigger value="checklist-ehm" className="gap-1.5 text-xs sm:text-sm px-2 sm:px-3">
                <Layers className="w-3.5 h-3.5" /><span className="hidden sm:inline">EHM </span>Checklist
              </TabsTrigger>
              <TabsTrigger value="developers" className="gap-1.5 text-xs sm:text-sm px-2 sm:px-3">
                <Users className="w-3.5 h-3.5" /><span>Developers</span>
              </TabsTrigger>
              <TabsTrigger value="assignments" className="gap-1.5 text-xs sm:text-sm px-2 sm:px-3">
                <UserCheck className="w-3.5 h-3.5" /><span>Assignments</span>
              </TabsTrigger>
              <TabsTrigger value="users" className="gap-1.5 text-xs sm:text-sm px-2 sm:px-3">
                <ShieldCheck className="w-3.5 h-3.5" /><span>Users</span>
              </TabsTrigger>
              <TabsTrigger value="audit" className="gap-1.5 text-xs sm:text-sm px-2 sm:px-3">
                <FileText className="w-3.5 h-3.5" /><span>Audit Log</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="gap-1.5 text-xs sm:text-sm px-2 sm:px-3">
                <Lock className="w-3.5 h-3.5" /><span>Settings</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview">
            <OverviewTab deployments={deployments} onViewDeployment={id => setLocation(`/deployment/${id}?admin=1`)} />
          </TabsContent>
          <TabsContent value="checklist-climagro">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold font-mono uppercase tracking-widest px-2.5 py-1 rounded bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300">climagro</span>
                <h2 className="font-semibold">Climagro Deployment Checklist</h2>
              </div>
              <ChecklistEditor product="climagro" />
            </div>
          </TabsContent>
          <TabsContent value="checklist-ehm">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold font-mono uppercase tracking-widest px-2.5 py-1 rounded bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300">ehm</span>
                <h2 className="font-semibold">EHM Deployment Checklist</h2>
              </div>
              <ChecklistEditor product="ehm" />
            </div>
          </TabsContent>
          <TabsContent value="developers">
            <DevelopersTab deployments={deployments} />
          </TabsContent>
          <TabsContent value="assignments">
            <AssignmentsTab deployments={deployments} />
          </TabsContent>
          <TabsContent value="users">
            <UsersTab />
          </TabsContent>
          <TabsContent value="audit">
            <AuditLogTab />
          </TabsContent>
          <TabsContent value="settings">
            <SettingsTab onLogout={handleLogout} />
          </TabsContent>
        </Tabs>
      </div>
    </PageLayout>
  );
}
