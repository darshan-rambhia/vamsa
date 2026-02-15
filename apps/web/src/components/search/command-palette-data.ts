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
import type { TFunction } from "i18next";

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
 * Get navigation items with translated labels.
 * Accepts a translation function to localize labels and keywords.
 */
function getNavigationItems(t: TFunction): Array<NavigationItem> {
  return [
    // Navigation
    {
      id: "nav-dashboard",
      label: t("navDashboard"),
      href: "/dashboard",
      icon: LayoutDashboard,
      category: "navigation",
      keywords: ["home", "overview", "start"],
    },
    {
      id: "nav-people",
      label: t("navPeople"),
      href: "/people",
      icon: Users,
      category: "navigation",
      keywords: ["persons", "family", "members", "list"],
    },
    {
      id: "nav-activity",
      label: t("navActivity"),
      href: "/activity",
      icon: Rss,
      category: "navigation",
      keywords: ["log", "feed", "recent", "changes", "history"],
    },
    {
      id: "nav-maps",
      label: t("navMaps"),
      href: "/maps",
      icon: Map,
      category: "navigation",
      keywords: ["geography", "locations", "places", "migration"],
    },
    {
      id: "nav-subscribe",
      label: t("navSubscribe"),
      href: "/subscribe",
      icon: Sparkles,
      category: "navigation",
      keywords: ["premium", "plan", "billing", "upgrade"],
    },
    {
      id: "nav-settings",
      label: t("navSettings"),
      href: "/settings/profile",
      icon: Settings,
      category: "navigation",
      keywords: ["profile", "preferences", "account"],
    },

    // Charts
    {
      id: "chart-tree",
      label: t("navInteractiveTree"),
      href: "/visualize?type=tree",
      icon: TreePine,
      category: "charts",
      keywords: ["visualize", "family tree", "graph", "interactive"],
    },
    {
      id: "chart-ancestor",
      label: t("navAncestorChart"),
      href: "/visualize?type=ancestor",
      icon: GitFork,
      category: "charts",
      keywords: ["pedigree", "ancestors", "lineage", "parents"],
    },
    {
      id: "chart-descendant",
      label: t("navDescendantChart"),
      href: "/visualize?type=descendant",
      icon: Network,
      category: "charts",
      keywords: ["descendants", "offspring", "children", "progeny"],
    },
    {
      id: "chart-hourglass",
      label: t("navHourglassChart"),
      href: "/visualize?type=hourglass",
      icon: Timer,
      category: "charts",
      keywords: ["both", "ancestors", "descendants", "bidirectional"],
    },
    {
      id: "chart-fan",
      label: t("navFanChart"),
      href: "/visualize?type=fan",
      icon: Compass,
      category: "charts",
      keywords: ["circular", "radial", "wheel", "pedigree"],
    },
    {
      id: "chart-timeline",
      label: t("navTimeline"),
      href: "/visualize?type=timeline",
      icon: BarChart3,
      category: "charts",
      keywords: ["chronological", "dates", "birth", "death", "events"],
    },
    {
      id: "chart-bowtie",
      label: t("navBowtieChart"),
      href: "/visualize?type=bowtie",
      icon: Globe,
      category: "charts",
      keywords: ["couple", "both families", "marriage", "dual"],
    },
    {
      id: "chart-compact",
      label: t("navCompactTree"),
      href: "/visualize?type=compact",
      icon: Binary,
      category: "charts",
      keywords: ["dense", "small", "minimal", "overview"],
    },
    {
      id: "chart-statistics",
      label: t("navStatistics"),
      href: "/visualize?type=statistics",
      icon: BarChart3,
      category: "charts",
      keywords: ["demographics", "analytics", "data", "numbers", "stats"],
    },

    // Actions
    {
      id: "action-add-person",
      label: t("navAddPerson"),
      href: "/people/new",
      icon: UserPlus,
      category: "actions",
      keywords: ["create", "new", "add", "person", "member"],
    },

    // Admin
    {
      id: "admin-users",
      label: t("navManageUsers"),
      href: "/admin/users",
      icon: Users,
      category: "admin",
      keywords: ["users", "accounts", "roles", "permissions"],
      adminOnly: true,
    },
    {
      id: "admin-backup",
      label: t("navBackupGedcom"),
      href: "/admin/backup",
      icon: Database,
      category: "admin",
      keywords: ["backup", "export", "import", "gedcom", "restore", "data"],
      adminOnly: true,
    },
    {
      id: "admin-invites",
      label: t("navInvites"),
      href: "/admin/invites",
      icon: Key,
      category: "admin",
      keywords: ["invite", "invitation", "link", "share"],
      adminOnly: true,
    },
    {
      id: "admin-settings",
      label: t("navAdminSettings"),
      href: "/admin/settings",
      icon: Shield,
      category: "admin",
      keywords: ["system", "configuration", "admin", "site"],
      adminOnly: true,
    },
    {
      id: "admin-sources",
      label: t("navSources"),
      href: "/admin/sources",
      icon: BookOpen,
      category: "admin",
      keywords: ["source", "citation", "reference", "document"],
      adminOnly: true,
    },
    {
      id: "admin-metrics",
      label: t("navMetrics"),
      href: "/admin/metrics",
      icon: BarChart3,
      category: "admin",
      keywords: ["metrics", "monitoring", "performance", "health"],
      adminOnly: true,
    },
  ];
}

/**
 * Filter navigation items by query string.
 * Matches against label and keywords (case-insensitive).
 */
export function filterNavigationItems(
  query: string,
  isAdmin: boolean,
  t: TFunction
): Array<NavigationItem> {
  const lower = query.toLowerCase().trim();
  const items = getNavigationItems(t);

  return items.filter((item) => {
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
  isAdmin: boolean,
  t: TFunction
): Record<string, Array<NavigationItem>> {
  const filtered = filterNavigationItems(query, isAdmin, t);

  const groups: Record<string, Array<NavigationItem>> = {};
  for (const item of filtered) {
    const key = item.category;
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  }

  return groups;
}

/**
 * Get human-readable category label with translation support.
 */
export function getCategoryLabel(category: string, t: TFunction): string {
  const labels: Record<string, string> = {
    actions: t("groupQuickActions"),
    navigation: t("groupNavigation"),
    charts: t("groupCharts"),
    admin: t("groupAdmin"),
  };
  return labels[category] || category;
}
