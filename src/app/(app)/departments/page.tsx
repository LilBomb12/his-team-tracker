"use client";
import { useEffect, useState } from "react";
import { useLanguage } from "@/components/providers/language-provider";
import { useUser } from "@/components/providers/user-provider";
import { createClient } from "@/lib/supabase/client";
import { Department } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function DepartmentsPage() {
  const { t } = useLanguage();
  const { user, role } = useUser();
  const [deps, setDeps] = useState<Department[]>([]);
  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const load = async () => {
    const supabase = createClient();
    const { data } = await supabase.from("departments").select("*").order("name_ar");
    setDeps((data as Department[]) ?? []);
  };
  useEffect(() => { load(); }, []);
  const add = async () => {
    if (!nameAr || !nameEn) return;
    const supabase = createClient();
    await supabase.from("departments").insert({ name_ar: nameAr, name_en: nameEn, is_active: true });
    setNameAr(""); setNameEn("");
    load();
    toast.success(t("success"));
  };
  const toggle = async (d: Department) => {
    const supabase = createClient();
    await supabase.from("departments").update({ is_active: !d.is_active }).eq("id", d.id);
    load();
  };
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("departments")}</h1>
      {role === "admin" && (
        <Card>
          <CardHeader><CardTitle>{t("create")}</CardTitle></CardHeader>
          <CardContent className="flex gap-2">
            <Input placeholder="Name AR" value={nameAr} onChange={(e) => setNameAr(e.target.value)} />
            <Input placeholder="Name EN" value={nameEn} onChange={(e) => setNameEn(e.target.value)} />
            <Button onClick={add}>{t("create")}</Button>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardContent className="pt-6">
          <ul className="divide-y">
            {deps.map((d) => (
              <li key={d.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium">{d.name_ar} / {d.name_en}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={d.is_active ? "success" : "secondary"}>{d.is_active ? "Active" : "Inactive"}</Badge>
                  {role === "admin" && <Button size="sm" variant="outline" onClick={() => toggle(d)}>{d.is_active ? "Deactivate" : "Activate"}</Button>}
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
