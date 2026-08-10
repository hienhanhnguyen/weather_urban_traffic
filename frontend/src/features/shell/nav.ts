import {
  Building2,
  CloudSun,
  FileBarChart,
  Gauge,
  History,
  LayoutDashboard,
  Map,
  MapPin,
  Shapes,
  ShieldAlert,
  SlidersHorizontal,
  TriangleAlert,
  UserCog,
  type LucideIcon,
} from "lucide-react";
import type { User } from "@/lib/auth/types";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export interface NavSection {
  id: string;
  label?: string;
  items: NavItem[];
  // Rendering only.
  visible: (user: User) => boolean;
}

const anyone = () => true;

export const NAV_SECTIONS: NavSection[] = [
  {
    id: "personal",
    items: [
      { href: "/home", label: "Overview", icon: LayoutDashboard },
      { href: "/weather", label: "Weather", icon: CloudSun },
      { href: "/map", label: "Map", icon: Map },
      { href: "/locations", label: "My locations", icon: MapPin },
      { href: "/history", label: "Alert history", icon: History },
      { href: "/account", label: "Account", icon: UserCog },
    ],
    visible: anyone,
  },
  {
    id: "business",
    label: "Business",
    items: [
      { href: "/business/risk", label: "Risk assessment", icon: Gauge },
      { href: "/business/reports", label: "Reports", icon: FileBarChart },
    ],
    visible: (user) => user.accountType === "business",
  },
  {
    id: "gov",
    label: "Government",
    items: [
      { href: "/gov/dashboard", label: "Dashboard", icon: ShieldAlert },
      { href: "/gov/areas", label: "Areas", icon: Shapes },
      { href: "/gov/incidents", label: "Incidents", icon: TriangleAlert },
      { href: "/gov/scenarios", label: "Scenarios", icon: SlidersHorizontal },
      { href: "/gov/reports", label: "Reports", icon: Building2 },
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
