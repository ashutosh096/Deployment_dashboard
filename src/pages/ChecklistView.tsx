import { useState, useEffect } from "react";
import { useLocation, useParams, useSearch } from "wouter";
import { storage, appendAuditLog } from "@/lib/storage";
import type { Deployment, DeploymentPhaseState, ChecklistSection, DeveloperProfile, ItemNote } from "@/types";
import PageLayout from "@/components/PageLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getPreSections, getPostSections, totalItems, checkedCount } from "@/data/checklists";
import {
  ChevronDown, CheckCircle2, ArrowLeft, FileDown, XCircle, AlertTriangle,
  ShieldAlert, ShieldCheck, Lock, MessageSquarePlus, MessageSquare, Eye,
  AlertCircle, Trash2,
} from "lucide-react";
import { generateDeploymentReport } from "@/lib/export";
import { formatDistanceToNow, format } from "date-fns";

export default function ChecklistView() {
  const params = useParams();
  const id = params.id;
  const [, setLocation] = useLocation();
  const search = useSearch();
  const isAdminMode = new URLSearchParams(search).get("admin") === "1";

  const [profile, setProfile] = useState<DeveloperProfile | null>(null);
  const [deployment, setDeployment] = useState<Deployment | null>(null);
  const [activeTab, setActiveTab] = useState("pre");
  const [failDialogOpen, setFailDialogOpen] = useState(false);
  const [failureReason, setFailureReason] = useState("");
  const [criticalOnly, setCriticalOnly] = useState(false);

  // Notes state
  const [noteTarget, setNoteTarget] = useState<{ itemId: string; title: string } | null>(null);
  const [noteContent, setNoteContent] = useState("");
  const [noteIsError, setNoteIsError] = useState(false);

  useEffect(() => {
    storage.getProfile().then(setProfile);
    if (id) storage.getDeployment(id).then(setDeployment);
  }, [id]);

  if (!deployment) return null;

  const isViewer = !isAdminMode && profile?.userRole === "viewer";
  const isLocked = deployment.locked;

  // Effective read-only:
  // - locked deployments (even admin can't modify)
  // - viewer role
  // - completed/failed deployments for non-admin
  const isReadOnly = isLocked || isViewer || (!isAdminMode && deployment.status !== "in-progress");

  const preSections = getPreSections(deployment.product);
  const postSections = getPostSections(deployment.product);

  const handleCheck = async (phase: "pre" | "post", itemId: string, checked: boolean) => {
    if (isReadOnly) return;
    const newDep = {
      ...deployment,
      updatedAt: new Date().toISOString(),
    };
    const targetPhase = phase === "pre" ? newDep.prePhase : newDep.postPhase;
    targetPhase.checkedItems = { ...targetPhase.checkedItems, [itemId]: checked };
    setDeployment(newDep);
    await storage.saveDeployment(newDep);
    appendAuditLog(profile, checked ? "item_checked" : "item_unchecked",
      `${checked ? "Checked" : "Unchecked"} item in ${phase}-deployment phase`,
      { deploymentId: deployment.id, deploymentRunId: deployment.runId, deploymentName: deployment.name, product: deployment.product }
    );
  };

  const handleMarkComplete = async (phase: "pre" | "post") => {
    if (isReadOnly) return;
    const newDep = { ...deployment };
    const targetPhase = phase === "pre" ? newDep.prePhase : newDep.postPhase;
    targetPhase.completed = true;
    targetPhase.completedAt = new Date().toISOString();
    newDep.updatedAt = new Date().toISOString();
    if (newDep.prePhase.completed && newDep.postPhase.completed) {
      newDep.status = "completed";
      newDep.locked = true;
    }
    setDeployment(newDep);
    await storage.saveDeployment(newDep);
    if (newDep.status === "completed") {
      appendAuditLog(profile, "deployment_completed",
        `Deployment "${deployment.name}" marked complete and locked`,
        { deploymentId: deployment.id, deploymentRunId: deployment.runId, deploymentName: deployment.name, product: deployment.product }
      );
    }
    if (phase === "pre" && !newDep.postPhase.completed) setActiveTab("post");
  };

  const handleMarkFailed = async () => {
    if (isReadOnly) return;
    const newDep: Deployment = {
      ...deployment,
      status: "failed",
      failedAt: new Date().toISOString(),
      failureReason: failureReason.trim() || undefined,
      updatedAt: new Date().toISOString(),
      locked: true,
    };
    await storage.saveDeployment(newDep);
    appendAuditLog(profile, "deployment_failed",
      `Deployment "${deployment.name}" marked failed${failureReason ? `: ${failureReason}` : ""}`,
      { deploymentId: deployment.id, deploymentRunId: deployment.runId, deploymentName: deployment.name, product: deployment.product }
    );
    setDeployment(newDep);
    setFailDialogOpen(false);
    setFailureReason("");
  };

  const handleAddNote = async () => {
    if (!noteTarget || !noteContent.trim() || !profile) return;
    const note: ItemNote = {
      id: crypto.randomUUID(),
      authorId: profile.id,
      authorName: profile.name,
      content: noteContent.trim(),
      isErrorLog: noteIsError,
      createdAt: new Date().toISOString(),
    };
    const existing = deployment.itemNotes?.[noteTarget.itemId] ?? [];
    const newDep = {
      ...deployment,
      itemNotes: { ...deployment.itemNotes, [noteTarget.itemId]: [...existing, note] },
      updatedAt: new Date().toISOString(),
    };
    await storage.saveDeployment(newDep);
    appendAuditLog(profile, "note_added",
      `Added ${noteIsError ? "error log" : "note"} to checklist item "${noteTarget.title}"`,
      { deploymentId: deployment.id, deploymentRunId: deployment.runId, deploymentName: deployment.name, product: deployment.product }
    );
    setDeployment(newDep);
    setNoteTarget(null);
    setNoteContent("");
    setNoteIsError(false);
  };

  const handleDeleteNote = async (itemId: string, noteId: string) => {
    const existing = deployment.itemNotes?.[itemId] ?? [];
    const newDep = {
      ...deployment,
      itemNotes: { ...deployment.itemNotes, [itemId]: existing.filter(n => n.id !== noteId) },
    };
    await storage.saveDeployment(newDep);
    setDeployment(newDep);
  };

  const renderSection = (section: ChecklistSection, phase: "pre" | "post", phaseState: DeploymentPhaseState) => {
    const allItems = section.items;
    const visibleItems = criticalOnly ? allItems.filter(i => i.critical) : allItems;
    if (criticalOnly && visibleItems.length === 0) return null;

    const total = allItems.length;
    const done = allItems.filter(i => phaseState.checkedItems[i.id]).length;
    const pct = Math.round((done / total) * 100);

    return (
      <Collapsible key={section.id} defaultOpen className="mb-4 bg-card border rounded-lg shadow-sm">
        <CollapsibleTrigger className="w-full flex items-center justify-between p-4 bg-muted/30 hover:bg-muted/50 transition-colors group">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full shadow-sm flex-shrink-0" style={{ backgroundColor: section.color }} />
            <span className="font-semibold text-foreground group-hover:text-primary transition-colors text-left">{section.title}</span>
            {criticalOnly && (
              <span className="text-[10px] font-bold text-red-500 bg-red-50 border border-red-100 px-1.5 py-0.5 rounded dark:bg-red-950 dark:border-red-800">
                {visibleItems.length} critical
              </span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-mono text-xs">{done}/{total}</span>
              <div className="w-24 h-2 bg-secondary rounded-full overflow-hidden">
                <div className="h-full transition-all duration-500 ease-out" style={{ width: `${pct}%`, backgroundColor: section.color }} />
              </div>
            </div>
            <ChevronDown className="w-4 h-4 text-muted-foreground group-data-[state=open]:rotate-180 transition-transform flex-shrink-0" />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="divide-y">
            {visibleItems.map(item => {
              const isChecked = phaseState.checkedItems[item.id] || false;
              const notes = deployment.itemNotes?.[item.id] ?? [];
              return (
                <div key={item.id} className={`p-4 transition-colors duration-200 ${isChecked ? "bg-emerald-50/20 dark:bg-emerald-950/10" : ""}`}>
                  <div className="flex gap-4">
                    <Checkbox
                      id={item.id}
                      checked={isChecked}
                      disabled={isReadOnly}
                      onCheckedChange={checked => handleCheck(phase, item.id, checked as boolean)}
                      className="mt-1 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <label
                          htmlFor={item.id}
                          className={`text-sm font-medium leading-tight cursor-pointer transition-all ${isChecked ? "line-through text-muted-foreground/80" : "text-foreground"}`}
                        >
                          {item.title}
                        </label>
                        {/* Note button */}
                        {!isViewer && (
                          <button
                            onClick={() => setNoteTarget({ itemId: item.id, title: item.title })}
                            className={`flex-shrink-0 flex items-center gap-1 text-xs px-1.5 py-0.5 rounded transition-colors ${
                              notes.length > 0
                                ? "bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-950 dark:text-amber-300"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            }`}
                            title="Add / view notes"
                          >
                            {notes.length > 0
                              ? <><MessageSquare className="w-3.5 h-3.5" /><span className="font-medium">{notes.length}</span></>
                              : <MessageSquarePlus className="w-3.5 h-3.5" />
                            }
                          </button>
                        )}
                        {isViewer && notes.length > 0 && (
                          <span className="flex-shrink-0 flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                            <MessageSquare className="w-3.5 h-3.5" />
                            {notes.length}
                          </span>
                        )}
                      </div>
                      <p className={`text-sm leading-relaxed mt-0.5 ${isChecked ? "text-muted-foreground/50" : "text-muted-foreground"}`}>
                        {item.description}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {item.critical && <Badge className="bg-[#fee2e2] text-[#dc2626] hover:bg-[#fee2e2] border-transparent text-[10px] font-bold tracking-wider dark:bg-red-950 dark:text-red-300">CRITICAL</Badge>}
                        {item.devRequired && <Badge className="bg-[#dbeafe] text-[#2563eb] hover:bg-[#dbeafe] border-transparent text-[10px] font-bold tracking-wider dark:bg-blue-950 dark:text-blue-300">DEV REQUIRED</Badge>}
                        {item.clientVerify && <Badge className="bg-[#fef3c7] text-[#d97706] hover:bg-[#fef3c7] border-transparent text-[10px] font-bold tracking-wider dark:bg-amber-950 dark:text-amber-300">CLIENT TO VERIFY</Badge>}
                      </div>

                      {/* Inline notes preview */}
                      {notes.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {notes.map(note => (
                            <div
                              key={note.id}
                              className={`relative group/note text-xs rounded-md px-3 py-2 border ${
                                note.isErrorLog
                                  ? "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800"
                                  : "bg-muted/40 border-border"
                              }`}
                            >
                              <div className="flex items-center gap-1.5 mb-1">
                                {note.isErrorLog && <AlertCircle className="w-3 h-3 text-red-500 flex-shrink-0" />}
                                <span className={`font-semibold ${note.isErrorLog ? "text-red-700 dark:text-red-400" : "text-foreground"}`}>
                                  {note.isErrorLog ? "Error Log" : "Note"}
                                </span>
                                <span className="text-muted-foreground">·</span>
                                <span className="text-muted-foreground">{note.authorName}</span>
                                <span className="text-muted-foreground">·</span>
                                <span className="text-muted-foreground">{formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}</span>
                                {!isViewer && !isLocked && (
                                  <button
                                    onClick={() => handleDeleteNote(item.id, note.id)}
                                    className="ml-auto opacity-0 group-hover/note:opacity-100 transition-opacity text-muted-foreground hover:text-destructive p-0.5 rounded"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                              <p className={`whitespace-pre-wrap leading-relaxed ${note.isErrorLog ? "text-red-800 dark:text-red-300 font-mono text-[10px]" : "text-foreground/80"}`}>
                                {note.content}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  };

  const preTotal = totalItems(preSections);
  const preDone  = checkedCount(preSections, deployment.prePhase.checkedItems);
  const prePct   = preTotal ? Math.round((preDone / preTotal) * 100) : 0;
  const postTotal = totalItems(postSections);
  const postDone  = checkedCount(postSections, deployment.postPhase.checkedItems);
  const postPct   = postTotal ? Math.round((postDone / postTotal) * 100) : 0;

  const runLabel = deployment.runId || deployment.id.split("-")[0].toUpperCase();

  return (
    <PageLayout>
      <div className="flex flex-col h-full min-h-screen">

        {/* Admin override banner */}
        {isAdminMode && (
          <div className="bg-amber-500 text-white px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4 text-sm font-medium">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 flex-shrink-0" />
              <span>Admin mode — viewing <strong>{deployment.developerName}</strong>'s checklist.</span>
            </div>
            <button onClick={() => setLocation("/admin")} className="text-white/80 hover:text-white text-xs underline underline-offset-2 flex-shrink-0">
              Back to Admin Panel
            </button>
          </div>
        )}

        {/* Viewer banner */}
        {isViewer && !isAdminMode && (
          <div className="bg-secondary text-muted-foreground px-4 sm:px-6 py-2.5 flex items-center gap-2 text-sm border-b border-border">
            <Eye className="w-4 h-4 flex-shrink-0" />
            <span>View-only access — you can read notes and progress but cannot modify this deployment.</span>
          </div>
        )}

        {/* Locked banner */}
        {isLocked && !isViewer && (
          <div className="bg-muted/60 text-muted-foreground px-4 sm:px-6 py-2.5 flex items-center gap-2 text-sm border-b border-border">
            <Lock className="w-4 h-4 flex-shrink-0" />
            <span>This deployment record is <strong>locked</strong> and immutable. The audit trail is preserved.</span>
          </div>
        )}

        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10 px-4 sm:px-8 py-4 sm:py-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-start gap-3 sm:gap-4">
            <Button variant="ghost" size="icon" onClick={() => setLocation(isAdminMode ? "/admin" : "/")} className="mt-0.5 flex-shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <Badge variant="outline" className="uppercase font-mono text-[10px] font-bold tracking-wider">{deployment.product}</Badge>
                <Badge variant="secondary" className="font-mono text-[10px] text-muted-foreground">{runLabel}</Badge>
                {isLocked && (
                  <Badge variant="outline" className="gap-1 text-muted-foreground border-muted-foreground/30">
                    <Lock className="w-3 h-3" /> Locked
                  </Badge>
                )}
                {deployment.status === "completed" && (
                  <Badge className="bg-emerald-100 text-emerald-800 border-transparent dark:bg-emerald-950 dark:text-emerald-300">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Completed
                  </Badge>
                )}
                {deployment.status === "failed" && (
                  <Badge className="bg-red-100 text-red-700 border-transparent dark:bg-red-950 dark:text-red-300">
                    <XCircle className="w-3 h-3 mr-1" /> Failed
                  </Badge>
                )}
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">{deployment.name}</h1>
              <p className="text-sm text-muted-foreground mt-1">Started by {deployment.developerName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant={criticalOnly ? "default" : "outline"}
              onClick={() => setCriticalOnly(v => !v)}
              size="sm"
              className={criticalOnly ? "bg-red-600 hover:bg-red-700 text-white border-transparent" : "border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300"}
              data-testid="button-critical-only"
            >
              <ShieldAlert className="w-4 h-4 mr-1.5" />
              Critical only
            </Button>
            <Button variant="outline" size="sm" onClick={() => generateDeploymentReport(deployment)} data-testid="button-export-report">
              <FileDown className="w-4 h-4 mr-1.5" />
              Export
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation(isAdminMode ? "/admin" : "/")}
              data-testid="button-save-exit"
              className={isAdminMode ? "border-amber-300 text-amber-700 hover:bg-amber-50" : ""}
            >
              {isAdminMode ? "Return to Admin" : "Save & Exit"}
            </Button>
            {!isReadOnly && (
              <>
                {activeTab === "pre" && !deployment.prePhase.completed && (
                  <Button
                    size="sm"
                    onClick={() => handleMarkComplete("pre")}
                    className="bg-slate-800 hover:bg-slate-900 text-white border-transparent"
                    data-testid="button-complete-pre"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1.5" /> Mark Pre Complete
                  </Button>
                )}
                {activeTab === "post" && !deployment.postPhase.completed && (
                  <Button
                    size="sm"
                    onClick={() => handleMarkComplete("post")}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white border-transparent"
                    data-testid="button-complete-post"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1.5" /> Mark Post Complete
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFailDialogOpen(true)}
                  className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
                  data-testid="button-mark-failed"
                >
                  <XCircle className="w-4 h-4 mr-1.5" />
                  Mark Failed
                </Button>
              </>
            )}
          </div>
        </header>

        {/* Failure reason banner */}
        {deployment.status === "failed" && (
          <div className="border-b border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900 px-4 sm:px-8 py-3 flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                Deployment failed
                {deployment.failedAt && (
                  <span className="font-normal text-red-500 ml-2">
                    — {format(new Date(deployment.failedAt), "d MMM yyyy HH:mm")}
                  </span>
                )}
              </p>
              {deployment.failureReason && (
                <p className="text-sm text-red-600 dark:text-red-400 mt-0.5">{deployment.failureReason}</p>
              )}
            </div>
          </div>
        )}

        <div className="flex-1 p-4 sm:p-8 max-w-4xl mx-auto w-full">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full h-auto mb-8 bg-muted/50 p-1">
              <TabsTrigger value="pre" className="flex-1 py-3 data-[state=active]:shadow-sm">
                <div className="flex flex-col items-center gap-2 w-full">
                  <div className="flex items-center gap-2 font-semibold text-sm">
                    Pre-Deployment {deployment.prePhase.completed && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                  </div>
                  <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-slate-500 rounded-full transition-all duration-500" style={{ width: `${prePct}%` }} />
                  </div>
                </div>
              </TabsTrigger>
              <TabsTrigger value="post" className="flex-1 py-3 data-[state=active]:shadow-sm">
                <div className="flex flex-col items-center gap-2 w-full">
                  <div className="flex items-center gap-2 font-semibold text-sm">
                    Post-Deployment {deployment.postPhase.completed && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                  </div>
                  <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${postPct}%` }} />
                  </div>
                </div>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pre" className="space-y-4 outline-none animate-in fade-in-50 duration-300">
              {preSections.map(s => renderSection(s, "pre", deployment.prePhase))}
            </TabsContent>
            <TabsContent value="post" className="space-y-4 outline-none animate-in fade-in-50 duration-300">
              {postSections.map(s => renderSection(s, "post", deployment.postPhase))}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Mark as Failed dialog */}
      <Dialog open={failDialogOpen} onOpenChange={open => { setFailDialogOpen(open); if (!open) setFailureReason(""); }}>
        <DialogContent className="sm:max-w-md" data-testid="modal-mark-failed">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <XCircle className="w-4 h-4 text-red-600" />
              </div>
              <DialogTitle className="text-red-700">Mark Deployment as Failed</DialogTitle>
            </div>
            <DialogDescription>
              This will close and lock the deployment record permanently.
            </DialogDescription>
          </DialogHeader>
          <div className="py-3 space-y-3">
            <div className="rounded-lg border border-red-100 bg-red-50/60 dark:bg-red-950/20 dark:border-red-900 px-4 py-3 text-sm text-red-600">
              <span className="font-semibold">{deployment.name}</span>
              <span className="text-red-400 font-mono ml-2 text-xs">{runLabel}</span>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="failure-reason">Reason <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Textarea
                id="failure-reason"
                value={failureReason}
                onChange={e => setFailureReason(e.target.value)}
                placeholder="Describe what went wrong..."
                className="resize-none h-24 text-sm"
                data-testid="textarea-failure-reason"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setFailDialogOpen(false); setFailureReason(""); }} data-testid="button-cancel-fail">
              Cancel
            </Button>
            <Button onClick={handleMarkFailed} className="bg-red-600 hover:bg-red-700 text-white" data-testid="button-confirm-fail">
              <XCircle className="w-4 h-4 mr-2" /> Mark as Failed
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Note dialog */}
      {noteTarget && (
        <Dialog open onOpenChange={() => { setNoteTarget(null); setNoteContent(""); setNoteIsError(false); }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MessageSquarePlus className="w-4 h-4" />
                Add Note
              </DialogTitle>
              <DialogDescription className="text-sm font-medium text-foreground/80 mt-1 line-clamp-2">
                {noteTarget.title}
              </DialogDescription>
            </DialogHeader>

            {/* Show existing notes */}
            {(deployment.itemNotes?.[noteTarget.itemId] ?? []).length > 0 && (
              <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-2">
                {(deployment.itemNotes[noteTarget.itemId]).map(note => (
                  <div key={note.id} className={`text-xs rounded px-2 py-1.5 ${note.isErrorLog ? "bg-red-50 text-red-800 dark:bg-red-950/30 dark:text-red-300 border border-red-200 dark:border-red-800" : "bg-muted/50 text-foreground/80"}`}>
                    <div className="flex items-center gap-1 mb-0.5 text-muted-foreground">
                      {note.isErrorLog && <AlertCircle className="w-3 h-3 text-red-500" />}
                      <span className="font-medium">{note.authorName}</span>
                      <span>·</span>
                      <span>{formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}</span>
                    </div>
                    <p className="whitespace-pre-wrap">{note.content}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <Label>New note</Label>
                <div className="flex items-center gap-2">
                  <Switch checked={noteIsError} onCheckedChange={setNoteIsError} id="note-is-error" />
                  <Label htmlFor="note-is-error" className={`text-sm cursor-pointer ${noteIsError ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}`}>
                    Error log
                  </Label>
                </div>
              </div>
              <Textarea
                value={noteContent}
                onChange={e => setNoteContent(e.target.value)}
                placeholder={noteIsError ? "Paste error output or describe the failure..." : "Add context, observations, or instructions..."}
                rows={4}
                className={noteIsError ? "font-mono text-sm border-red-200 dark:border-red-800" : "text-sm"}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setNoteTarget(null); setNoteContent(""); setNoteIsError(false); }}>Cancel</Button>
              <Button onClick={handleAddNote} disabled={!noteContent.trim()}>
                <MessageSquarePlus className="w-4 h-4 mr-2" /> Add Note
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </PageLayout>
  );
}
