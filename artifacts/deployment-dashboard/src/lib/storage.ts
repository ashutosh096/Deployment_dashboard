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
  ItemNote,
  RegisteredUser,
} from "../types";

const PREFIX = "deploy_dash_";
const DEFAULT_ADMIN: AdminCredentials = { username: "admin", password: "admin123" };
const MAX_AUDIT_ENTRIES = 2000;

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

/* Normalize a raw deployment from storage to ensure all fields have defaults */
function normalizeDep(raw: Deployment): Deployment {
  return {
    ...raw,
    runId: raw.runId ?? "",
    locked: raw.locked ?? false,
    itemNotes: raw.itemNotes ?? {},
  };
}

/* ─── Run ID ─────────────────────────────────────── */
function nextRunId(): string {
  const year = new Date().getFullYear();
  const counterKey = `run_id_counter:${year}`;
  const current = ls_get<number>(counterKey) ?? 0;
  const next = current + 1;
  ls_set(counterKey, next);
  return `RUN-${year}-${String(next).padStart(4, "0")}`;
}

/* ─── Audit log (append-only) ────────────────────── */
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
  const existing = ls_get<AuditLogEntry[]>("audit:log") ?? [];
  const entry: AuditLogEntry = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    userId: profile?.id ?? "system",
    userName: profile?.name ?? "System",
    userRole: profile?.userRole ?? "developer",
    action,
    details,
    ...extra,
  };
  const updated = [entry, ...existing].slice(0, MAX_AUDIT_ENTRIES);
  ls_set("audit:log", updated);
}

export const storage = {
  /* ─── Profile ─────────────────────────────────── */
  async getProfile(): Promise<DeveloperProfile | null> {
    const p = ls_get<DeveloperProfile>("profile");
    if (!p) return null;
    return { ...p, userRole: p.userRole ?? "developer" };
  },
  async saveProfile(profile: DeveloperProfile): Promise<void> {
    ls_set("profile", profile);
  },

  /* ─── Deployments ─────────────────────────────── */
  async getDeploymentIds(): Promise<string[]> {
    return ls_get<string[]>("deployments:list") ?? [];
  },
  async saveDeploymentIds(ids: string[]): Promise<void> {
    ls_set("deployments:list", ids);
  },
  async getDeployment(id: string): Promise<Deployment | null> {
    const raw = ls_get<Deployment>(`deployment:${id}`);
    return raw ? normalizeDep(raw) : null;
  },
  async saveDeployment(deployment: Deployment): Promise<void> {
    ls_set(`deployment:${deployment.id}`, deployment);
    const ids = await this.getDeploymentIds();
    if (!ids.includes(deployment.id)) {
      await this.saveDeploymentIds([deployment.id, ...ids]);
    }
  },
  async deleteDeployment(id: string): Promise<void> {
    ls_remove(`deployment:${id}`);
    const ids = await this.getDeploymentIds();
    await this.saveDeploymentIds(ids.filter(i => i !== id));
  },
  async getAllDeployments(): Promise<Deployment[]> {
    const ids = await this.getDeploymentIds();
    const deps = await Promise.all(ids.map(id => this.getDeployment(id)));
    return deps.filter(Boolean) as Deployment[];
  },

  /* ─── New deployment helpers ─────────────────── */
  generateRunId(): string {
    return nextRunId();
  },

  /* ─── Audit log ───────────────────────────────── */
  async getAuditLog(): Promise<AuditLogEntry[]> {
    return ls_get<AuditLogEntry[]>("audit:log") ?? [];
  },
  appendAuditLog,

  /* ─── Admin credentials ───────────────────────── */
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

  /* ─── Admin session ───────────────────────────── */
  async isAdminLoggedIn(): Promise<boolean> {
    return ls_get<boolean>("admin:session") === true;
  },
  async setAdminSession(loggedIn: boolean): Promise<void> {
    ls_set("admin:session", loggedIn);
  },

  /* ─── App session (user login) ────────────────── */
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

  /* ─── Registered users (admin-managed) ───────── */
  async getRegisteredUsers(): Promise<RegisteredUser[]> {
    const users = ls_get<RegisteredUser[]>("registered_users");
    if (!users || users.length === 0) {
      const admin: RegisteredUser = {
        id: "default-admin",
        name: "Admin",
        email: "admin@deploydash.local",
        jobTitle: "System Administrator",
        userRole: "admin",
        password: "admin123",
        createdAt: new Date().toISOString(),
      };
      ls_set("registered_users", [admin]);
      return [admin];
    }
    return users;
  },
  async saveRegisteredUsers(users: RegisteredUser[]): Promise<void> {
    ls_set("registered_users", users);
  },
  async addRegisteredUser(user: RegisteredUser): Promise<void> {
    const users = await this.getRegisteredUsers();
    users.push(user);
    ls_set("registered_users", users);
  },
  async updateRegisteredUser(user: RegisteredUser): Promise<void> {
    const users = await this.getRegisteredUsers();
    const idx = users.findIndex(u => u.id === user.id);
    if (idx >= 0) users[idx] = user;
    ls_set("registered_users", users);
  },
  async deleteRegisteredUser(id: string): Promise<void> {
    const users = await this.getRegisteredUsers();
    ls_set("registered_users", users.filter(u => u.id !== id));
  },
  async verifyUserLogin(email: string, password: string): Promise<RegisteredUser | null> {
    const users = await this.getRegisteredUsers();
    return users.find(
      u => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    ) ?? null;
  },
  async findRegisteredUserByEmail(email: string): Promise<RegisteredUser | null> {
    const users = await this.getRegisteredUsers();
    return users.find(u => u.email.toLowerCase() === email.toLowerCase()) ?? null;
  },

  /* ─── Checklist overrides ─────────────────────── */
  async getChecklistOverrides(product: ProductId): Promise<ChecklistSection[] | null> {
    return ls_get<ChecklistSection[]>(`checklist:overrides:${product}`);
  },
  async saveChecklistOverrides(product: ProductId, sections: ChecklistSection[]): Promise<void> {
    ls_set(`checklist:overrides:${product}`, sections);
  },
  async resetChecklistOverrides(product: ProductId): Promise<void> {
    ls_remove(`checklist:overrides:${product}`);
  },

  /* ─── Developer assignments ───────────────────── */
  async getDeveloperAssignments(): Promise<DeveloperAssignment[]> {
    return ls_get<DeveloperAssignment[]>("admin:assignments") ?? [];
  },
  async saveDeveloperAssignments(assignments: DeveloperAssignment[]): Promise<void> {
    ls_set("admin:assignments", assignments);
  },
  async upsertDeveloperAssignment(assignment: DeveloperAssignment): Promise<void> {
    const all = await this.getDeveloperAssignments();
    const idx = all.findIndex(a => a.developerId === assignment.developerId);
    if (idx >= 0) all[idx] = assignment; else all.push(assignment);
    ls_set("admin:assignments", all);
  },

  /* ─── User roles (admin-managed) ─────────────── */
  async getUserRoles(): Promise<Record<string, UserRole>> {
    return ls_get<Record<string, UserRole>>("admin:user_roles") ?? {};
  },
  async setUserRole(userId: string, role: UserRole): Promise<void> {
    const roles = await this.getUserRoles();
    roles[userId] = role;
    ls_set("admin:user_roles", roles);
    // Persist to local profile if it's the same user
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
