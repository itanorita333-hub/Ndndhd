import { Router } from "express";
import { db } from "@workspace/db";
import { temperatureLogsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

router.get("/machines/:machineId/temperature-logs", async (req, res) => {
  const { machineId } = req.params;
  const logs = await db.select().from(temperatureLogsTable)
    .where(eq(temperatureLogsTable.machineId, machineId))
    .orderBy(desc(temperatureLogsTable.recordedAt))
    .limit(50);
  res.json(logs.map(l => ({ ...l, recordedAt: l.recordedAt.toISOString() })));
});

router.post("/machines/:machineId/temperature-logs", async (req, res) => {
  const { machineId } = req.params;
  const { temperature, notes } = req.body;
  const [log] = await db.insert(temperatureLogsTable).values({ machineId, temperature, notes }).returning();
  res.status(201).json({ ...log, recordedAt: log.recordedAt.toISOString() });
});

export default router;
