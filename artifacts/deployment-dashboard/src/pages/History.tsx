import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { storage } from "@/lib/storage";
import type { Deployment, ProductId, DeploymentStatus } from "@/types";
import PageLayout from "@/components/PageLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getPreSections, getPostSections, totalItems, checkedCount } from "@/data/checklists";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { FileDown, Trash2, Copy, Search, X, Lock, MessageSquare, ShieldCheck, AlertCircle } from "lucide-react";
import { generateDeploymentReport } from "@/lib/export";

const STATUS_COLORS: Record<DeploymentStatus, string> = {
  "in-progress": "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  "completed":   "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  "failed":      "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
};
const STATUS_LABEL: Record<DeploymentStatus, string> = {
  "in-progress": "In Progress",
  "completed":   "Completed",
  "failed":      "Failed",
};

function noteCount(dep: Deployment): number {
  return Object.values(dep.itemNotes ?? {}).reduce((a, n) => a + n.length, 0);
}

export default function History() {
  const [, setLocation] = useLocation();
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [profile, setProfile] = useState<ReturnType<typeof storage.getProfile> extends Promise<infer T> ? T : never>(null);
  const [search, setSearch] = useState("");
  const [filterProduct, setFilterProduct] = useState<ProductId | "all">("all");
  const [filterStatus, setFilterStatus] = useState<DeploymentStatus | "all">("all");
  const [deleteTarget, setDeleteTarget] = useState<Deployment | null>(null);
  const [cloneTarget, setCloneTarget] = useState<Deployment | null>(null);
  const [cloneName, setCloneName] = useState("");

  useEffect(() => {
    storage.getProfile().then(p => setProfile(p as any));
    reload();
  }, []);

  function reload() {
    storage.getAllDeployments().then(deps => {
      setDeployments(deps.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()));
    });
  }

  const isAdmin = (profile as any)?.userRole === "admin";
  const isViewer = (profile as any)?.userRole === "viewer";

  const filtered = useMemo(() => {
    return deployments.filter(dep => {
      if (filterProduct !== "all" && dep.product !== filterProduct) return false;
      if (filterStatus !== "all" && dep.status !== filterStatus) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const rid = (dep.runId || "").toLowerCase();
        if (!dep.name.toLowerCase().includes(q) && !dep.developerName.toLowerCase().includes(q) && !rid.includes(q)) return false;
      }
      return true;
    });
  }, [deployments, search, filterProduct, filterStatus]);

  const hasFilters = search.trim() || filterProduct !== "all" || filterStatus !== "all";

  async function handleDelete() {
    if (!deleteTarget) return;
    await storage.deleteDeployment(deleteTarget.id);
    setDeleteTarget(null);
    reload();
  }

  async function handleClone() {
    if (!cloneTarget) return;
    const prof = await storage.getProfile();
    const id = crypto.randomUUID();
    const runId = storage.generateRunId();
    const cloned: Deployment = {
      id,
      runId,
      product: cloneTarget.product,
      name: cloneName.trim() || `${cloneTarget.name} (copy)`,
      developerId: prof?.id ?? "unknown",
      developerName: prof?.name ?? cloneTarget.developerName,
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: "in-progress",
      prePhase: { checkedItems: {}, completed: false },
      postPhase: { checkedItems: {}, completed: false },
      locked: false,
      itemNotes: {},
    };
    await storage.saveDeployment(cloned);
    setCloneTarget(null);
    setCloneName("");
    setLocation(`/deployment/${id}`);
  }

  return (
    <PageLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Deployment History</h1>
            <Badge variant="outline" className="gap-1 text-muted-foreground">
              <Lock className="w-3 h-3" /> Immutable Audit Trail
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1">Completed and active deployments — closed records are permanently locked</p>
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search by name, developer, or run ID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-9 text-sm"
              data-testid="input-search"
            />
          </div>
          <Select value={filterProduct} onValueChange={v => setFilterProduct(v as ProductId | "all")}>
            <SelectTrigger className="w-36 h-9 text-sm" data-testid="select-filter-product">
              <SelectValue placeholder="Product" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All products</SelectItem>
              <SelectItem value="climagro">Climagro</SelectItem>
              <SelectItem value="ehm">EHM</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={v => setFilterStatus(v as DeploymentStatus | "all")}>
            <SelectTrigger className="w-36 h-9 text-sm" data-testid="select-filter-status">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="in-progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setFilterProduct("all"); setFilterStatus("all"); }} className="h-9 text-muted-foreground" data-testid="button-clear-filters">
              <X className="w-3.5 h-3.5 mr-1" /> Clear
            </Button>
          )}
          <span className="text-sm text-muted-foreground ml-auto">
            {filtered.length} of {deployments.length}
          </span>
        </div>

        <Card>
          <CardContent className="p-0">
            {deployments.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">No deployment history found.</div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">No deployments match your filters.</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">Run ID</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Developer</TableHead>
                      <TableHead className="whitespace-nowrap">Date</TableHead>
                      <TableHead>Pre</TableHead>
                      <TableHead>Post</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(dep => {
                      const preSections = getPreSections(dep.product);
                      const postSections = getPostSections(dep.product);
                      const preTotal = totalItems(preSections);
                      const preDone  = checkedCount(preSections, dep.prePhase.checkedItems);
                      const prePct   = preTotal ? Math.round((preDone / preTotal) * 100) : 0;
                      const postTotal = totalItems(postSections);
                      const postDone  = checkedCount(postSections, dep.postPhase.checkedItems);
                      const postPct   = postTotal ? Math.round((postDone / postTotal) * 100) : 0;
                      const notes = noteCount(dep);
                      const runLabel = dep.runId || dep.id.split("-")[0].toUpperCase();

                      return (
                        <TableRow
                          key={dep.id}
                          className="cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => setLocation(`/deployment/${dep.id}`)}
                          data-testid={`row-deployment-${dep.id}`}
                        >
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-xs font-semibold text-foreground">{runLabel}</span>
                              {dep.locked && <Lock className="w-3 h-3 text-muted-foreground flex-shrink-0" aria-label="Locked — immutable record" />}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="uppercase text-[10px] font-mono font-bold">{dep.product}</Badge>
                          </TableCell>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-1.5">
                              <span>{dep.name}</span>
                              {notes > 0 && (
                                <span className="flex items-center gap-0.5 text-[10px] text-amber-700 bg-amber-100 dark:bg-amber-950 dark:text-amber-300 px-1.5 py-0.5 rounded font-medium flex-shrink-0">
                                  <MessageSquare className="w-3 h-3" />{notes}
                                </span>
                              )}
                            </div>
                            {dep.status === "failed" && dep.failureReason && (
                              <div className="flex items-center gap-1 text-xs text-red-500 mt-0.5">
                                <AlertCircle className="w-3 h-3 flex-shrink-0" />
                                <span className="truncate max-w-40">{dep.failureReason}</span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">{dep.developerName}</TableCell>
                          <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                            {format(new Date(dep.startedAt), "MMM d, yyyy HH:mm")}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden">
                                <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${prePct}%` }} />
                              </div>
                              <span className="font-mono text-xs text-muted-foreground w-8">{prePct}%</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${postPct}%` }} />
                              </div>
                              <span className="font-mono text-xs text-muted-foreground w-8">{postPct}%</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${STATUS_COLORS[dep.status]} border-transparent`} variant="outline">
                              {STATUS_LABEL[dep.status]}
                            </Badge>
                          </TableCell>
                          <TableCell onClick={e => e.stopPropagation()}>
                            <div className="flex items-center gap-0.5">
                              <Button
                                variant="ghost" size="sm"
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                                onClick={() => generateDeploymentReport(dep)}
                                data-testid={`button-export-${dep.id}`}
                                title="Export report"
                              >
                                <FileDown className="w-3.5 h-3.5" />
                              </Button>
                              {!isViewer && (
                                <Button
                                  variant="ghost" size="sm"
                                  className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                                  onClick={() => { setCloneTarget(dep); setCloneName(`${dep.name} (copy)`); }}
                                  data-testid={`button-clone-${dep.id}`}
                                  title="Re-run"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </Button>
                              )}
                              {isAdmin && (
                                <Button
                                  variant="ghost" size="sm"
                                  className="h-7 w-7 p-0 text-muted-foreground hover:text-red-600"
                                  onClick={() => setDeleteTarget(dep)}
                                  data-testid={`button-delete-${dep.id}`}
                                  title={dep.locked ? "Locked records can only be deleted by admin" : "Delete"}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Locked records note */}
        {deployments.some(d => d.locked) && (
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Lock className="w-3 h-3" />
            Completed and failed deployments are locked. Their checklist state is preserved as an immutable audit trail.
            {isAdmin && " Admin can delete locked records if needed."}
          </p>
        )}
      </div>

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm" data-testid="modal-delete">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-4 h-4" /> Delete Deployment
            </DialogTitle>
            <DialogDescription>
              {deleteTarget?.locked
                ? "This is a locked record. Deleting it will permanently remove the audit trail."
                : "This will permanently remove the record and cannot be undone."
              }
            </DialogDescription>
          </DialogHeader>
          {deleteTarget && (
            <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm">
              <span className="font-semibold">{deleteTarget.name}</span>
              <span className="text-muted-foreground font-mono ml-2 text-xs">{deleteTarget.runId || deleteTarget.id.split("-")[0]}</span>
              {deleteTarget.locked && (
                <span className="ml-2 inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Lock className="w-3 h-3" /> locked
                </span>
              )}
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} data-testid="button-confirm-delete">
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clone dialog */}
      <Dialog open={!!cloneTarget} onOpenChange={open => { if (!open) { setCloneTarget(null); setCloneName(""); } }}>
        <DialogContent className="sm:max-w-sm" data-testid="modal-clone">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Copy className="w-4 h-4" /> Re-run Deployment
            </DialogTitle>
            <DialogDescription>
              Creates a fresh deployment with all checkboxes reset and a new Run ID.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {cloneTarget && (
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                <Badge variant="outline" className="uppercase font-mono text-[10px]">{cloneTarget.product}</Badge>
                Cloning from: <span className="font-medium text-foreground">{cloneTarget.name}</span>
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="clone-name">New deployment name</label>
              <Input
                id="clone-name"
                value={cloneName}
                onChange={e => setCloneName(e.target.value)}
                placeholder="e.g. v2.5.0 Release"
                data-testid="input-clone-name"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setCloneTarget(null); setCloneName(""); }}>Cancel</Button>
            <Button onClick={handleClone} disabled={!cloneName.trim()} data-testid="button-confirm-clone">
              <Copy className="w-4 h-4 mr-2" /> Clone & Start
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}
