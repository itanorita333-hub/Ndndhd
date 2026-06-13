import { Router } from "express";
import { db } from "@workspace/db";
import { refillSessionsTable, refillItemsTable, slotsTable, machinesTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";

const router = Router();

router.get("/machines/:machineId/refill-sessions", async (req, res) => {
  const { machineId } = req.params;
  const sessions = await db.select().from(refillSessionsTable)
    .where(eq(refillSessionsTable.machineId, machineId))
    .orderBy(desc(refillSessionsTable.startTime))
    .limit(20);

  const sessionsWithItems = await Promise.all(sessions.map(async (session) => {
    const items = await db.select().from(refillItemsTable).where(eq(refillItemsTable.sessionId, session.id));
    return {
      ...session,
      startTime: session.startTime.toISOString(),
      endTime: session.endTime ? session.endTime.toISOString() : null,
      items,
    };
  }));
  res.json(sessionsWithItems);
});

router.post("/machines/:machineId/refill-sessions", async (req, res) => {
  const { machineId } = req.params;
  const { refillerName } = req.body;
  const [session] = await db.insert(refillSessionsTable).values({
    machineId,
    refillerName: refillerName ?? "Refiller",
    status: "in_progress",
  }).returning();
  res.status(201).json({
    ...session,
    startTime: session.startTime.toISOString(),
    endTime: null,
    items: [],
  });
});

router.get("/machines/:machineId/refill-sessions/active", async (req, res) => {
  const { machineId } = req.params;
  const [session] = await db.select().from(refillSessionsTable)
    .where(and(eq(refillSessionsTable.machineId, machineId), eq(refillSessionsTable.status, "in_progress")))
    .orderBy(desc(refillSessionsTable.startTime))
    .limit(1);

  if (!session) return res.json({ session: null });

  const items = await db.select().from(refillItemsTable).where(eq(refillItemsTable.sessionId, session.id));
  res.json({
    session: {
      ...session,
      startTime: session.startTime.toISOString(),
      endTime: null,
      items,
    }
  });
});

router.post("/machines/:machineId/refill-sessions/:sessionId/submit", async (req, res) => {
  const { machineId, sessionId } = req.params;
  const { items } = req.body as { items: Array<{ slotId: number; stockIn: number; overflow: number; stockOut: number }> };

  const [session] = await db.select().from(refillSessionsTable)
    .where(and(eq(refillSessionsTable.id, Number(sessionId)), eq(refillSessionsTable.machineId, machineId)));

  if (!session) return res.status(404).json({ error: "Session not found" });

  const elapsed = Date.now() - session.startTime.getTime();
  const FIVE_MINUTES = 5 * 60 * 1000;
  if (elapsed < FIVE_MINUTES) {
    const remaining = Math.ceil((FIVE_MINUTES - elapsed) / 1000);
    return res.status(400).json({ error: `At least 5 minutes refill time before submit. Wait ${remaining} more seconds.` });
  }

  const now = new Date();

  await Promise.all(items.map(async (item) => {
    const [slot] = await db.select().from(slotsTable).where(eq(slotsTable.id, item.slotId));
    const slotLabel = slot?.slotLabel ?? String(item.slotId);

    await db.insert(refillItemsTable).values({
      sessionId: Number(sessionId),
      slotId: item.slotId,
      slotLabel,
      stockIn: item.stockIn ?? 0,
      overflow: item.overflow ?? 0,
      stockOut: item.stockOut ?? 0,
    });

    if (slot) {
      const newInventory = slot.currentInventory + (item.stockIn ?? 0) - (item.stockOut ?? 0);
      await db.update(slotsTable).set({ currentInventory: Math.max(0, newInventory) }).where(eq(slotsTable.id, slot.id));
    }
  }));

  await db.update(machinesTable).set({ lastRefillAt: now }).where(eq(machinesTable.id, machineId));

  const [updated] = await db.update(refillSessionsTable).set({ status: "completed", endTime: now }).where(eq(refillSessionsTable.id, Number(sessionId))).returning();
  const savedItems = await db.select().from(refillItemsTable).where(eq(refillItemsTable.sessionId, Number(sessionId)));

  res.json({
    ...updated,
    startTime: updated.startTime.toISOString(),
    endTime: updated.endTime ? updated.endTime.toISOString() : null,
    items: savedItems,
  });
});

export default router;
