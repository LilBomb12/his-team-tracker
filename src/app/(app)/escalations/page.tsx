"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLanguage } from "@/components/providers/language-provider";
import { useUser } from "@/components/providers/user-provider";
import { createClient } from "@/lib/supabase/client";
import { EscalationDraft } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";

export default function EscalationsPage() {
  const { t } = useLanguage();
  const [items, setItems] = useState<EscalationDraft[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data } = await supabase.from("escalation_drafts").select("*, staff_member:staff_members(full_name, job_type, department_id)").order("created_at", { ascending: false });
      setItems((data as EscalationDraft[]) ?? []);
      setLoading(false);
    };
    load();
  }, []);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("escalations")}</h1>
      <Card>
        <CardContent className="pt-6">
          {loading ? <p>{t("loading")}</p> : items.length === 0 ? <p className="text-muted-foreground">{t("no_data")}</p> : (
            <ul className="divide-y">
              {items.map((e: any) => (
                <li key={e.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{e.staff_member?.full_name}</p>
                    <p className="text-sm text-muted-foreground">{e.total_points} pts — {new Date(e.created_at).toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge>{e.status}</Badge>
                    <Link href={`/escalations/${e.id}`}><Button size="sm" variant="outline">{t("view")}</Button></Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
