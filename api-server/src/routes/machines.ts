import { Router } from "express";
import { db } from "@workspace/db";
import { machinesTable, slotsTable } from "@workspace/db";
import { eq, count } from "drizzle-orm";

const router = Router();

router.get("/machines", async (req, res) => {
  const machines = await db.select().from(machinesTable).orderBy(machinesTable.createdAt);
  res.json(machines);
});

router.post("/machines", async (req, res) => {
  const { id, name, location, status } = req.body;
  const [machine] = await db.insert(machinesTable).values({ id, name, location, status: status ?? "active" }).returning();
  res.status(201).json(machine);
});

router.get("/machines/:machineId", async (req, res) => {
  const { machineId } = req.params;
  const [machine] = await db.select().from(machinesTable).where(eq(machinesTable.id, machineId));
  if (!machine) return res.status(404).json({ error: "Machine not found" });
  res.json(machine);
});

router.patch("/machines/:machineId", async (req, res) => {
  const { machineId } = req.params;
  const { name, location, status } = req.body;
  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (location !== undefined) updates.location = location;
  if (status !== undefined) updates.status = status;
  const [machine] = await db.update(machinesTable).set(updates).where(eq(machinesTable.id, machineId)).returning();
  if (!machine) return res.status(404).json({ error: "Machine not found" });
  res.json(machine);
});

export default router;
