import { pgTable, text, boolean, jsonb } from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").unique().notNull(),
  jobTitle: text("job_title").notNull(),
  userRole: text("user_role").notNull(),
  password: text("password").notNull(),
  createdAt: text("created_at").notNull(),
  invitedByName: text("invited_by_name"),
});

export const deploymentsTable = pgTable("deployments", {
  id: text("id").primaryKey(),
  runId: text("run_id").unique().notNull(),
  product: text("product").notNull(),
  name: text("name").notNull(),
  developerId: text("developer_id").notNull(),
  developerName: text("developer_name").notNull(),
  startedAt: text("started_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  status: text("status").notNull(),
  prePhase: jsonb("pre_phase").notNull(),
  postPhase: jsonb("post_phase").notNull(),
  notes: text("notes"),
  failedAt: text("failed_at"),
  failureReason: text("failure_reason"),
  locked: boolean("locked").notNull().default(false),
  itemNotes: jsonb("item_notes").notNull(),
});

export const auditLogsTable = pgTable("audit_logs", {
  id: text("id").primaryKey(),
  timestamp: text("timestamp").notNull(),
  userId: text("user_id").notNull(),
  userName: text("user_name").notNull(),
  userRole: text("user_role").notNull(),
  action: text("action").notNull(),
  details: text("details").notNull(),
  deploymentId: text("deployment_id"),
  deploymentRunId: text("deployment_run_id"),
  deploymentName: text("deployment_name"),
  product: text("product"),
});

export const checklistOverridesTable = pgTable("checklist_overrides", {
  product: text("product").primaryKey(),
  sections: jsonb("sections").notNull(),
});

export const developerAssignmentsTable = pgTable("developer_assignments", {
  developerId: text("developer_id").primaryKey(),
  developerName: text("developer_name").notNull(),
  products: jsonb("products").notNull(),
});