"use client";
import { useEffect, useState } from "react";
import { useLanguage } from "@/components/providers/language-provider";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = ["#1e3a8a","#0284c7","#16a34a","#ea580c","#dc2626"];

export default function AnalyticsPage() {
  const { t } = useLanguage();
  const [byJob, setByJob] = useState<any[]>([]);
  const [byScore, setByScore] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { hasSupabaseEnv } = await import("@/lib/env");
      let staffData: any[] = [];
      if (!hasSupabaseEnv()) {
        const { loadDemoStaff } = await import("@/lib/demo");
        staffData = await loadDemoStaff();
      } else {
        const supabase = createClient();
        const { data: st } = await supabase.from("staff_members").select("full_name, job_type, manual_score");
        staffData = st ?? [];
      }
      const jt: Record<string, number> = {};
      staffData.forEach((s: any) => { jt[s.job_type] = (jt[s.job_type] ?? 0) + 1; });
      setByJob(Object.entries(jt).map(([name, value]) => ({ name, value })));
      const scores = staffData.map((s: any) => ({ name: s.full_name, value: s.manual_score ?? 0 })).filter((s) => s.value > 0).sort((a, b) => b.value - a.value).slice(0, 10);
      setByScore(scores);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <p>{t("loading")}</p>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("analytics")}</h1>
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>{t("staff_by_job_type")}</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byJob}><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="value" fill="#1e3a8a" /></BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>أعلى 10 موظفين (نقاط +)</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byScore}><XAxis dataKey="name" hide /><YAxis /><Tooltip /><Bar dataKey="value" fill="#16a34a" /></BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
