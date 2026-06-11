import { Router } from "express";
import healthRouter from "./health";
import inviteRouter from "./invite";

const router = Router();

router.use(healthRouter);
router.use(inviteRouter);

export default router;
