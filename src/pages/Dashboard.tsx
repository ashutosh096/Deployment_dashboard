import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { storage, appendAuditLog } from "@/lib/storage";
import type { Deployment, DeveloperProfile, ProductId } from "@/types";
import PageLayout from "@/components/PageLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getPreSections, getPostSections, totalItems, checkedCount } from "@/data/checklists";
import { Plus, CheckCircle2, CircleDashed, Activity, ArrowRight, Rocket, TrendingUp, XCircle, ShieldCheck, Code2, Eye, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

const PRODUCT_LABELS: Record<ProductId, string> = { climagro: "Climagro", ehm: "EHM" };
const PRODUCT_COLORS: Record<ProductId, { bg: string; text: string; bar: string }> = {
  climagro: { bg: "bg-violet-100 dark:bg-violet-950/40", text: "text-violet-700 dark:text-violet-300", bar: "bg-violet-500" },
  ehm:      { bg: "bg-sky-100 dark:bg-sky-950/40",    text: "text-sky-700 dark:text-sky-300",    bar: "bg-sky-500" },
};

const ROLE_UI = {
  admin:     { label: "Admin",     icon: <ShieldCheck className="w-3 h-3" />, cls: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300" },
  developer: { label: "Developer", icon: <Code2 className="w-3 h-3" />,      cls: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300" },
  viewer:    { label: "Viewer",    icon: <Eye className="w-3 h-3" />,         cls: "bg-secondary text-muted-foreground" },
};

function isThisMonth(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

interface ProductStats {
  completed: number;
  inProgress: number;
  failed: number;
  total: number;
}

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [profile, setProfile] = useState<DeveloperProfile | null>(null);
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [newProduct, setNewProduct] = useState<ProductId>("climagro");
  const [newName, setNewName] = useState("");

  useEffect(() => {
    storage.getProfile().then(setProfile);
    storage.getAllDeployments().then(setDeployments);
  }, []);

  const isViewer = profile?.userRole === "viewer";

  const handleStartDeployment = async () => {
    if (!profile || !newName || isViewer) return;
    const id = crypto.randomUUID();
    const runId = storage.generateRunId();
    const deployment: Deployment = {
      id,
      runId,
      product: newProduct,
      name: newName,
      developerId: profile.id,
      developerName: profile.name,
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: "in-progress",
      prePhase: { checkedItems: {}, completed: false },
      postPhase: { checkedItems: {}, completed: false },
      locked: false,
      itemNotes: {},
    };
    await storage.saveDeployment(deployment);
    appendAuditLog(profile, "deployment_started", `Started deployment "${newName}"`, {
      deploymentId: id,
      deploymentRunId: runId,
      deploymentName: newName,
      product: newProduct,
    });
    setNewModalOpen(false);
    setNewName("");
    setLocation(`/deployment/${id}`);
  };

  const inProgress = deployments.filter(d => d.status === "in-progress");
  const completed  = deployments.filter(d => d.status === "completed");
  const total      = deployments.length;
  const successRate = total ? Math.round((completed.length / total) * 100) : 0;

  const thisMonthByProduct = useMemo((): Record<ProductId, ProductStats> => {
    const base = (): ProductStats => ({ completed: 0, inProgress: 0, failed: 0, total: 0 });
    const acc: Record<ProductId, ProductStats> = { climagro: base(), ehm: base() };
    deployments.forEach(d => {
      if (!isThisMonth(d.startedAt)) return;
      const s = acc[d.product];
      s.total++;
      if (d.status === "completed") s.completed++;
      else if (d.status === "in-progress") s.inProgress++;
      else if (d.status === "failed") s.failed++;
    });
    return acc;
  }, [deployments]);

  const thisMonthTotal = thisMonthByProduct.climagro.total + thisMonthByProduct.ehm.total;
  const thisMonthCompleted = thisMonthByProduct.climagro.completed + thisMonthByProduct.ehm.completed;

  const roleInfo = profile ? ROLE_UI[profile.userRole ?? "developer"] : null;

  return (
    <PageLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
              {roleInfo && (
                <span className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded ${roleInfo.cls}`}>
                  {roleInfo.icon}
                  {roleInfo.label}
                </span>
              )}
            </div>
            <p className="text-muted-foreground mt-1">Deployment command center</p>
          </div>
          {isViewer ? (
            <Badge variant="outline" className="gap-1.5 text-muted-foreground">
              <Eye className="w-3 h-3" /> View-only mode
            </Badge>
          ) : (
            <Button onClick={() => setNewModalOpen(true)} disabled={!profile} data-testid="button-new-deployment">
              <Plus className="w-4 h-4 mr-2" />
              Start New Deployment
            </Button>
          )}
        </div>

        {/* Viewer notice */}
        {isViewer && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-muted bg-muted/30 text-sm text-muted-foreground">
            <Eye className="w-4 h-4 flex-shrink-0" />
            You have viewer access. You can browse all deployments and their history, but cannot start or modify deployments.
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Deployments</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-total">{total}</div>
              <p className="text-xs text-muted-foreground mt-1">all time</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400" data-testid="stat-completed">{completed.length}</div>
              <p className="text-xs text-muted-foreground mt-1">{thisMonthCompleted} this month</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              <CircleDashed className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400" data-testid="stat-in-progress">{inProgress.length}</div>
              <p className="text-xs text-muted-foreground mt-1">active now</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-success-rate">{successRate}%</div>
              <p className="text-xs text-muted-foreground mt-1">completed vs total</p>
            </CardContent>
          </Card>
        </div>

        {/* This Month breakdown */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold tracking-tight">
              {format(new Date(), "MMMM yyyy")} Activity
            </h2>
            <span className="text-sm text-muted-foreground">
              {thisMonthTotal} deployment{thisMonthTotal !== 1 ? "s" : ""} this month
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(["climagro", "ehm"] as ProductId[]).map(product => {
              const stats = thisMonthByProduct[product];
              const colors = PRODUCT_COLORS[product];
              const completedPct = stats.total ? Math.round((stats.completed  / stats.total) * 100) : 0;
              const inProgPct    = stats.total ? Math.round((stats.inProgress / stats.total) * 100) : 0;
              const failedPct    = stats.total ? Math.round((stats.failed     / stats.total) * 100) : 0;

              return (
                <Card key={product} data-testid={`card-month-${product}`}>
                  <CardContent className="pt-5 pb-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold font-mono uppercase tracking-widest px-2 py-0.5 rounded ${colors.bg} ${colors.text}`}>
                          {product}
                        </span>
                        <span className="font-semibold text-foreground">{PRODUCT_LABELS[product]}</span>
                      </div>
                      <span className="text-2xl font-bold tabular-nums">{stats.total}</span>
                    </div>

                    {stats.total > 0 ? (
                      <div className="h-2 w-full rounded-full overflow-hidden flex mb-4 bg-secondary">
                        {stats.completed > 0 && (
                          <div className="h-full bg-emerald-500 transition-all duration-700" style={{ width: `${completedPct}%` }} title={`${stats.completed} completed`} />
                        )}
                        {stats.inProgress > 0 && (
                          <div className="h-full bg-blue-400 transition-all duration-700" style={{ width: `${inProgPct}%` }} title={`${stats.inProgress} in progress`} />
                        )}
                        {stats.failed > 0 && (
                          <div className="h-full bg-red-400 transition-all duration-700" style={{ width: `${failedPct}%` }} title={`${stats.failed} failed`} />
                        )}
                      </div>
                    ) : (
                      <div className="h-2 w-full rounded-full bg-secondary mb-4" />
                    )}

                    <div className="grid grid-cols-3 gap-2">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                          <span className="text-xs text-muted-foreground">Completed</span>
                        </div>
                        <span className="text-lg font-bold tabular-nums pl-4">{stats.completed}</span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5">
                          <CircleDashed className="w-3 h-3 text-blue-500 flex-shrink-0" />
                          <span className="text-xs text-muted-foreground">In Progress</span>
                        </div>
                        <span className="text-lg font-bold tabular-nums pl-4">{stats.inProgress}</span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5">
                          <XCircle className="w-3 h-3 text-red-500 flex-shrink-0" />
                          <span className="text-xs text-muted-foreground">Failed</span>
                        </div>
                        <span className="text-lg font-bold tabular-nums pl-4">{stats.failed}</span>
                      </div>
                    </div>

                    {stats.total === 0 && (
                      <p className="text-xs text-muted-foreground mt-2">No deployments this month</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Active deployments */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold tracking-tight">Active Deployments</h2>
          {inProgress.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center h-48 text-center">
                <Rocket className="w-10 h-10 text-muted-foreground mb-4 opacity-20" />
                <h3 className="text-lg font-medium">No active deployments</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                  You are all caught up. {isViewer ? "Active deployments will appear here." : "Start a new deployment when you are ready to ship."}
                </p>
                {!isViewer && (
                  <Button variant="outline" className="mt-4" onClick={() => setNewModalOpen(true)} disabled={!profile}>
                    Start Deployment
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {inProgress.map(dep => {
                const preTotal = totalItems(getPreSections(dep.product));
                const preDone  = checkedCount(getPreSections(dep.product), dep.prePhase.checkedItems);
                const prePct   = preTotal ? Math.round((preDone  / preTotal)  * 100) : 0;
                const postTotal = totalItems(getPostSections(dep.product));
                const postDone  = checkedCount(getPostSections(dep.product), dep.postPhase.checkedItems);
                const postPct   = postTotal ? Math.round((postDone / postTotal) * 100) : 0;

                return (
                  <Card key={dep.id} className="flex flex-col hover-elevate transition-shadow" data-testid={`card-deployment-${dep.id}`}>
                    <CardHeader className="pb-3 border-b">
                      <div className="flex justify-between items-start">
                        <div>
                          <Badge variant="outline" className="mb-2 font-mono text-[10px] uppercase">{dep.product}</Badge>
                          <CardTitle className="text-lg">{dep.name}</CardTitle>
                          <p className="text-xs text-muted-foreground font-mono mt-1">
                            {dep.runId || dep.id.split("-")[0].toUpperCase()}
                          </p>
                        </div>
                        <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-transparent dark:bg-blue-950 dark:text-blue-300">
                          In Progress
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4 flex-1">
                      <div className="space-y-4">
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs font-medium">
                            <span>Pre-Deployment</span>
                            <span className="font-mono">{prePct}%</span>
                          </div>
                          <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${prePct}%` }} />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs font-medium">
                            <span>Post-Deployment</span>
                            <span className="font-mono">{postPct}%</span>
                          </div>
                          <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${postPct}%` }} />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                    <div className="p-4 border-t bg-muted/30 flex justify-between items-center mt-auto">
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                          {dep.developerName.charAt(0)}
                        </div>
                        {dep.developerName}
                      </div>
                      <Button size="sm" onClick={() => setLocation(`/deployment/${dep.id}`)} data-testid={`button-continue-${dep.id}`}>
                        {isViewer ? "View" : "Continue"} <ArrowRight className="w-3 h-3 ml-1" />
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* New Deployment dialog — hidden for viewers */}
      {!isViewer && (
        <Dialog open={newModalOpen} onOpenChange={open => { setNewModalOpen(open); if (!open) setNewName(""); }}>
          <DialogContent data-testid="modal-new-deployment">
            <DialogHeader>
              <DialogTitle>Start New Deployment</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Product</Label>
                <Select value={newProduct} onValueChange={v => setNewProduct(v as ProductId)}>
                  <SelectTrigger data-testid="select-product">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="climagro">Climagro</SelectItem>
                    <SelectItem value="ehm">EHM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Deployment Name</Label>
                <Input
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="e.g. v2.4.1 Release"
                  data-testid="input-deployment-name"
                  onKeyDown={e => e.key === "Enter" && newName && handleStartDeployment()}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setNewModalOpen(false); setNewName(""); }}>Cancel</Button>
              <Button onClick={handleStartDeployment} disabled={!newName} data-testid="button-create-deployment">
                Create & Start
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </PageLayout>
  );
}
