import type {
  Deployment,
  DeveloperProfile,
  AdminCredentials,
  DeveloperAssignment,
  ChecklistSection,
  ProductId,
  AuditLogEntry,
  AuditAction,
  UserRole,
  RegisteredUser,
} from "../types";

const PREFIX = "deploy_dash_";
const DEFAULT_ADMIN: AdminCredentials = { username: "admin", password: "admin123" };
const apiBase = import.meta.env.VITE_API_URL ?? "";

function ls_get<T>(key: string): T | null {
  try {
    const val = localStorage.getItem(PREFIX + key);
    return val ? (JSON.parse(val) as T) : null;
  } catch { return null; }
}
function ls_set<T>(key: string, value: T): void {
  localStorage.setItem(PREFIX + key, JSON.stringify(value));
}
function ls_remove(key: string): void {
  localStorage.removeItem(PREFIX + key);
}

/* ─── Run ID Generator (Local fallbacks if server has clock skew) ─────────────────── */
function nextRunId(): string {
  const year = new Date().getFullYear();
  const counterKey = `run_id_counter:${year}`;
  const current = ls_get<number>(counterKey) ?? 0;
  const next = current + 1;
  ls_set(counterKey, next);
  return `RUN-${year}-${String(next).padStart(4, "0")}`;
}

