"use client";
import { useEffect, useState } from "react";
import { useLanguage } from "@/components/providers/language-provider";
import { createClient } from "@/lib/supabase/client";
import { hasSupabaseEnv } from "@/lib/env";
import { loadDemoStaff } from "@/lib/demo";
import { StaffMember, JobType } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";
import { Plus, Search } from "lucide-react";

const jobTypes: JobType[] = ["Doctor", "Specialist Doctor", "Head Nurse", "Nurse", "Administration"];

export default function StaffPage() {
  const { t } = useLanguage();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [jobFilter, setJobFilter] = useState<string>("all");
  const [deptFilter, setDeptFilter] = useState<string>("all");
  const [departments, setDepartments] = useState<any[]>([]);

  const load = async () => {
    setLoading(true);
    if (!hasSupabaseEnv()) {
      const demo = await loadDemoStaff();
      let filtered = demo;
      if (jobFilter !== "all") filtered = filtered.filter((s) => s.job_type === jobFilter);
      setStaff(filtered);
      setLoading(false);
      return;
    }
    const supabase = createClient();
    let query = supabase.from("staff_members").select("*, department:departments(*)").order("full_name");
    if (jobFilter !== "all") query = query.eq("job_type", jobFilter);
    if (deptFilter !== "all") query = query.eq("department_id", deptFilter);
    const { data } = await query;
    setStaff((data as StaffMember[]) ?? []);
    const { data: depts } = await supabase.from("departments").select("*").eq("is_active", true);
    setDepartments(depts ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [jobFilter, deptFilter]);

  const filtered = staff.filter((s) =>
    q === "" ||
    s.full_name.toLowerCase().includes(q.toLowerCase()) ||
    (s.his_user_id ?? "").toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("staff_directory")}</h1>
        <Link href="/staff/new"><Button><Plus className="h-4 w-4" /> {t("add_staff")}</Button></Link>
      </div>
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="ps-9" placeholder={t("search")} value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <Select value={jobFilter} onValueChange={setJobFilter}>
              <SelectTrigger className="md:w-48"><SelectValue placeholder={t("job_type")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("total")}</SelectItem>
                {jobTypes.map((j) => <SelectItem key={j} value={j}>{j}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={deptFilter} onValueChange={setDeptFilter}>
              <SelectTrigger className="md:w-48"><SelectValue placeholder={t("department")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("total")}</SelectItem>
                {departments.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name_ar || d.name_en}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">{t("no_data")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-start p-2">{t("full_name")}</th>
                    <th className="text-start p-2">{t("job_type")}</th>
                    <th className="text-start p-2">{t("department")}</th>
                    <th className="text-start p-2">{t("his_user_id")}</th>
                    <th className="text-start p-2">{t("status")}</th>
                    <th className="text-start p-2">{t("actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s) => (
                    <tr key={s.id} className="border-b hover:bg-muted/50">
                      <td className="p-2 font-medium">{s.full_name}</td>
                      <td className="p-2">{s.job_type}</td>
                      <td className="p-2">{s.department?.name_ar || s.department?.name_en || "-"}</td>
                      <td className="p-2">{s.his_user_id || "-"}</td>
                      <td className="p-2">
                        <Badge variant={s.registration_status === "registered" ? "success" : "warning"}>{s.registration_status}</Badge>
                      </td>
                      <td className="p-2">
                        <Link href={`/staff/${s.id}`}><Button size="sm" variant="outline">{t("view")}</Button></Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
