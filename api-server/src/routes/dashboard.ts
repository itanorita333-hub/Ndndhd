import { Router } from "express";
import { db } from "@workspace/db";
import { machinesTable, refillSessionsTable, refillItemsTable } from "@workspace/db";
import { eq, gte, desc } from "drizzle-orm";

const router = Router();

router.get("/dashboard/summary", async (req, res) => {
  const machines = await db.select().from(machinesTable);
  const totalMachines = machines.length;
  const activeMachines = machines.filter(m => m.status === "active").length;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todaySessions = await db.select().from(refillSessionsTable)
    .where(gte(refillSessionsTable.startTime, todayStart));
  const totalRefillsToday = todaySessions.filter(s => s.status === "completed").length;

  const machinesNeedingRefill = machines.filter(m => {
    if (!m.lastRefillAt) return true;
    const diff = Date.now() - new Date(m.lastRefillAt).getTime();
    return diff > 24 * 60 * 60 * 1000;
  }).length;

  const recentSessions = await db.select().from(refillSessionsTable)
    .orderBy(desc(refillSessionsTable.startTime))
    .limit(5);

  const recentRefills = await Promise.all(recentSessions.map(async (session) => {
    const items = await db.select().from(refillItemsTable).where(eq(refillItemsTable.sessionId, session.id));
    return {
      ...session,
      startTime: session.startTime.toISOString(),
      endTime: session.endTime ? session.endTime.toISOString() : null,
      items,
    };
  }));

  const statusCounts = ["active", "inactive", "maintenance"].map(status => ({
    status,
    count: machines.filter(m => m.status === status).length,
  }));

  res.json({
    totalMachines,
    activeMachines,
    totalRefillsToday,
    machinesNeedingRefill,
    recentRefills,
    machineStatusBreakdown: statusCounts,
  });
});

export default router;
