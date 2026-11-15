"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLanguage } from "@/components/providers/language-provider";
import { useUser } from "@/components/providers/user-provider";
import { createClient } from "@/lib/supabase/client";
import { EscalationDraft, Interaction, StaffMember } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function EscalationReviewPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useLanguage();
  const { user, role } = useUser();
  const router = useRouter();
  const [draft, setDraft] = useState<EscalationDraft | null>(null);
  const [staff, setStaff] = useState<StaffMember | null>(null);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [text, setText] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: d } = await supabase.from("escalation_drafts").select("*").eq("id", id).single();
      setDraft(d as EscalationDraft);
      if (d) {
        const { data: s } = await supabase.from("staff_members").select("*, department:departments(*)").eq("id", d.staff_member_id).single();
        setStaff(s as StaffMember);
        const { data: ins } = await supabase.from("interactions").select("*").eq("staff_member_id", d.staff_member_id).order("created_at");
        setInteractions((ins as Interaction[]) ?? []);
        const dept = (s as any)?.department?.name_ar || (s as any)?.department?.name_en || "";
        const supportTypes = Array.from(new Set((ins ?? []).flatMap((i: any) => [])));
        const dates = (ins ?? []).map((i: any) => new Date(i.created_at).toLocaleDateString("ar")).join("، ");
        const reasons = (ins ?? []).map((i: any) => i.reason_detail || i.outcome).filter(Boolean).join("؛ ");
        const generated = `السيد الأستاذ / [اسم المدير المختص]\nتحية طيبة وبعد،\n\nنحيط سيادتكم علمًا بأنه في إطار جهود فريق دعم وتفعيل نظام المعلومات الصحية (HIS)، تم إجراء عدة محاولات لمساعدة السيد/ة ${s?.full_name}، بوظيفة ${s?.job_type}، بقسم ${dept}، لاستكمال إجراءات التسجيل على النظام.\n\nوقد قام الفريق بتقديم الدعم اللازم، مع توثيق المحاولات التي تمت في التواريخ التالية: ${dates}.\n\nووفقًا للسجلات الموثقة، لا تزال الحالة بحاجة إلى متابعة، وذلك للأسباب التالية:\n${reasons}.\n\nنرجو من سيادتكم التكرم بمراجعة الحالة والتوجيه بما ترونه مناسبًا لاستكمال إجراءات التسجيل.\n\nوتفضلوا بقبول فائق الاحترام والتقدير.\n\nفريق دعم وتفعيل نظام HIS`;
        setText(d.draft_text && d.draft_text.length > 0 ? d.draft_text : generated);
      }
      setLoading(false);
    };
    load();
  }, [id]);

  const review = async (action: "approve" | "reject" | "return") => {
    if (!draft) return;
    if (role === "team_member") { toast.error("Not allowed"); return; }
    if (draft && user?.id === undefined) return;
    const supabase = createClient();
    const newStatus = action === "approve" ? "approved" : action === "reject" ? "rejected" : "returned";
    await supabase.from("escalation_drafts").update({
      status: newStatus,
      draft_text: text,
      supervisor_notes: notes,
      reviewed_by: user?.id,
      reviewed_at: new Date().toISOString(),
    }).eq("id", id);
    await supabase.from("escalation_reviews").insert({
      escalation_draft_id: id,
      reviewer_id: user?.id,
      action,
      notes,
    });
    await supabase.from("audit_logs").insert({
      actor_id: user?.id,
      action: `escalation_${action}`,
      entity_type: "escalation_draft",
      entity_id: id,
      new_values: { status: newStatus },
    });
    toast.success(t("success"));
    router.push("/escalations");
  };

  const copy = async () => { await navigator.clipboard.writeText(text); toast.success("Copied"); };
  const exportPdf = () => { window.print(); };

  if (loading) return <p>{t("loading")}</p>;
  if (!draft) return <p>{t("no_data")}</p>;

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("escalation_review")}</h1>
        <Badge>{draft.status}</Badge>
      </div>
      <Card>
        <CardHeader><CardTitle>{staff?.full_name}</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>{staff?.job_type} — {(staff as any)?.department?.name_ar}</p>
          <p>{t("eligible_points")}: {draft.total_points}</p>
          <p>{t("total_interactions")}: {interactions.length}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Draft</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={16} />
          <Textarea placeholder={t("notes")} value={notes} onChange={(e) => setNotes(e.target.value)} />
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => review("approve")} disabled={role === "team_member"}>{t("approve")}</Button>
            <Button variant="destructive" onClick={() => review("reject")} disabled={role === "team_member"}>{t("reject")}</Button>
            <Button variant="outline" onClick={() => review("return")} disabled={role === "team_member"}>{t("return_info")}</Button>
            <Button variant="secondary" onClick={copy}>Copy</Button>
            <Button variant="secondary" onClick={exportPdf}>PDF</Button>
          </div>
          {role === "team_member" && <p className="text-sm text-muted-foreground">Supervisor approval required.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
