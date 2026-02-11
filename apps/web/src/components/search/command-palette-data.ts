import {
  BarChart3,
  Binary,
  BookOpen,
  Compass,
  Database,
  GitFork,
  Globe,
  Key,
  LayoutDashboard,
  Map,
  Network,
  Rss,
  Settings,
  Shield,
  Sparkles,
  Timer,
  TreePine,
  UserPlus,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavigationItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  category: "navigation" | "charts" | "actions" | "admin";
  keywords: Array<string>;
  adminOnly?: boolean;
}

/**
 * Static navigation items for the command palette.
 * Filtered client-side by matching query against label + keywords.
 */
export const NAVIGATION_ITEMS: Array<NavigationItem> = [
  // Navigation
  {
    id: "nav-dashboard",
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    category: "navigation",
    keywords: ["home", "overview", "start"],
  },
  {
    id: "nav-people",
    label: "People",
    href: "/people",
    icon: Users,
    category: "navigation",
    keywords: ["persons", "family", "members", "list"],
  },
  {
    id: "nav-activity",
    label: "Activity",
    href: "/activity",
    icon: Rss,
    category: "navigation",
    keywords: ["log", "feed", "recent", "changes", "history"],
  },
  {
    id: "nav-maps",
    label: "Maps",
    href: "/maps",
    icon: Map,
    category: "navigation",
    keywords: ["geography", "locations", "places", "migration"],
  },
  {
    id: "nav-subscribe",
    label: "Subscribe",
    href: "/subscribe",
    icon: Sparkles,
    category: "navigation",
    keywords: ["premium", "plan", "billing", "upgrade"],
  },
  {
    id: "nav-settings",
    label: "Settings",
    href: "/settings/profile",
    icon: Settings,
    category: "navigation",
    keywords: ["profile", "preferences", "account"],
  },

  // Charts
  {
    id: "chart-tree",
    label: "Interactive Tree",
    href: "/visualize?type=tree",
    icon: TreePine,
    category: "charts",
    keywords: ["visualize", "family tree", "graph", "interactive"],
  },
  {
    id: "chart-ancestor",
    label: "Ancestor Chart",
    href: "/visualize?type=ancestor",
    icon: GitFork,
    category: "charts",
    keywords: ["pedigree", "ancestors", "lineage", "parents"],
  },
  {
    id: "chart-descendant",
    label: "Descendant Chart",
    href: "/visualize?type=descendant",
    icon: Network,
    category: "charts",
    keywords: ["descendants", "offspring", "children", "progeny"],
  },
  {
    id: "chart-hourglass",
    label: "Hourglass Chart",
    href: "/visualize?type=hourglass",
    icon: Timer,
    category: "charts",
    keywords: ["both", "ancestors", "descendants", "bidirectional"],
  },
  {
    id: "chart-fan",
    label: "Fan Chart",
    href: "/visualize?type=fan",
    icon: Compass,
    category: "charts",
    keywords: ["circular", "radial", "wheel", "pedigree"],
  },
  {
    id: "chart-timeline",
    label: "Timeline",
    href: "/visualize?type=timeline",
    icon: BarChart3,
    category: "charts",
    keywords: ["chronological", "dates", "birth", "death", "events"],
  },
  {
    id: "chart-bowtie",
    label: "Bowtie Chart",
    href: "/visualize?type=bowtie",
    icon: Globe,
    category: "charts",
    keywords: ["couple", "both families", "marriage", "dual"],
  },
  {
    id: "chart-compact",
    label: "Compact Tree",
    href: "/visualize?type=compact",
    icon: Binary,
    category: "charts",
    keywords: ["dense", "small", "minimal", "overview"],
  },
  {
    id: "chart-statistics",
    label: "Statistics",
    href: "/visualize?type=statistics",
    icon: BarChart3,
    category: "charts",
    keywords: ["demographics", "analytics", "data", "numbers", "stats"],
  },

  // Actions
  {
    id: "action-add-person",
    label: "Add Person",
    href: "/people/new",
    icon: UserPlus,
    category: "actions",
    keywords: ["create", "new", "add", "person", "member"],
  },

  // Admin
  {
    id: "admin-users",
    label: "Manage Users",
    href: "/admin/users",
    icon: Users,
    category: "admin",
    keywords: ["users", "accounts", "roles", "permissions"],
    adminOnly: true,
  },
  {
    id: "admin-backup",
    label: "Backup and GEDCOM",
    href: "/admin/backup",
    icon: Database,
    category: "admin",
    keywords: ["backup", "export", "import", "gedcom", "restore", "data"],
    adminOnly: true,
  },
  {
    id: "admin-invites",
    label: "Invites",
    href: "/admin/invites",
    icon: Key,
    category: "admin",
    keywords: ["invite", "invitation", "link", "share"],
    adminOnly: true,
  },
  {
    id: "admin-settings",
    label: "Admin Settings",
    href: "/admin/settings",
    icon: Shield,
    category: "admin",
    keywords: ["system", "configuration", "admin", "site"],
    adminOnly: true,
  },
  {
    id: "admin-sources",
    label: "Sources",
    href: "/admin/sources",
    icon: BookOpen,
    category: "admin",
    keywords: ["source", "citation", "reference", "document"],
    adminOnly: true,
  },
  {
    id: "admin-metrics",
    label: "Metrics",
    href: "/admin/metrics",
    icon: BarChart3,
    category: "admin",
    keywords: ["metrics", "monitoring", "performance", "health"],
    adminOnly: true,
  },
];

/**
 * Filter navigation items by query string.
 * Matches against label and keywords (case-insensitive).
 */
export function filterNavigationItems(
  query: string,
  isAdmin: boolean
): Array<NavigationItem> {
  const lower = query.toLowerCase().trim();

  return NAVIGATION_ITEMS.filter((item) => {
    // Filter admin items for non-admins
    if (item.adminOnly && !isAdmin) return false;

    // If no query, return all applicable items
    if (!lower) return true;

    // Match against label and keywords
    const labelMatch = item.label.toLowerCase().includes(lower);
    const keywordMatch = item.keywords.some((kw) => kw.includes(lower));
    return labelMatch || keywordMatch;
  });
}

/**
 * Get navigation items grouped by category for display.
 */
export function getGroupedNavigationItems(
  query: string,
  isAdmin: boolean
): Record<string, Array<NavigationItem>> {
  const filtered = filterNavigationItems(query, isAdmin);

  const groups: Record<string, Array<NavigationItem>> = {};
  for (const item of filtered) {
    const key = item.category;
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  }

  return groups;
}

/** Human-readable category labels */
export const CATEGORY_LABELS: Record<string, string> = {
  actions: "Quick Actions",
  navigation: "Navigation",
  charts: "Charts",
  admin: "Admin",
};
