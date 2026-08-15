import {
  Building2,
  CloudSun,
  FileBarChart,
  Gauge,
  History,
  LayoutDashboard,
  Map,
  MapPin,
  Route,
  Shapes,
  ShieldAlert,
  SlidersHorizontal,
  TriangleAlert,
  UserCog,
  type LucideIcon,
} from "lucide-react";
import type { User } from "@/lib/auth/types";
import type { Messages } from "@/i18n/messages";

type NavItemKey = keyof Messages["nav"]["items"];
type NavSectionKey = keyof Messages["nav"]["sections"];

export interface NavItem {
  href: string;
  labelKey: NavItemKey;
  icon: LucideIcon;
}

export interface NavSection {
  id: string;
  labelKey?: NavSectionKey;
  items: NavItem[];
  visible: (user: User) => boolean;
}

const isAdmin = (user: User) => user.roles.includes("admin");

// Shared between the personal section and the admin's own trailing section.
const ACCOUNT: NavItem = {
  href: "/account",
  labelKey: "account",
  icon: UserCog,
};

export const NAV_SECTIONS: NavSection[] = [
  {
    id: "personal",
    items: [
      { href: "/home", labelKey: "overview", icon: LayoutDashboard },
      { href: "/weather", labelKey: "weather", icon: CloudSun },
      { href: "/map", labelKey: "map", icon: Map },
      { href: "/locations", labelKey: "locations", icon: MapPin },
      { href: "/routes", labelKey: "routes", icon: Route },
      { href: "/history", labelKey: "history", icon: History },
      ACCOUNT,
    ],
    // An admin works the government console; the personal tools are not part
    // of that job, so only the account tab below survives for them.
    visible: (user) => !isAdmin(user),
  },
  {
    id: "business",
    labelKey: "business",
    items: [
      { href: "/business/risk", labelKey: "businessRisk", icon: Gauge },
      { href: "/business/reports", labelKey: "businessReports", icon: FileBarChart },
    ],
    visible: (user) => user.accountType === "business",
  },
  {
    id: "gov",
    labelKey: "government",
    items: [
      { href: "/gov/dashboard", labelKey: "govDashboard", icon: ShieldAlert },
      { href: "/gov/areas", labelKey: "govAreas", icon: Shapes },
      { href: "/gov/incidents", labelKey: "govIncidents", icon: TriangleAlert },
      { href: "/gov/scenarios", labelKey: "govScenarios", icon: SlidersHorizontal },
      { href: "/gov/reports", labelKey: "govReports", icon: Building2 },
    ],
    visible: isAdmin,
  },
  {
    id: "adminPersonal",
    labelKey: "personal",
    items: [ACCOUNT],
    visible: isAdmin,
  },
];

export function visibleSections(user: User): NavSection[] {
  return NAV_SECTIONS.filter((section) => section.visible(user));
}

// Where the app starts for this user - the first item of their first section,
// so nobody lands on a page their own sidebar does not list.
export function landingPath(user: User | null | undefined): string {
  return user && isAdmin(user) ? "/gov/dashboard" : "/home";
}

export function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
