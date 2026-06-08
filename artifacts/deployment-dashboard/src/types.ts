export type ProductId = "climagro" | "ehm";

export type UserRole = "admin" | "developer" | "viewer";

export type AuditAction =
  | "deployment_started"
  | "deployment_completed"
  | "deployment_failed"
  | "deployment_locked"
  | "item_checked"
  | "item_unchecked"
  | "note_added"
  | "checklist_template_edited"
  | "checklist_template_reset"
  | "developer_assigned"
  | "user_role_changed"
  | "admin_login"
  | "admin_logout"
  | "user_invited"
  | "user_created"
  | "user_deleted";

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: AuditAction;
  details: string;
  deploymentId?: string;
  deploymentRunId?: string;
  deploymentName?: string;
  product?: ProductId;
}

export interface ItemNote {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  isErrorLog: boolean;
  createdAt: string;
}

export type BadgeType = "critical" | "dev" | "client";

export interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  critical?: boolean;
  devRequired?: boolean;
  clientVerify?: boolean;
}

export interface ChecklistSection {
  id: string;
  title: string;
  color: string;
  items: ChecklistItem[];
  phase: "pre" | "post";
}

export interface DeploymentPhaseState {
  checkedItems: Record<string, boolean>;
  completed: boolean;
  completedAt?: string;
}

export type DeploymentStatus = "in-progress" | "completed" | "failed";

export interface Deployment {
  id: string;
  runId: string;
  product: ProductId;
  name: string;
  developerId: string;
  developerName: string;
  startedAt: string;
  updatedAt: string;
  status: DeploymentStatus;
  prePhase: DeploymentPhaseState;
  postPhase: DeploymentPhaseState;
  notes?: string;
  failedAt?: string;
  failureReason?: string;
  locked: boolean;
  itemNotes: Record<string, ItemNote[]>;
}

export interface DeveloperProfile {
  id: string;
  name: string;
  role: string;
  email: string;
  avatarInitials: string;
  userRole: UserRole;
}

export interface AdminCredentials {
  username: string;
  password: string;
}

export interface DeveloperAssignment {
  developerId: string;
  developerName: string;
  products: ProductId[];
}

export interface ChecklistOverrides {
  climagro: ChecklistSection[] | null;
  ehm: ChecklistSection[] | null;
}

export interface RegisteredUser {
  id: string;
  name: string;
  email: string;
  jobTitle: string;
  userRole: UserRole;
  password: string;
  createdAt: string;
  invitedByName?: string;
}
