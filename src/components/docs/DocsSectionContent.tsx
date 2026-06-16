import type { ReactNode } from "react";
import Link from "next/link";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function renderValue(value: unknown, depth = 0): ReactNode {
  if (value == null) return null;
  if (typeof value === "string") {
    if (/^https?:\/\//.test(value)) {
      return (
        <Link href={value} className="text-emerald-600 hover:text-emerald-700 underline break-all">
          {value}
        </Link>
      );
    }
    return <span className="text-slate-700">{value}</span>;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return <span className="text-slate-700">{String(value)}</span>;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return null;
    if (value.every((item) => typeof item === "string")) {
      return (
        <ul className="list-disc pl-5 space-y-1 text-slate-700">
          {value.map((item) => (
            <li key={item}>{renderValue(item, depth + 1)}</li>
          ))}
        </ul>
      );
    }
    return (
      <div className="space-y-4">
        {value.map((item, index) => (
          <div
            key={index}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            {renderValue(item, depth + 1)}
          </div>
        ))}
      </div>
    );
  }
  if (isRecord(value)) {
    return (
      <dl className="space-y-3">
        {Object.entries(value).map(([key, nested]) => (
          <div key={key}>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">
              {key.replace(/_/g, " ")}
            </dt>
            <dd className="text-sm leading-relaxed">{renderValue(nested, depth + 1)}</dd>
          </div>
        ))}
      </dl>
    );
  }
  return null;
}

export default function DocsSectionContent({ content }: { content: Record<string, unknown> }) {
  return <div className="space-y-6">{renderValue(content)}</div>;
}
