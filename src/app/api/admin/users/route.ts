import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { deleteUser, findUserById, listUsers, updateUserPassword } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin(req);
  if (error) return error;

  return NextResponse.json({ users: await listUsers() });
}

export async function POST(req: NextRequest) {
  const { error } = await requireAdmin(req);
  if (error) return error;

  try {
    const body = (await req.json()) as { userId?: string; newPassword?: string };
    if (!body.userId || !body.newPassword) {
      return NextResponse.json({ error: "userId and newPassword are required." }, { status: 400 });
    }
    if (body.newPassword.length < 4) {
      return NextResponse.json({ error: "Password must have at least 4 characters." }, { status: 400 });
    }

    const user = await findUserById(body.userId);
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const hash = await hashPassword(body.newPassword);
    await updateUserPassword(user.id, hash, false);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const userId = req.nextUrl.searchParams.get("id");
  if (!userId) {
    return NextResponse.json({ error: "id query param is required." }, { status: 400 });
  }

  const user = await findUserById(userId);
  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }
  if (user.username === "admin") {
    return NextResponse.json({ error: "admin user cannot be deleted." }, { status: 400 });
  }

  await deleteUser(userId);
  return NextResponse.json({ ok: true });
}
