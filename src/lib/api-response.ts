import { z } from "zod";

export function ok<T>(data: T, init?: ResponseInit): Response {
  return Response.json(data, init);
}

export function err(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}

export async function parseBody<T extends z.ZodType>(
  req: Request,
  schema: T
): Promise<{ success: true; data: z.infer<T> } | { success: false; error: Response }> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return { success: false, error: err("Invalid request body", 400) };
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    const message = result.error.issues[0]?.message || "Invalid request";
    return { success: false, error: err(message, 400) };
  }
  return { success: true, data: result.data };
}
