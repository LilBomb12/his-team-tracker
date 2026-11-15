"use client";
import { useEffect, useState } from "react";
import { useLanguage } from "@/components/providers/language-provider";
import { createClient } from "@/lib/supabase/client";
import { hasSupabaseEnv } from "@/lib/env";
import { loadDemoStaff } from "@/lib/demo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function DashboardPage() {
  const { t } = useLanguage();
  const [stats, setStats] = useState<any>({});
  const [recent, setRecent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!hasSupabaseEnv()) {
        const demo = await loadDemoStaff();
        const counts: any = {};
        for (const jt of ["Doctor","Specialist Doctor","Head Nurse","Nurse","Administration"]) {
          counts[jt] = demo.filter((s) => s.job_type === jt).length;
        }
        setStats({ totalStaff: demo.length, counts, totalInteractions: 0, registered: 0, pending: demo.length, fuDue: 0, fuOverdue: 0, escPending: 0 });
        setRecent([]);
        setLoading(false);
        return;
      }
      const supabase = createClient();
      const { count: totalStaff } = await supabase.from("staff_members").select("*", { count: "exact", head: true });
      const counts: any = {};
      for (const jt of ["Doctor","Specialist Doctor","Head Nurse","Nurse","Administration"]) {
        const { count } = await supabase.from("staff_members").select("*", { count: "exact", head: true }).eq("job_type", jt);
        counts[jt] = count ?? 0;
      }
      const { count: totalInteractions } = await supabase.from("interactions").select("*", { count: "exact", head: true });
      const { count: registered } = await supabase.from("staff_members").select("*", { count: "exact", head: true }).eq("registration_status", "registered");
      const { count: pending } = await supabase.from("staff_members").select("*", { count: "exact", head: true }).neq("registration_status", "registered");
      const { count: fuDue } = await supabase.from("follow_ups").select("*", { count: "exact", head: true }).in("status", ["pending","scheduled","in_progress"]);
      const { count: fuOverdue } = await supabase.from("follow_ups").select("*", { count: "exact", head: true }).eq("status", "overdue");
      const { count: escPending } = await supabase.from("escalation_drafts").select("*", { count: "exact", head: true }).in("status", ["draft","pending_review"]);
      const { data: rec } = await supabase.from("interactions").select("*, staff_member:staff_members(full_name)").order("created_at", { ascending: false }).limit(8);
      setStats({ totalStaff, counts, totalInteractions, registered, pending, fuDue, fuOverdue, escPending });
      setRecent(rec ?? []);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <p>{t("loading")}</p>;

  const cards = [
    { label: t("total_staff"), value: stats.totalStaff ?? 0 },
    { label: t("total_doctors"), value: stats.counts?.Doctor ?? 0 },
    { label: t("total_specialists"), value: stats.counts?.["Specialist Doctor"] ?? 0 },
    { label: t("total_head_nurses"), value: stats.counts?.["Head Nurse"] ?? 0 },
    { label: t("total_nurses"), value: stats.counts?.Nurse ?? 0 },
    { label: t("total_admin"), value: stats.counts?.Administration ?? 0 },
    { label: t("total_interactions"), value: stats.totalInteractions ?? 0 },
    { label: t("successfully_registered"), value: stats.registered ?? 0 },
    { label: t("pending_registration"), value: stats.pending ?? 0 },
    { label: t("followups_due"), value: stats.fuDue ?? 0 },
    { label: t("overdue_followups"), value: stats.fuOverdue ?? 0 },
    { label: t("escalation_drafts_pending"), value: stats.escPending ?? 0 },
  ];

  const chartData = Object.entries(stats.counts ?? {}).map(([k, v]) => ({ name: k, value: v }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("dashboard")}</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">{c.label}</p>
              <p className="text-2xl font-bold">{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>{t("staff_by_job_type")}</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="value" fill="#1e3a8a" /></BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>{t("recently_registered")}</CardTitle></CardHeader>
          <CardContent>
            {recent.length === 0 ? <p className="text-muted-foreground">{t("no_data")}</p> : (
              <ul className="divide-y text-sm">
                {recent.map((r: any) => (
                  <li key={r.id} className="py-2 flex justify-between">
                    <span>{r.staff_member?.full_name}</span>
                    <Badge variant="secondary">{r.outcome}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>{t("upcoming_followups")}</CardTitle></CardHeader>
          <CardContent><Link href="/followups" className="text-primary hover:underline">View</Link></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>{t("escalation_drafts_pending")}</CardTitle></CardHeader>
          <CardContent><Link href="/escalations" className="text-primary hover:underline">View</Link></CardContent>
        </Card>
      </div>
    </div>
  );
}
