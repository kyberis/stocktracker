/**
 * Maps @vercel/blob failures to HTTP status and a safe client message.
 * "Store does not exist" usually means the project env still has an old BLOB_READ_WRITE_TOKEN
 * after the Blob store was deleted or unlinked — fix in Vercel Storage, then redeploy.
 */
export function httpResponseForBlobPutError(err: unknown): { status: number; error: string } {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();
  if (
    lower.includes("store does not exist") ||
    lower.includes("no token found") ||
    lower.includes("invalid token")
  ) {
    return {
      status: 503,
      error:
        "File storage is not linked or the token points to a removed Blob store. In Vercel: open this project → Storage → Blob → create a store or Connect to an existing one (refreshes BLOB_READ_WRITE_TOKEN), save for Production, then Redeploy.",
    };
  }
  return {
    status: 500,
    error: "Could not upload file. If this persists, check Vercel Blob in Storage and try again.",
  };
}
