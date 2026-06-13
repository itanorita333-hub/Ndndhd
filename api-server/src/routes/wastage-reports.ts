import { Router } from "express";
import { db } from "@workspace/db";
import { wastageReportsTable, slotsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

router.get("/machines/:machineId/wastage-reports", async (req, res) => {
  const { machineId } = req.params;
  const reports = await db.select().from(wastageReportsTable)
    .where(eq(wastageReportsTable.machineId, machineId))
    .orderBy(desc(wastageReportsTable.reportedAt))
    .limit(50);
  res.json(reports.map(r => ({ ...r, reportedAt: r.reportedAt.toISOString() })));
});

router.post("/machines/:machineId/wastage-reports", async (req, res) => {
  const { machineId } = req.params;
  const { slotId, quantity, reason } = req.body;
  const [slot] = await db.select().from(slotsTable).where(eq(slotsTable.id, Number(slotId)));
  const [report] = await db.insert(wastageReportsTable).values({
    machineId,
    slotId: Number(slotId),
    slotLabel: slot?.slotLabel ?? String(slotId),
    productName: slot?.productName ?? null,
    quantity,
    reason,
  }).returning();
  res.status(201).json({ ...report, reportedAt: report.reportedAt.toISOString() });
});

export default router;
