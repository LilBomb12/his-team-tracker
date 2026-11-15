"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/components/providers/language-provider";
import {
  LayoutDashboard, Users, FileText, ClipboardList, AlertTriangle, BarChart3, Building2, UserCog, Bell, Activity, Settings, LogOut
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/dashboard", key: "dashboard", icon: LayoutDashboard },
  { href: "/staff", key: "staff_directory", icon: Users },
  { href: "/escalations", key: "escalations", icon: AlertTriangle },
  { href: "/analytics", key: "analytics", icon: BarChart3 },
  { href: "/notifications", key: "notifications", icon: Bell },
  { href: "/activity", key: "activity_logs", icon: Activity },
  { href: "/settings", key: "settings", icon: Settings },
];

export function Sidebar({ collapsed }: { collapsed?: boolean }) {
  const pathname = usePathname();
  const { t, dir } = useLanguage();
  return (
    <aside className={cn("hidden md:flex flex-col border-e bg-card h-screen sticky top-0", collapsed ? "w-16" : "w-64")}>
      <div className="p-4 border-b">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold">H</div>
          {!collapsed && <span className="font-semibold">{t("app_name")}</span>}
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto p-2 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link key={item.href} href={item.href} className={cn("flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors", active ? "bg-primary text-primary-foreground" : "hover:bg-accent")}>
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{t(item.key as any)}</span>}
            </Link>
          );
        })}
      </nav>
      <div className="p-2 border-t text-xs text-muted-foreground text-center">
        Demo mode (no login)
      </div>
    </aside>
  );
}
