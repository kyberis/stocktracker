import { getMetricsOutput, getContentType } from "@/lib/metrics";

export const dynamic = "force-dynamic";

export async function GET() {
  const metrics = await getMetricsOutput();
  return new Response(metrics, {
    status: 200,
    headers: { "Content-Type": getContentType() },
  });
}
