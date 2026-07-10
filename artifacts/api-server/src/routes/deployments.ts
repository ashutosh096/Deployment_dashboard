import { Router } from "express";
import { db, deploymentsTable, eq, desc } from "@workspace/db";

const router = Router();

// Get all deployments
router.get("/deployments", async (req, res) => {
  try {
    const list = await db
      .select()
      .from(deploymentsTable)
      .orderBy(desc(deploymentsTable.startedAt));
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Failed to fetch deployments." });
  }
});

// Get deployment by id
router.get("/deployments/:id", async (req, res) => {
  try {
    const [dep] = await db
      .select()
      .from(deploymentsTable)
      .where(eq(deploymentsTable.id, req.params.id))
      .limit(1);

    if (!dep) {
      res.status(404).json({ error: "Deployment not found." });
      return;
    }
    res.json(dep);
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Failed to fetch deployment." });
  }
});

// Create new deployment
router.post("/deployments", async (req, res) => {
  try {
    const dep = req.body;
    if (!dep || !dep.id || !dep.runId || !dep.product || !dep.name) {
      res.status(400).json({ error: "Missing required deployment fields." });
      return;
    }

    await db.insert(deploymentsTable).values({
      id: dep.id,
      runId: dep.runId,
      product: dep.product,
      name: dep.name,
      developerId: dep.developerId,
      developerName: dep.developerName,
      startedAt: dep.startedAt,
      updatedAt: dep.updatedAt,
      status: dep.status,
      prePhase: dep.prePhase ?? { checkedItems: {}, completed: false },
      postPhase: dep.postPhase ?? { checkedItems: {}, completed: false },
      notes: dep.notes,
      failedAt: dep.failedAt,
      failureReason: dep.failureReason,
      locked: dep.locked ?? false,
      itemNotes: dep.itemNotes ?? {},
    });

    res.status(201).json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Failed to create deployment." });
  }
});

// Update deployment
router.put("/deployments/:id", async (req, res) => {
  try {
    const dep = req.body;
    if (!dep) {
      res.status(400).json({ error: "Request body cannot be empty." });
      return;
    }

    // Build fields to update dynamically based on payload
    const fieldsToUpdate: Record<string, any> = {};
    if (dep.status !== undefined) fieldsToUpdate.status = dep.status;
    if (dep.updatedAt !== undefined) fieldsToUpdate.updatedAt = dep.updatedAt;
    if (dep.prePhase !== undefined) fieldsToUpdate.prePhase = dep.prePhase;
    if (dep.postPhase !== undefined) fieldsToUpdate.postPhase = dep.postPhase;
    if (dep.notes !== undefined) fieldsToUpdate.notes = dep.notes;
    if (dep.failedAt !== undefined) fieldsToUpdate.failedAt = dep.failedAt;
    if (dep.failureReason !== undefined) fieldsToUpdate.failureReason = dep.failureReason;
    if (dep.locked !== undefined) fieldsToUpdate.locked = dep.locked;
    if (dep.itemNotes !== undefined) fieldsToUpdate.itemNotes = dep.itemNotes;

    await db
      .update(deploymentsTable)
      .set(fieldsToUpdate)
      .where(eq(deploymentsTable.id, req.params.id));

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Failed to update deployment." });
  }
});

// Delete deployment
router.delete("/deployments/:id", async (req, res) => {
  try {
    await db.delete(deploymentsTable).where(eq(deploymentsTable.id, req.params.id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Failed to delete deployment." });
  }
});

export default router;
