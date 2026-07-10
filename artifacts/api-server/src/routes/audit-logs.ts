import { Router } from "express";
import { db, auditLogsTable, desc } from "@workspace/db";

const router = Router();

// Get all audit logs
router.get("/audit-logs", async (req, res) => {
  try {
    const logs = await db
      .select()
      .from(auditLogsTable)
      .orderBy(desc(auditLogsTable.timestamp))
      .limit(2000); // match MAX_AUDIT_ENTRIES
    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Failed to fetch audit logs." });
  }
});

// Create audit log entry
router.post("/audit-logs", async (req, res) => {
  try {
    const entry = req.body;
    if (!entry || !entry.id || !entry.action || !entry.details) {
      res.status(400).json({ error: "Missing required audit log fields." });
      return;
    }

    await db.insert(auditLogsTable).values({
      id: entry.id,
      timestamp: entry.timestamp ?? new Date().toISOString(),
      userId: entry.userId,
      userName: entry.userName,
      userRole: entry.userRole,
      action: entry.action,
      details: entry.details,
      deploymentId: entry.deploymentId,
      deploymentRunId: entry.deploymentRunId,
      deploymentName: entry.deploymentName,
      product: entry.product,
    });

    res.status(201).json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Failed to save audit log." });
  }
});

export default router;
