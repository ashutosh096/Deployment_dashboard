import { Router } from "express";
import { db, checklistOverridesTable, eq } from "@workspace/db";

const router = Router();

// Get checklist overrides for a product
router.get("/checklists/overrides/:product", async (req, res) => {
  try {
    const product = req.params.product;
    const [override] = await db
      .select()
      .from(checklistOverridesTable)
      .where(eq(checklistOverridesTable.product, product))
      .limit(1);

    res.json(override?.sections ?? null);
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Failed to fetch checklist overrides." });
  }
});

// Save checklist overrides for a product
router.post("/checklists/overrides/:product", async (req, res) => {
  try {
    const product = req.params.product;
    const { sections } = req.body ?? {};
    if (!sections) {
      res.status(400).json({ error: "Sections payload is required." });
      return;
    }

    // Attempt upsert: check if exists
    const [existing] = await db
      .select()
      .from(checklistOverridesTable)
      .where(eq(checklistOverridesTable.product, product))
      .limit(1);

    if (existing) {
      await db
        .update(checklistOverridesTable)
        .set({ sections })
        .where(eq(checklistOverridesTable.product, product));
    } else {
      await db.insert(checklistOverridesTable).values({
        product,
        sections,
      });
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Failed to save checklist overrides." });
  }
});

// Reset checklist overrides (delete custom template, reverting to local static defaults)
router.delete("/checklists/overrides/:product", async (req, res) => {
  try {
    const product = req.params.product;
    await db
      .delete(checklistOverridesTable)
      .where(eq(checklistOverridesTable.product, product));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Failed to reset checklist overrides." });
  }
});

export default router;
