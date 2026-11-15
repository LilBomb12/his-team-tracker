"use client";
import { useEffect, useState } from "react";
import { useLanguage } from "@/components/providers/language-provider";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid } from "recharts";

const COLORS = ["#1e3a8a","#0284c7","#16a34a","#ea580c","#dc2626"];

export default function AnalyticsPage() {
  const { t } = useLanguage();
  const [byOutcome, setByOutcome] = useState<any[]>([]);
  const [byJob, setByJob] = useState<any[]>([]);
  const [byDept, setByDept] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: ins } = await supabase.from("interactions").select("outcome");
      const oc: Record<string, number> = {};
      (ins ?? []).forEach((i: any) => { oc[i.outcome] = (oc[i.outcome] ?? 0) + 1; });
      setByOutcome(Object.entries(oc).map(([name, value]) => ({ name, value })));
      const { data: staff } = await supabase.from("staff_members").select("job_type, registration_status, department_id, department:departments(name_ar,name_en)");
      const jt: Record<string, number> = {};
      (staff ?? []).forEach((s: any) => { jt[s.job_type] = (jt[s.job_type] ?? 0) + 1; });
      setByJob(Object.entries(jt).map(([name, value]) => ({ name, value })));
      const dd: Record<string, { total: number; registered: number }> = {};
      (staff ?? []).forEach((s: any) => {
        const d = s.department?.name_ar || s.department?.name_en || "Unknown";
        dd[d] = dd[d] || { total: 0, registered: 0 };
        dd[d].total++;
        if (s.registration_status === "registered") dd[d].registered++;
      });
      setByDept(Object.entries(dd).map(([name, v]) => ({ name, rate: v.total ? Math.round((v.registered / v.total) * 100) : 0 })));
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
          <CardHeader><CardTitle>{t("interactions_by_outcome")}</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart><Pie data={byOutcome} dataKey="value" nameKey="name" outerRadius={90} label>{byOutcome.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /></PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>{t("staff_by_job_type")}</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byJob}><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="value" fill="#1e3a8a" /></BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="md:col-span-2">
          <CardHeader><CardTitle>{t("completion_by_department")}</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byDept}><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="rate" fill="#16a34a" /></BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
