import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { storage, appendAuditLog } from "@/lib/storage";
import type { Deployment, DeveloperProfile, ProductId } from "@/types";
import PageLayout from "@/components/PageLayout";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getPreSections, getPostSections, totalItems, checkedCount } from "@/data/checklists";
import {
  Plus, CheckCircle2, CircleDashed, ArrowRight, Rocket, TrendingUp, XCircle,
  ShieldCheck, Code2, Eye, Search, Bell, ChevronRight, ArrowUpRight,
  MoreHorizontal, Clock,
} from "lucide-react";
import { format } from "date-fns";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  BarChart, Bar
} from "recharts";

const PRODUCT_LABELS: Record<ProductId, string> = { climagro: "Climagro", ehm: "EHM" };

const ROLE_UI = {
  admin:     { label: "Admin",     icon: <ShieldCheck className="w-3 h-3" />, cls: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300" },
  developer: { label: "Developer", icon: <Code2 className="w-3 h-3" />,      cls: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300" },
  viewer:    { label: "Viewer",    icon: <Eye className="w-3 h-3" />,         cls: "bg-slate-100 text-slate-600" },
};

function isThisMonth(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

interface ProductStats {
  completed: number; inProgress: number; failed: number; total: number;
}

/* ── Enterprise stat card ─────────────────────────── */
function StatCard({
  label, value, sub, trend, testId,
}: {
  label: string; value: string | number; sub?: string; trend?: string; testId?: string;
}) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-5 flex flex-col">
      <div className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{label}</div>
      <div className="text-3xl font-semibold text-slate-900 dark:text-white mb-2 tabular-nums" data-testid={testId}>
        {value}
      </div>
      <div className="mt-auto">
        {trend ? (
          <div className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            <ArrowUpRight className="w-3 h-3" />{trend}
          </div>
        ) : (
          <div className="text-xs text-slate-400 dark:text-slate-500">{sub}</div>
        )}
      </div>
    </div>
  );
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
      id, runId, product: newProduct, name: newName,
      developerId: profile.id, developerName: profile.name,
      startedAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      status: "in-progress",
      prePhase: { checkedItems: {}, completed: false },
      postPhase: { checkedItems: {}, completed: false },
      locked: false, itemNotes: {},
    };
    await storage.saveDeployment(deployment);
    appendAuditLog(profile, "deployment_started", `Started deployment "${newName}"`, {
      deploymentId: id, deploymentRunId: runId, deploymentName: newName, product: newProduct,
    });
    setNewModalOpen(false);
    setNewName("");
    setLocation(`/deployment/${id}`);
  };

  const inProgress    = deployments.filter(d => d.status === "in-progress");
  const completed     = deployments.filter(d => d.status === "completed");
  const total         = deployments.length;
  const successRate   = total ? Math.round((completed.length / total) * 100) : 0;

  const thisMonthByProduct = useMemo((): Record<ProductId, ProductStats> => {
    const base = (): ProductStats => ({ completed: 0, inProgress: 0, failed: 0, total: 0 });
    const acc: Record<ProductId, ProductStats> = { climagro: base(), ehm: base() };
    deployments.forEach(d => {
      if (!isThisMonth(d.startedAt)) return;
      const s = acc[d.product];
      s.total++;
      if (d.status === "completed")  s.completed++;
      else if (d.status === "in-progress") s.inProgress++;
      else if (d.status === "failed")      s.failed++;
    });
    return acc;
  }, [deployments]);

  const thisMonthTotal     = thisMonthByProduct.climagro.total + thisMonthByProduct.ehm.total;
  const thisMonthCompleted = thisMonthByProduct.climagro.completed + thisMonthByProduct.ehm.completed;
  const roleInfo = profile ? ROLE_UI[profile.userRole ?? "developer"] : null;

  const last14DaysData = useMemo(() => {
    const dates = Array.from({ length: 14 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return format(d, "MMM dd");
    }).reverse();

    const dateMap = new Map<string, { date: string; climagro: number; ehm: number }>();
    dates.forEach(d => dateMap.set(d, { date: d, climagro: 0, ehm: 0 }));

    deployments.forEach(dep => {
      const dateStr = format(new Date(dep.startedAt), "MMM dd");
      if (dateMap.has(dateStr)) {
        const val = dateMap.get(dateStr)!;
        if (dep.product === "climagro") val.climagro++;
        else if (dep.product === "ehm") val.ehm++;
      }
    });

    return Array.from(dateMap.values());
  }, [deployments]);

  const productShareData = useMemo(() => {
    const climagroCount = deployments.filter(d => d.product === "climagro").length;
    const ehmCount = deployments.filter(d => d.product === "ehm").length;
    return [
      { name: "Climagro", value: climagroCount, color: "#10b981" },
      { name: "EHM", value: ehmCount, color: "#3b82f6" },
    ];
  }, [deployments]);

  const statusBarData = useMemo(() => {
    return (["climagro", "ehm"] as ProductId[]).map(product => {
      const productDeps = deployments.filter(d => d.product === product);
      return {
        product: product.toUpperCase(),
        Success: productDeps.filter(d => d.status === "completed").length,
        Failed: productDeps.filter(d => d.status === "failed").length,
        "In Progress": productDeps.filter(d => d.status === "in-progress").length,
      };
    });
  }, [deployments]);

  return (
    <PageLayout>
      {/* ── Enterprise top bar ───────────────────── */}
      <div className="sticky top-0 z-10 h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-6 flex items-center justify-between gap-4 shrink-0">
        <div className="hidden md:flex items-center text-sm text-slate-500 dark:text-slate-400 gap-1">
          <span className="hover:text-slate-900 dark:hover:text-white cursor-pointer transition-colors">Products</span>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="font-medium text-slate-900 dark:text-white">Dashboard</span>
        </div>

        <div className="flex items-center gap-3 ml-auto">
          <div className="relative hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search deployments…"
              className="pl-8 pr-10 py-1.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#3b82f6] focus:bg-white dark:focus:bg-slate-700 transition-all w-52"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-0.5">
              <kbd className="hidden sm:inline-flex items-center rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-1 font-mono text-[10px] text-slate-500 dark:text-slate-400">⌘K</kbd>
            </div>
          </div>
          <button className="relative p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
            <Bell className="w-4.5 h-4.5" />
          </button>
          {!isViewer && (
            <button
              onClick={() => setNewModalOpen(true)}
              disabled={!profile}
              className="bg-slate-900 dark:bg-[#3b82f6] hover:bg-slate-700 dark:hover:bg-blue-600 text-white px-3.5 py-1.5 rounded-md text-sm font-medium transition-colors shadow-sm flex items-center gap-1.5 disabled:opacity-50"
              data-testid="button-new-deployment"
            >
              <Plus className="w-3.5 h-3.5" />
              New Deployment
            </button>
          )}
          {isViewer && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-full">
              <Eye className="w-3 h-3" /> View-only
            </span>
          )}
        </div>
      </div>

      {/* ── Page content ─────────────────────────── */}
      <div
        className="p-6 lg:p-8 max-w-6xl mx-auto space-y-8"
        style={{ fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif' }}
      >
        {/* Page heading */}
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">Overview</h1>
            {roleInfo && (
              <span className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded ${roleInfo.cls}`}>
                {roleInfo.icon}{roleInfo.label}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">Track and manage deployment lifecycles across products.</p>
        </div>

        {/* Viewer notice */}
        {isViewer && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-500 dark:text-slate-400 shadow-sm">
            <Eye className="w-4 h-4 flex-shrink-0 text-slate-400" />
            You have viewer access — you can browse all deployments but cannot start or modify them.
          </div>
        )}

        {/* ── Stats row ──────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Total Deployments"
            value={total}
            trend={thisMonthTotal > 0 ? `${thisMonthTotal} this month` : undefined}
            sub="all time"
            testId="stat-total"
          />
          <StatCard
            label="Completed"
            value={completed.length}
            trend={thisMonthCompleted > 0 ? `${thisMonthCompleted} this month` : undefined}
            sub="across all products"
            testId="stat-completed"
          />
          <StatCard
            label="In Progress"
            value={inProgress.length}
            sub="currently active"
            testId="stat-in-progress"
          />
          <StatCard
            label="Success Rate"
            value={`${successRate}%`}
            trend={successRate >= 90 ? "Above target" : undefined}
            sub="completed vs total"
            testId="stat-success-rate"
          />
        </div>

        {/* ── Visual Analytics Grid ─────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Deployment Trends (Area Chart) */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Deployment Velocity (Last 14 Days)</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={last14DaysData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorClimagro" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorEhm" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-100 dark:stroke-slate-700/50" />
                  <XAxis dataKey="date" className="text-[10px] fill-slate-400 font-mono" tickLine={false} />
                  <YAxis className="text-[10px] fill-slate-400 font-mono" tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(15, 23, 42, 0.9)",
                      borderColor: "rgba(30, 42, 66, 0.8)",
                      borderRadius: "6px",
                      color: "#fff",
                      fontSize: "12px",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                  <Area type="monotone" dataKey="climagro" name="Climagro" stroke="#10b981" fillOpacity={1} fill="url(#colorClimagro)" strokeWidth={2} />
                  <Area type="monotone" dataKey="ehm" name="EHM" stroke="#3b82f6" fillOpacity={1} fill="url(#colorEhm)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Product Distribution (Donut Chart) */}
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-5 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">Product Distribution</h3>
              <p className="text-xs text-slate-400">Total share of runs by product type</p>
            </div>
            <div className="h-44 relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={productShareData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {productShareData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(15, 23, 42, 0.9)",
                      borderColor: "rgba(30, 42, 66, 0.8)",
                      borderRadius: "6px",
                      color: "#fff",
                      fontSize: "12px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-xs text-slate-400">Total</span>
                <span className="text-xl font-bold text-slate-900 dark:text-white">{total}</span>
              </div>
            </div>
            <div className="flex justify-center gap-6 mt-2">
              {productShareData.map(entry => (
                <div key={entry.name} className="flex items-center gap-1.5 text-xs">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span className="text-slate-500 dark:text-slate-400">{entry.name}</span>
                  <span className="font-bold text-slate-700 dark:text-slate-200">({entry.value})</span>
                </div>
              ))}
            </div>
          </div>

          {/* Status Breakdown (Stacked Bar Chart) */}
          <div className="lg:col-span-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Run Status by Product</h3>
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusBarData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barSize={32}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-100 dark:stroke-slate-700/50" />
                  <XAxis dataKey="product" className="text-xs font-semibold fill-slate-500" tickLine={false} />
                  <YAxis className="text-[10px] fill-slate-400 font-mono" tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(15, 23, 42, 0.9)",
                      borderColor: "rgba(30, 42, 66, 0.8)",
                      borderRadius: "6px",
                      color: "#fff",
                      fontSize: "12px",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                  <Bar dataKey="Success" name="Completed" stackId="status" fill="#10b981" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="In Progress" name="In Progress" stackId="status" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Failed" name="Failed" stackId="status" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* ── Active deployments ──────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white tracking-tight">Active Deployments</h2>
            {inProgress.length > 0 && (
              <span className="text-sm font-medium text-[#3b82f6] hover:text-blue-700 cursor-pointer transition-colors">View all</span>
            )}
          </div>

          {inProgress.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 border-dashed shadow-sm">
              <div className="flex flex-col items-center justify-center h-48 text-center px-4">
                <Rocket className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-4" />
                <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300">No active deployments</h3>
                <p className="text-sm text-slate-400 dark:text-slate-500 mt-1 max-w-sm">
                  {isViewer ? "Active deployments will appear here." : "Start a new deployment when you're ready to ship."}
                </p>
                {!isViewer && (
                  <button
                    className="mt-4 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-md hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors shadow-sm"
                    onClick={() => setNewModalOpen(true)}
                    disabled={!profile}
                  >
                    Start Deployment
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {inProgress.map(dep => {
                const preTotal  = totalItems(getPreSections(dep.product));
                const preDone   = checkedCount(getPreSections(dep.product), dep.prePhase.checkedItems);
                const prePct    = preTotal  ? Math.round((preDone  / preTotal)  * 100) : 0;
                const postTotal = totalItems(getPostSections(dep.product));
                const postDone  = checkedCount(getPostSections(dep.product), dep.postPhase.checkedItems);
                const postPct   = postTotal ? Math.round((postDone / postTotal) * 100) : 0;
                const initials  = dep.developerName.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

                return (
                  <div
                    key={dep.id}
                    className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden flex flex-col"
                    data-testid={`card-deployment-${dep.id}`}
                  >
                    {/* Blue left accent */}
                    <div className="absolute top-0 left-0 w-1 h-full bg-[#3b82f6]" />

                    <div className="pl-5 pr-5 pt-5 pb-4">
                      <div className="flex items-start justify-between gap-2 mb-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-slate-900 dark:text-white text-base">{dep.name}</span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                              In Progress
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
                            <span className="font-mono uppercase bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded text-[10px]">{dep.product}</span>
                            <span className="font-mono text-slate-400">{dep.runId || dep.id.split("-")[0].toUpperCase()}</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-slate-400 mt-1.5">
                            <Clock className="w-3 h-3" />
                            Started by {dep.developerName}
                          </div>
                        </div>
                        <button className="p-1 text-slate-300 hover:text-slate-500 dark:hover:text-slate-300 transition-colors flex-shrink-0">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Progress bars */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="flex justify-between text-xs mb-1.5">
                            <span className="font-medium text-slate-700 dark:text-slate-300">Pre-deploy</span>
                            <span className="font-mono text-slate-500">{prePct}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div className="h-full bg-[#3b82f6] rounded-full transition-all duration-500" style={{ width: `${prePct}%` }} />
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-xs mb-1.5">
                            <span className="font-medium text-slate-500 dark:text-slate-400">Post-deploy</span>
                            <span className="font-mono text-slate-400">{postPct}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${postPct}%` }} />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 flex justify-between items-center mt-auto">
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                          style={{ background: "linear-gradient(135deg, #3b82f6, #1e2a42)" }}
                        >
                          {initials}
                        </div>
                        {dep.developerName}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setLocation(`/deployment/${dep.id}`)}
                        data-testid={`button-continue-${dep.id}`}
                        className="h-7 text-xs gap-1 border-slate-200 dark:border-slate-600"
                      >
                        {isViewer ? "View" : "Continue"} <ArrowRight className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent history summary */}
        {completed.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white tracking-tight">Recent History</h2>
              <button
                className="text-sm font-medium text-[#3b82f6] hover:text-blue-700 transition-colors"
                onClick={() => setLocation("/history")}
              >
                View all <TrendingUp className="w-3.5 h-3.5 inline ml-1" />
              </button>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80">
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Release</th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Product</th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Status</th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 hidden sm:table-cell">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {completed.slice(0, 5).map(dep => (
                    <tr
                      key={dep.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer"
                      onClick={() => setLocation(`/deployment/${dep.id}`)}
                    >
                      <td className="px-5 py-3.5 text-sm font-medium text-slate-900 dark:text-white">{dep.name}</td>
                      <td className="px-5 py-3.5">
                        <span className="text-xs font-mono uppercase bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded">{dep.product}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" />Success
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-400 dark:text-slate-500 hidden sm:table-cell">
                        {new Date(dep.updatedAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── New Deployment dialog ─────────────────── */}
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
                  <SelectTrigger data-testid="select-product"><SelectValue /></SelectTrigger>
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
