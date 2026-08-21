/** Unified searchable index for the portfolio quick-nav strip. */

export type NavMenuItemGroup = "core" | "views" | "extras" | "tools";

export type NavMenuItem =
  | {
      id: string;
      label: string;
      group: NavMenuItemGroup;
      kind: "tab";
      tab: "portfolio" | "news";
      tierBadge?: "pro";
      disabled?: boolean;
    }
  | {
      id: string;
      label: string;
      group: NavMenuItemGroup;
      kind: "href";
      href: string;
      tierBadge?: "pro";
      disabled?: boolean;
    };

export type NavMenuViewLinkInput = {
  id: string;
  label: string;
  href: string;
  tierBadge?: "pro";
  disabled?: boolean;
};

export type NavMenuToolInput = {
  id: string;
  label: string;
  href: string;
  tierBadge?: "pro";
};

export type NavMenuIndexInput = {
  holdingsLabel: string;
  toolsLabel: string;
  newsLabel: string;
  importLabel: string;
  widgetSetupLabel: string;
  viewLinks: NavMenuViewLinkInput[];
  tools: NavMenuToolInput[];
};

function hrefKey(href: string): string {
  return href.replace(/\/+$/, "") || "/";
}

/**
 * Build a deduplicated nav index. Order: core → views → extras → tools.
 * Later hrefs that match an earlier entry are skipped (views labels win over tools).
 */
export function buildNavMenuIndex(input: NavMenuIndexInput): NavMenuItem[] {
  const items: NavMenuItem[] = [];
  const seenHrefs = new Set<string>();

  const pushHref = (item: Extract<NavMenuItem, { kind: "href" }>) => {
    const key = hrefKey(item.href);
    if (seenHrefs.has(key)) return;
    seenHrefs.add(key);
    items.push(item);
  };

  items.push({
    id: "core-holdings",
    label: input.holdingsLabel,
    group: "core",
    kind: "tab",
    tab: "portfolio",
  });

  pushHref({
    id: "core-tools",
    label: input.toolsLabel,
    group: "core",
    kind: "href",
    href: "/tools",
  });

  for (const view of input.viewLinks) {
    pushHref({
      id: `view-${view.id}`,
      label: view.label,
      group: "views",
      kind: "href",
      href: view.href,
      tierBadge: view.tierBadge,
      disabled: view.disabled,
    });
  }

  items.push({
    id: "extra-news",
    label: input.newsLabel,
    group: "extras",
    kind: "tab",
    tab: "news",
  });

  pushHref({
    id: "extra-import",
    label: input.importLabel,
    group: "extras",
    kind: "href",
    href: "/import",
  });

  pushHref({
    id: "extra-widget-setup",
    label: input.widgetSetupLabel,
    group: "extras",
    kind: "href",
    href: "/widget/setup",
  });

  for (const tool of input.tools) {
    pushHref({
      id: `tool-${tool.id}`,
      label: tool.label,
      group: "tools",
      kind: "href",
      href: tool.href,
      tierBadge: tool.tierBadge,
    });
  }

  return items;
}

/** Case-insensitive substring match on the translated label. Empty query → []. */
export function filterNavMenuItems(items: NavMenuItem[], query: string): NavMenuItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return items.filter((item) => item.label.toLowerCase().includes(q));
}
