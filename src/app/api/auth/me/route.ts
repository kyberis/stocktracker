import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";

export async function GET(req: NextRequest) {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  return NextResponse.json({
    user: {
      id: session.userId,
      username: session.username,
      role: session.role,
      mustChangePassword: session.mustChangePassword,
    },
  });
}
