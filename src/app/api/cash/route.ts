import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { addCashEntry, listCashEntries, removeCashEntry, updateCashEntry } from "@/lib/db";
import type { CashEntry } from "@/lib/types";
import { withMetrics } from "@/lib/with-metrics";

export const GET = withMetrics("/api/cash", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  const cash = await listCashEntries(session.userId);
  return NextResponse.json(cash);
});

export const POST = withMetrics("/api/cash", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  try {
    const body = (await req.json()) as Omit<CashEntry, "id">;
    const name = String(body?.name || "").trim();
    const amountEUR = Number(body?.amountEUR);
    if (!name || Number.isNaN(amountEUR) || amountEUR < 0) {
      return NextResponse.json({ error: "Invalid cash payload." }, { status: 400 });
    }
    const created = await addCashEntry(session.userId, { name, amountEUR });
    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
});

export const PUT = withMetrics("/api/cash", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  try {
    const body = (await req.json()) as { id?: string; updates?: Partial<Omit<CashEntry, "id">> };
    if (!body.id || !body.updates) {
      return NextResponse.json({ error: "id and updates are required." }, { status: 400 });
    }
    const nextUpdates: Partial<Omit<CashEntry, "id">> = {};
    if (body.updates.name != null) {
      const name = String(body.updates.name).trim();
      if (!name) return NextResponse.json({ error: "name cannot be empty." }, { status: 400 });
      nextUpdates.name = name;
    }
    if (body.updates.amountEUR != null) {
      const amountEUR = Number(body.updates.amountEUR);
      if (Number.isNaN(amountEUR) || amountEUR < 0) {
        return NextResponse.json({ error: "amountEUR must be >= 0." }, { status: 400 });
      }
      nextUpdates.amountEUR = amountEUR;
    }
    const updated = await updateCashEntry(session.userId, body.id, nextUpdates);
    if (!updated) {
      return NextResponse.json({ error: "Cash entry not found." }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
});

export const DELETE = withMetrics("/api/cash", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id query param is required." }, { status: 400 });
  }

  const deleted = await removeCashEntry(session.userId, id);
  if (!deleted) {
    return NextResponse.json({ error: "Cash entry not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
});
