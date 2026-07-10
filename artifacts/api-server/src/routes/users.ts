import { Router } from "express";
import { db, usersTable, eq } from "@workspace/db";

const router = Router();

// User Login
router.post("/users/login", async (req, res) => {
  try {
    const { email, password } = req.body ?? {};
    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required." });
      return;
    }

    // Seed default admin if table is empty
    const usersCount = await db.select().from(usersTable).limit(1);
    if (usersCount.length === 0) {
      await db.insert(usersTable).values({
        id: "default-admin",
        name: "Admin",
        email: "admin@deploydash.local",
        jobTitle: "System Administrator",
        userRole: "admin",
        password: "admin123",
        createdAt: new Date().toISOString(),
      });
    }

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email.toLowerCase().trim()))
      .limit(1);

    if (!user || user.password !== password) {
      res.status(401).json({ error: "Invalid email or password." });
      return;
    }

    res.json(user);
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Database error during login." });
  }
});

// Get registered users
router.get("/users", async (req, res) => {
  try {
    // Seed default admin if table is empty
    const usersCount = await db.select().from(usersTable).limit(1);
    if (usersCount.length === 0) {
      await db.insert(usersTable).values({
        id: "default-admin",
        name: "Admin",
        email: "admin@deploydash.local",
        jobTitle: "System Administrator",
        userRole: "admin",
        password: "admin123",
        createdAt: new Date().toISOString(),
      });
    }

    const allUsers = await db.select().from(usersTable);
    res.json(allUsers);
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Failed to fetch users." });
  }
});

// Add a registered user
router.post("/users", async (req, res) => {
  try {
    const { id, name, email, jobTitle, userRole, password, createdAt, invitedByName } = req.body ?? {};
    if (!id || !name || !email || !password) {
      res.status(400).json({ error: "Missing required user fields." });
      return;
    }

    const [existing] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email.toLowerCase().trim()))
      .limit(1);

    if (existing) {
      res.status(400).json({ error: "A user with this email already exists." });
      return;
    }

    await db.insert(usersTable).values({
      id,
      name,
      email: email.toLowerCase().trim(),
      jobTitle: jobTitle ?? "",
      userRole: userRole ?? "developer",
      password,
      createdAt,
      invitedByName,
    });

    res.status(201).json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Failed to create user." });
  }
});

// Update user role
router.put("/users/:id/role", async (req, res) => {
  try {
    const { userRole } = req.body ?? {};
    if (!userRole) {
      res.status(400).json({ error: "userRole is required." });
      return;
    }

    await db
      .update(usersTable)
      .set({ userRole })
      .where(eq(usersTable.id, req.params.id));

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Failed to update user role." });
  }
});

// Delete user
router.delete("/users/:id", async (req, res) => {
  try {
    await db.delete(usersTable).where(eq(usersTable.id, req.params.id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Failed to delete user." });
  }
});

export default router;
