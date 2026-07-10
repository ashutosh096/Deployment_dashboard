import { Router } from "express";
import healthRouter from "./health";
import inviteRouter from "./invite";
import usersRouter from "./users";
import deploymentsRouter from "./deployments";
import auditLogsRouter from "./audit-logs";
import checklistsRouter from "./checklists";
import assignmentsRouter from "./assignments";

const router = Router();

router.use(healthRouter);
router.use(inviteRouter);
router.use(usersRouter);
router.use(deploymentsRouter);
router.use(auditLogsRouter);
router.use(checklistsRouter);
router.use(assignmentsRouter);

export default router;