/* ─── Audit log (Backend-backed) ────────────────── */
export function appendAuditLog(
  profile: DeveloperProfile | null,
  action: AuditAction,
  details: string,
  extra?: {
    deploymentId?: string;
    deploymentRunId?: string;
    deploymentName?: string;
    product?: ProductId;
  }
): void {
  const entry = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    userId: profile?.id ?? "system",
    userName: profile?.name ?? "System",
    userRole: profile?.userRole ?? "developer",
    action,
    details,
    ...extra,
  };
  fetch(`${apiBase}/api/audit-logs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(entry),
  }).catch(err => console.error("Failed to append audit log", err));
}

export const storage = {
  /* ─── Profile (Stored locally in the browser context) ──────────────── */
  async getProfile(): Promise<DeveloperProfile | null> {
    const p = ls_get<DeveloperProfile>("profile");
    if (!p) return null;
    return { ...p, userRole: p.userRole ?? "developer" };
  },
  async saveProfile(profile: DeveloperProfile): Promise<void> {
    ls_set("profile", profile);
  },

  /* ─── Deployments (Backend persistence) ─────────────────────── */
  async getDeploymentIds(): Promise<string[]> {
    const list = await this.getAllDeployments();
    return list.map(d => d.id);
  },
  async saveDeploymentIds(ids: string[]): Promise<void> {
    // Implicitly handled by backend insertion/deletion
  },
  async getDeployment(id: string): Promise<Deployment | null> {
    const res = await fetch(`${apiBase}/api/deployments/${id}`);
    if (!res.ok) return null;
    return res.json();
  },
  async saveDeployment(deployment: Deployment): Promise<void> {
    const res = await fetch(`${apiBase}/api/deployments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(deployment),
    });
    if (!res.ok) {
      // Try updating if it already exists
      const updateRes = await fetch(`${apiBase}/api/deployments/${deployment.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(deployment),
      });
      if (!updateRes.ok) throw new Error("Failed to save deployment");
    }
  },
  async deleteDeployment(id: string): Promise<void> {
    const res = await fetch(`${apiBase}/api/deployments/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete deployment");
  },
  async getAllDeployments(): Promise<Deployment[]> {
    const res = await fetch(`${apiBase}/api/deployments`);
    if (!res.ok) throw new Error("Failed to fetch deployments");
    return res.json();
  },

  /* ─── New deployment helpers ─────────────────── */
  generateRunId(): string {
    return nextRunId();
  },

  /* ─── Audit log (Backend persistence) ────────────────────────── */
  async getAuditLog(): Promise<AuditLogEntry[]> {
    const res = await fetch(`${apiBase}/api/audit-logs`);
    if (!res.ok) throw new Error("Failed to fetch audit logs");
    return res.json();
  },
  appendAuditLog,

  /* ─── Admin credentials (Fallback) ───────────────────────── */
  async getAdminCredentials(): Promise<AdminCredentials> {
    return ls_get<AdminCredentials>("admin:credentials") ?? DEFAULT_ADMIN;
  },
  async saveAdminCredentials(creds: AdminCredentials): Promise<void> {
    ls_set("admin:credentials", creds);
  },
  async verifyAdminLogin(username: string, password: string): Promise<boolean> {
    const creds = await this.getAdminCredentials();
    return creds.username === username && creds.password === password;
  },

  /* ─── Admin session (Stored locally in local session storage) ──── */
  async isAdminLoggedIn(): Promise<boolean> {
    return ls_get<boolean>("admin:session") === true;
  },
  async setAdminSession(loggedIn: boolean): Promise<void> {
    ls_set("admin:session", loggedIn);
  },

  /* ─── App session (User login - stored locally to identify browser context) ──── */
  async getAppSession(): Promise<DeveloperProfile | null> {
    return ls_get<DeveloperProfile>("app:session") ?? null;
  },
  async saveAppSession(profile: DeveloperProfile): Promise<void> {
    ls_set("app:session", profile);
    ls_set("profile", profile);
  },
  async clearAppSession(): Promise<void> {
    ls_remove("app:session");
  },

  /* ─── Registered users (Backend persistence) ─────────────────── */
  async getRegisteredUsers(): Promise<RegisteredUser[]> {
    const res = await fetch(`${apiBase}/api/users`);
    if (!res.ok) throw new Error("Failed to fetch registered users");
    return res.json();
  },
  async saveRegisteredUsers(users: RegisteredUser[]): Promise<void> {
    // Handled individually through API
  },
  async addRegisteredUser(user: RegisteredUser): Promise<void> {
    const res = await fetch(`${apiBase}/api/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(user),
    });
    if (!res.ok) throw new Error("Failed to add registered user");
  },
  async updateRegisteredUser(user: RegisteredUser): Promise<void> {
    const res = await fetch(`${apiBase}/api/users/${user.id}/role`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userRole: user.userRole }),
    });
    if (!res.ok) throw new Error("Failed to update registered user");
  },
  async deleteRegisteredUser(id: string): Promise<void> {
    const res = await fetch(`${apiBase}/api/users/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete registered user");
  },
  async verifyUserLogin(email: string, password: string): Promise<RegisteredUser | null> {
    const res = await fetch(`${apiBase}/api/users/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) return null;
    return res.json();
  },
  async findRegisteredUserByEmail(email: string): Promise<RegisteredUser | null> {
    const users = await this.getRegisteredUsers();
    return users.find(u => u.email.toLowerCase() === email.toLowerCase()) ?? null;
  },

  /* ─── Checklist overrides (Backend persistence) ───────────────── */
  async getChecklistOverrides(product: ProductId): Promise<ChecklistSection[] | null> {
    const res = await fetch(`${apiBase}/api/checklists/overrides/${product}`);
    if (!res.ok) return null;
    return res.json();
  },
  async saveChecklistOverrides(product: ProductId, sections: ChecklistSection[]): Promise<void> {
    const res = await fetch(`${apiBase}/api/checklists/overrides/${product}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sections }),
    });
    if (!res.ok) throw new Error("Failed to save checklist overrides");
  },
  async resetChecklistOverrides(product: ProductId): Promise<void> {
    const res = await fetch(`${apiBase}/api/checklists/overrides/${product}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to reset checklist overrides");
  },

  /* ─── Developer assignments (Backend persistence) ─────────────── */
  async getDeveloperAssignments(): Promise<DeveloperAssignment[]> {
    const res = await fetch(`${apiBase}/api/assignments`);
    if (!res.ok) throw new Error("Failed to fetch developer assignments");
    return res.json();
  },
  async saveDeveloperAssignments(assignments: DeveloperAssignment[]): Promise<void> {
    await Promise.all(assignments.map(a => this.upsertDeveloperAssignment(a)));
  },
  async upsertDeveloperAssignment(assignment: DeveloperAssignment): Promise<void> {
    const res = await fetch(`${apiBase}/api/assignments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(assignment),
    });
    if (!res.ok) throw new Error("Failed to save developer assignment");
  },

  /* ─── User roles (Admin-managed backend roles) ─────────────────── */
  async getUserRoles(): Promise<Record<string, UserRole>> {
    const users = await this.getRegisteredUsers();
    const roles: Record<string, UserRole> = {};
    users.forEach(u => {
      roles[u.id] = u.userRole;
    });
    return roles;
  },
  async setUserRole(userId: string, role: UserRole): Promise<void> {
    const res = await fetch(`${apiBase}/api/users/${userId}/role`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userRole: role }),
    });
    if (!res.ok) throw new Error("Failed to update user role");

    const profile = await this.getProfile();
    if (profile?.id === userId) {
      await this.saveProfile({ ...profile, userRole: role });
    }
  },
  async getEffectiveRole(userId: string, profileRole: UserRole): Promise<UserRole> {
    const roles = await this.getUserRoles();
    return roles[userId] ?? profileRole;
  },

  /* ─── Known developers from history ──────────── */
  async getAllKnownDevelopers(): Promise<{ id: string; name: string; initials: string }[]> {
    const deployments = await this.getAllDeployments();
    const map = new Map<string, { id: string; name: string; initials: string }>();
    deployments.forEach(d => {
      if (!map.has(d.developerId)) {
        const initials = d.developerName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
        map.set(d.developerId, { id: d.developerId, name: d.developerName, initials });
      }
    });
    return Array.from(map.values());
  },
};
