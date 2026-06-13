import { Router, type IRouter } from "express";
import healthRouter from "./health";
import machinesRouter from "./machines";
import slotsRouter from "./slots";
import refillSessionsRouter from "./refill-sessions";
import temperatureLogsRouter from "./temperature-logs";
import wastageReportsRouter from "./wastage-reports";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(machinesRouter);
router.use(slotsRouter);
router.use(refillSessionsRouter);
router.use(temperatureLogsRouter);
router.use(wastageReportsRouter);
router.use(dashboardRouter);

export default router;
