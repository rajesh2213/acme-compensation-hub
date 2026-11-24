import { BarChart3, Users, LayoutDashboard, type LucideIcon } from "lucide-react";

export type AppNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  title: string;
};

export const APP_NAV: AppNavItem[] = [
  {
    href: "/overview",
    label: "Overview",
    icon: LayoutDashboard,
    title: "Overview",
  },
  {
    href: "/employees",
    label: "Employees",
    icon: Users,
    title: "Employees",
  },
  {
    href: "/compensation",
    label: "Compensation",
    icon: BarChart3,
    title: "Compensation",
  },
];

export function titleForPath(pathname: string): string {
  if (pathname === "/employees/new") return "New employee";
  if (/^\/employees\/[^/]+\/edit$/.test(pathname)) return "Edit employee";
  if (/^\/employees\/[^/]+$/.test(pathname)) return "Employee";

  const match = APP_NAV.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );
  return match?.title ?? "ACME Compensation Hub";
}
