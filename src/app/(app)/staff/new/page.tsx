"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/providers/language-provider";
import { useUser } from "@/components/providers/user-provider";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { staffSchema } from "@/lib/validations";

const jobTypes = ["Doctor", "Specialist Doctor", "Head Nurse", "Nurse", "Administration"];

export default function NewStaffPage() {
  const { t } = useLanguage();
  const { user } = useUser();
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [jobType, setJobType] = useState("");
  const [deptId, setDeptId] = useState<string>("");
  const [hisUserId, setHisUserId] = useState("");
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data } = await supabase.from("departments").select("*").eq("is_active", true);
      setDepartments(data ?? []);
    };
    load();
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = staffSchema.safeParse({ full_name: fullName, job_type: jobType, department_id: deptId || null, his_user_id: hisUserId || null });
    if (!parsed.success) { toast.error(t("error")); return; }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.from("staff_members").insert({
      full_name: fullName,
      job_type: jobType,
      department_id: deptId || null,
      his_user_id: hisUserId || null,
      is_active: true,
      registration_status: "not_started",
      created_by: user?.id ?? null,
      updated_by: user?.id ?? null,
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success(t("success"));
    router.push("/staff");
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">{t("add_staff")}</h1>
      <Card>
        <CardHeader><CardTitle>{t("add_staff")}</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>{t("full_name")}</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>{t("job_type")}</Label>
              <Select value={jobType} onValueChange={setJobType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {jobTypes.map((j) => <SelectItem key={j} value={j}>{j}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("department")}</Label>
              <Select value={deptId} onValueChange={setDeptId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {departments.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name_ar || d.name_en}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("his_user_id")}</Label>
              <Input value={hisUserId} onChange={(e) => setHisUserId(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>{loading ? t("loading") : t("save")}</Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>{t("cancel")}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
