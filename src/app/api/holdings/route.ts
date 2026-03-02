import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { addHolding, listHoldings, removeHolding, updateHolding } from "@/lib/db";
import type { Holding } from "@/lib/types";

export async function GET(req: NextRequest) {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  const holdings = await listHoldings(session.userId);
  return NextResponse.json(holdings);
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  try {
    const body = (await req.json()) as Omit<Holding, "id">;
    if (!body?.ticker || !body?.name) {
      return NextResponse.json({ error: "Invalid holding payload." }, { status: 400 });
    }
    const created = await addHolding(session.userId, body);
    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
}

export async function PUT(req: NextRequest) {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  try {
    const body = (await req.json()) as { id?: string; updates?: Partial<Omit<Holding, "id">> };
    if (!body.id || !body.updates) {
      return NextResponse.json({ error: "id and updates are required." }, { status: 400 });
    }

    const updated = await updateHolding(session.userId, body.id, body.updates);
    if (!updated) {
      return NextResponse.json({ error: "Holding not found." }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id query param is required." }, { status: 400 });
  }

  const deleted = await removeHolding(session.userId, id);
  if (!deleted) {
    return NextResponse.json({ error: "Holding not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
