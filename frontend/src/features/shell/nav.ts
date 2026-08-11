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

const anyone = () => true;

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
      { href: "/account", labelKey: "account", icon: UserCog },
    ],
    visible: anyone,
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
    visible: (user) => user.roles.includes("admin"),
  },
];

export function visibleSections(user: User): NavSection[] {
  return NAV_SECTIONS.filter((section) => section.visible(user));
}

export function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
