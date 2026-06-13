import { Router } from "express";
import { db } from "@workspace/db";
import { slotsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

router.get("/machines/:machineId/slots", async (req, res) => {
  const { machineId } = req.params;
  const slots = await db.select().from(slotsTable).where(eq(slotsTable.machineId, machineId)).orderBy(slotsTable.slotLabel);
  res.json(slots);
});

router.patch("/machines/:machineId/slots/:slotId", async (req, res) => {
  const { machineId, slotId } = req.params;
  const { stockIn, overflow, stockOut } = req.body;
  const [slot] = await db.select().from(slotsTable).where(and(eq(slotsTable.id, Number(slotId)), eq(slotsTable.machineId, machineId)));
  if (!slot) return res.status(404).json({ error: "Slot not found" });

  const newInventory = slot.currentInventory + (stockIn ?? 0) - (stockOut ?? 0);
  const [updated] = await db.update(slotsTable).set({ currentInventory: Math.max(0, newInventory) }).where(eq(slotsTable.id, Number(slotId))).returning();
  res.json(updated);
});

export default router;
