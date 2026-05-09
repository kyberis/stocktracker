declare module "pdf-parse" {
  export default function pdfParse(
    dataBuffer: Buffer,
    options?: Record<string, unknown>,
  ): Promise<{ numpages: number; text: string }>;
}
