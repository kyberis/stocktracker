"use client";

import type { ReactNode } from "react";

interface EmptyStateAction {
  label: string;
  onClick?: () => void;
  href?: string;
  variant?: "primary" | "secondary";
  icon?: ReactNode;
}

interface EmptyStateProps {
  icon: ReactNode;
  iconClassName?: string;
  title: string;
  subtitle?: string;
  actions?: EmptyStateAction[];
  className?: string;
  children?: ReactNode;
}

export default function EmptyState({
  icon,
  iconClassName = "from-emerald-400 to-emerald-600 shadow-emerald-500/20",
  title,
  subtitle,
  actions,
  className = "",
  children,
}: EmptyStateProps) {
  return (
    <div className={`card ${className}`}>
      <div className="text-center py-8 px-4">
        <div
          className={`w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br ${iconClassName} flex items-center justify-center shadow-lg`}
        >
          {icon}
        </div>
        <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1.5">
          {title}
        </h3>
        {subtitle && (
          <p className="text-sm text-gray-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
            {subtitle}
          </p>
        )}
        {actions && actions.length > 0 && (
          <div className="flex items-center justify-center gap-2.5 mt-5 flex-wrap">
            {actions.map((action, i) => {
              const isPrimary = action.variant === "primary" || (!action.variant && i === 0);
              const cls = isPrimary
                ? "inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white transition-colors shadow-sm"
                : "inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors";

              if (action.href) {
                return (
                  <a key={i} href={action.href} className={cls}>
                    {action.icon}
                    {action.label}
                  </a>
                );
              }
              return (
                <button key={i} onClick={action.onClick} className={cls}>
                  {action.icon}
                  {action.label}
                </button>
              );
            })}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
