"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLanguage } from "@/components/providers/language-provider";
import { createClient } from "@/lib/supabase/client";
import { StaffMember, Interaction, Followup, EscalationDraft } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";

export default function StaffProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useLanguage();
  const router = useRouter();
  const [staff, setStaff] = useState<StaffMember | null>(null);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [followups, setFollowups] = useState<Followup[]>([]);
  const [escalations, setEscalations] = useState<EscalationDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState("");

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: s } = await supabase.from("staff_members").select("*, department:departments(*)").eq("id", id).single();
      setStaff(s as StaffMember);
      const { data: ins } = await supabase.from("interactions").select("*").eq("staff_member_id", id).order("created_at", { ascending: false });
      setInteractions((ins as Interaction[]) ?? []);
      const { data: fus } = await supabase.from("follow_ups").select("*").eq("staff_member_id", id).order("due_date", { ascending: false });
      setFollowups((fus as Followup[]) ?? []);
      const { data: es } = await supabase.from("escalation_drafts").select("*").eq("staff_member_id", id).order("created_at", { ascending: false });
      setEscalations((es as EscalationDraft[]) ?? []);
      setLoading(false);
    };
    load();
  }, [id]);

  if (loading) return <p>{t("loading")}</p>;
  if (!staff) return <p>{t("no_data")}</p>;

  const totalPoints = interactions.reduce((sum, i) => sum + (i.eligible_points ?? 0), 0) + (staff?.manual_score ?? 0);

  const adjustScore = async (delta: number) => {
    if (!staff) return;
    const newScore = (staff.manual_score ?? 0) + delta;
    if (staff.id.startsWith("demo-")) {
      setStaff({ ...staff, manual_score: newScore });
      return;
    }
    const { hasSupabaseEnv } = await import("@/lib/env");
    if (!hasSupabaseEnv()) {
      setStaff({ ...staff, manual_score: newScore });
      return;
    }
    const supabase = (await import("@/lib/supabase/client")).createClient();
    const { useUser } = await import("@/components/providers/user-provider");
    await supabase.from("staff_members").update({ manual_score: newScore }).eq("id", staff.id);
    await supabase.from("audit_logs").insert({
      action: "manual_score_adjustment",
      entity_type: "staff_member",
      entity_id: staff.id,
      new_values: { delta, note },
      reason: note || null,
    });
    setStaff({ ...staff, manual_score: newScore });
    setNote("");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{staff.full_name}</h1>
        <div className="flex gap-2">
          <Link href={`/interactions/new?staff=${staff.id}`}><Button>{t("new_interaction")}</Button></Link>
          <Button variant="outline" onClick={() => router.back()}>{t("cancel")}</Button>
        </div>
      </div>
      <Card>
        <CardContent className="pt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div><p className="text-xs text-muted-foreground">{t("job_type")}</p><p className="font-medium">{staff.job_type}</p></div>
          <div><p className="text-xs text-muted-foreground">{t("department")}</p><p className="font-medium">{staff.department?.name_ar || staff.department?.name_en || "-"}</p></div>
          <div><p className="text-xs text-muted-foreground">{t("his_user_id")}</p><p className="font-medium">{staff.his_user_id || "-"}</p></div>
          <div><p className="text-xs text-muted-foreground">{t("status")}</p><Badge>{staff.registration_status}</Badge></div>
          <div><p className="text-xs text-muted-foreground">{t("eligible_points")}</p><p className="font-medium">{totalPoints}</p></div>
          <div className="md:col-span-4">
            <p className="text-xs text-muted-foreground mb-1">1+ / 1-</p>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => adjustScore(1)}>+1</Button>
              <Button size="sm" variant="outline" onClick={() => adjustScore(-1)}>-1</Button>
              <Input placeholder={t("notes")} value={note} onChange={(e) => setNote(e.target.value)} className="max-w-xs" />
              <span className="text-sm text-muted-foreground">manual: {staff.manual_score ?? 0}</span>
            </div>
          </div>
          <div><p className="text-xs text-muted-foreground">{t("created_at")}</p><p className="font-medium text-sm">{new Date(staff.created_at).toLocaleString()}</p></div>
        </CardContent>
      </Card>

      <Tabs defaultValue="interactions">
        <TabsList>
          <TabsTrigger value="interactions">{t("interactions")}</TabsTrigger>
          <TabsTrigger value="followups">{t("followups")}</TabsTrigger>
          <TabsTrigger value="escalations">{t("escalations")}</TabsTrigger>
        </TabsList>
        <TabsContent value="interactions">
          <Card>
            <CardContent className="pt-6">
              {interactions.length === 0 ? <p className="text-muted-foreground">{t("no_data")}</p> : (
                <ul className="space-y-2">
                  {interactions.map((i) => (
                    <li key={i.id} className="border rounded-md p-3">
                      <div className="flex justify-between">
                        <span className="font-medium">{i.outcome}</span>
                        <span className="text-xs text-muted-foreground">{new Date(i.created_at).toLocaleString()}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{i.notes}</p>
                      <p className="text-xs">{t("reporter_name")}: {i.reporter_name} — {i.reporter_phone}</p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="followups">
          <Card><CardContent className="pt-6">
            {followups.length === 0 ? <p className="text-muted-foreground">{t("no_data")}</p> : (
              <ul className="space-y-2">
                {followups.map((f) => (
                  <li key={f.id} className="border rounded-md p-3 flex justify-between">
                    <span>{f.notes}</span>
                    <Badge>{f.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent></Card>
        </TabsContent>
        <TabsContent value="escalations">
          <Card><CardContent className="pt-6">
            {escalations.length === 0 ? <p className="text-muted-foreground">{t("no_data")}</p> : (
              <ul className="space-y-2">
                {escalations.map((e) => (
                  <li key={e.id} className="border rounded-md p-3 flex justify-between">
                    <span>{e.total_points} pts</span>
                    <Badge>{e.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
