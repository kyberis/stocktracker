import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { deleteUser, findUserById, listUsers, updateUserPassword, updateUserRole, updateUserSubscription } from "@/lib/db";
import type { UserRole, UserPlan } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { withMetrics } from "@/lib/with-metrics";

export const GET = withMetrics("/api/admin/users", async (req: NextRequest) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  return NextResponse.json({ users: await listUsers() });
});

export const POST = withMetrics("/api/admin/users", async (req: NextRequest) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  try {
    const body = (await req.json()) as {
      userId?: string;
      newPassword?: string;
      action?: string;
      role?: UserRole;
      plan?: UserPlan;
    };

    if (!body.userId) {
      return NextResponse.json({ error: "userId is required." }, { status: 400 });
    }

    const user = await findUserById(body.userId);
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    if (body.action === "setRole") {
      if (!body.role || !["admin", "user"].includes(body.role)) {
        return NextResponse.json({ error: "Valid role (admin|user) is required." }, { status: 400 });
      }
      if (user.username === "admin" && body.role !== "admin") {
        return NextResponse.json({ error: "Cannot change the default admin's role." }, { status: 400 });
      }
      await updateUserRole(user.id, body.role);
      return NextResponse.json({ ok: true });
    }

    if (body.action === "setPlan") {
      if (!body.plan || !["free", "pro"].includes(body.plan)) {
        return NextResponse.json({ error: "Valid plan (free|pro) is required." }, { status: 400 });
      }
      const planExpiresAt = body.plan === "pro"
        ? new Date(Date.now() + 365 * 86400000).toISOString()
        : "";
      await updateUserSubscription(user.id, { plan: body.plan, planExpiresAt });
      return NextResponse.json({ ok: true });
    }

    if (!body.newPassword) {
      return NextResponse.json({ error: "newPassword is required." }, { status: 400 });
    }
    if (body.newPassword.length < 4) {
      return NextResponse.json({ error: "Password must have at least 4 characters." }, { status: 400 });
    }

    const hash = await hashPassword(body.newPassword);
    await updateUserPassword(user.id, hash, false);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
});

export const DELETE = withMetrics("/api/admin/users", async (req: NextRequest) => {
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
});
