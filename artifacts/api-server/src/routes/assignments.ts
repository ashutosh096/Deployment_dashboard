import { Router } from "express";
import { db, developerAssignmentsTable, eq } from "@workspace/db";

const router = Router();

// Get developer assignments
router.get("/assignments", async (req, res) => {
  try {
    const list = await db.select().from(developerAssignmentsTable);
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Failed to fetch developer assignments." });
  }
});

// Upsert developer assignment
router.post("/assignments", async (req, res) => {
  try {
    const { developerId, developerName, products } = req.body ?? {};
    if (!developerId || !developerName || !products) {
      res.status(400).json({ error: "Missing required developer assignment fields." });
      return;
    }

    const [existing] = await db
      .select()
      .from(developerAssignmentsTable)
      .where(eq(developerAssignmentsTable.developerId, developerId))
      .limit(1);

    if (existing) {
      await db
        .update(developerAssignmentsTable)
        .set({ developerName, products })
        .where(eq(developerAssignmentsTable.developerId, developerId));
    } else {
      await db.insert(developerAssignmentsTable).values({
        developerId,
        developerName,
        products,
      });
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Failed to save developer assignment." });
  }
});

export default router;
