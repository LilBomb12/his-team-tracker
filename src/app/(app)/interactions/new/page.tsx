"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useLanguage } from "@/components/providers/language-provider";
import { useUser } from "@/components/providers/user-provider";
import { createClient } from "@/lib/supabase/client";
import { StaffMember } from "@/lib/types";
import { calculatePoints } from "@/lib/scoring";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Search } from "lucide-react";
import Link from "next/link";

const outcomes = ["registered","started_not_completed","busy","postponed","refused","not_available","avoided","technical_problem","needs_training","other"];
const outcomeKeys: Record<string,string> = {
  registered:"outcome_registered", started_not_completed:"outcome_started_not_completed", busy:"outcome_busy",
  postponed:"outcome_postponed", refused:"outcome_refused", not_available:"outcome_not_available",
  avoided:"outcome_avoided", technical_problem:"outcome_technical_problem", needs_training:"outcome_needs_training", other:"outcome_other"
};
const reasonCategories = ["clinical_workload","postponement","non_cooperation","technical","training","other"];
const reasonKeys: Record<string,string> = { clinical_workload:"reason_clinical", postponement:"reason_postponement", non_cooperation:"reason_non_cooperation", technical:"reason_technical", training:"reason_training", other:"reason_other" };
const supports = [
  { value: "laptop", key: "support_laptop" },
  { value: "internet", key: "support_internet" },
  { value: "step_by_step", key: "support_step_by_step" },
  { value: "demo", key: "support_demo" },
  { value: "login", key: "support_login" },
  { value: "troubleshoot", key: "support_troubleshoot" },
  { value: "followup", key: "support_followup" },
  { value: "none", key: "support_none" },
  { value: "other", key: "support_other" },
];

function NewInteractionInner() {
  const { t } = useLanguage();
  const { user } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const preStaff = searchParams.get("staff");

  const [staffQuery, setStaffQuery] = useState("");
  const [staffResults, setStaffResults] = useState<StaffMember[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [reporterName, setReporterName] = useState("");
  const [reporterPhone, setReporterPhone] = useState("");
  const [outcome, setOutcome] = useState("");
  const [reasonCategory, setReasonCategory] = useState("");
  const [reasonDetail, setReasonDetail] = useState("");
  const [notes, setNotes] = useState("");
  const [supportTypes, setSupportTypes] = useState<string[]>([]);
  const [hadLaptop, setHadLaptop] = useState(false);
  const [hadInternet, setHadInternet] = useState(false);
  const [explanationProvided, setExplanationProvided] = useState(false);
  const [explicitRefusal, setExplicitRefusal] = useState(false);
  const [followupScheduled, setFollowupScheduled] = useState(false);
  const [followupDate, setFollowupDate] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (preStaff) {
      const load = async () => {
        const supabase = createClient();
        const { data } = await supabase.from("staff_members").select("*, department:departments(*)").eq("id", preStaff).single();
        if (data) setSelectedStaff(data as StaffMember);
      };
      load();
    }
  }, [preStaff]);

  const searchStaff = async () => {
    const supabase = createClient();
    const { data } = await supabase.from("staff_members").select("*, department:departments(*)")
      .or(`full_name.ilike.%${staffQuery}%,his_user_id.ilike.%${staffQuery}%`).limit(20);
    setStaffResults((data as StaffMember[]) ?? []);
  };

  const toggleSupport = (v: string) => {
    setSupportTypes((prev) => prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff) { toast.error("Select staff"); return; }
    if (!reporterName || !reporterPhone) { toast.error("Reporter required"); return; }
    if (!outcome) { toast.error("Outcome required"); return; }
    setLoading(true);
    const points = calculatePoints({
      outcome: outcome as any,
      reason_category: (reasonCategory || null) as any,
      explicit_refusal: explicitRefusal,
      had_laptop: hadLaptop,
      had_internet: hadInternet,
      explanation_provided: explanationProvided,
      followup_scheduled: followupScheduled,
    });
    const supabase = createClient();
    const { data: interaction, error } = await supabase.from("interactions").insert({
      staff_member_id: selectedStaff.id,
      reporter_name: reporterName,
      reporter_phone: reporterPhone,
      recorded_by: user?.id,
      interaction_type: "visit",
      outcome,
      reason_category: reasonCategory || null,
      reason_detail: reasonDetail || null,
      notes: notes || null,
      had_laptop: hadLaptop,
      had_internet: hadInternet,
      explanation_provided: explanationProvided,
      explicit_refusal: explicitRefusal,
      followup_scheduled: followupScheduled,
      eligible_points: points,
    }).select().single();

    if (error) { setLoading(false); toast.error(error.message); return; }

    if (supportTypes.length > 0) {
      await supabase.from("interaction_support").insert(
        supportTypes.map((s) => ({ interaction_id: interaction.id, support_type: s }))
      );
    }

    // update staff registration status if registered
    if (outcome === "registered") {
      await supabase.from("staff_members").update({ registration_status: "registered", updated_by: user?.id }).eq("id", selectedStaff.id);
    }

    // escalation draft if threshold reached
    const { data: allIns } = await supabase.from("interactions").select("eligible_points").eq("staff_member_id", selectedStaff.id);
    const total = (allIns ?? []).reduce((a: number, b: any) => a + (b.eligible_points ?? 0), 0);
    if (total >= 3) {
      const { data: existing } = await supabase.from("escalation_drafts").select("id").eq("staff_member_id", selectedStaff.id).in("status", ["draft","pending_review"]);
      if (!existing || existing.length === 0) {
        await supabase.from("escalation_drafts").insert({
          staff_member_id: selectedStaff.id,
          total_points: total,
          status: "pending_review",
          draft_text: "",
        });
      }
    }

    // followup
    if (followupScheduled && followupDate) {
      await supabase.from("follow_ups").insert({
        staff_member_id: selectedStaff.id,
        interaction_id: interaction.id,
        assigned_to: user?.id,
        due_date: followupDate,
        notes: notes || null,
        priority: "medium",
        status: "scheduled",
        created_by: user?.id,
      });
    }

    // audit log
    await supabase.from("audit_logs").insert({
      actor_id: user?.id,
      action: "create_interaction",
      entity_type: "interaction",
      entity_id: interaction.id,
      new_values: interaction,
    });

    setLoading(false);
    toast.success(t("success"));
    router.push(`/interactions/${interaction.id}`);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">{t("new_interaction")}</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <Card>
          <CardHeader><CardTitle>{t("staff_directory")}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {selectedStaff ? (
              <div className="flex items-center justify-between border rounded-md p-3">
                <div>
                  <p className="font-medium">{selectedStaff.full_name}</p>
                  <p className="text-sm text-muted-foreground">{selectedStaff.job_type} — {selectedStaff.department?.name_ar || selectedStaff.department?.name_en}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setSelectedStaff(null)}>{t("cancel")}</Button>
              </div>
            ) : (
              <>
                <div className="flex gap-2">
                  <Input placeholder={t("search")} value={staffQuery} onChange={(e) => setStaffQuery(e.target.value)} />
                  <Button type="button" onClick={searchStaff}><Search className="h-4 w-4" /></Button>
                </div>
                {staffResults.length > 0 && (
                  <ul className="border rounded-md divide-y max-h-60 overflow-y-auto">
                    {staffResults.map((s) => (
                      <li key={s.id} className="p-2 hover:bg-muted cursor-pointer" onClick={() => { setSelectedStaff(s); setStaffResults([]); }}>
                        {s.full_name} — {s.job_type} — {s.his_user_id}
                      </li>
                    ))}
                  </ul>
                )}
                <Link href="/staff/new" className="text-sm text-primary hover:underline">{t("add_staff")}</Link>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{t("reporter_name")}</CardTitle></CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{t("reporter_name")} *</Label>
              <Input value={reporterName} onChange={(e) => setReporterName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>{t("reporter_phone")} *</Label>
              <Input value={reporterPhone} onChange={(e) => setReporterPhone(e.target.value)} required />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{t("outcome")}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Select value={outcome} onValueChange={setOutcome}>
              <SelectTrigger><SelectValue placeholder={t("outcome")} /></SelectTrigger>
              <SelectContent>
                {outcomes.map((o) => <SelectItem key={o} value={o}>{t(outcomeKeys[o] as any)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={reasonCategory} onValueChange={setReasonCategory}>
              <SelectTrigger><SelectValue placeholder={t("reason")} /></SelectTrigger>
              <SelectContent>
                {reasonCategories.map((r) => <SelectItem key={r} value={r}>{t(reasonKeys[r] as any)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input placeholder={t("reason")} value={reasonDetail} onChange={(e) => setReasonDetail(e.target.value)} />
            <Textarea placeholder={t("notes")} value={notes} onChange={(e) => setNotes(e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <label className="flex items-center gap-2 text-sm"><Checkbox checked={hadLaptop} onCheckedChange={(v) => setHadLaptop(!!v)} /> Laptop</label>
              <label className="flex items-center gap-2 text-sm"><Checkbox checked={hadInternet} onCheckedChange={(v) => setHadInternet(!!v)} /> Internet</label>
              <label className="flex items-center gap-2 text-sm"><Checkbox checked={explanationProvided} onCheckedChange={(v) => setExplanationProvided(!!v)} /> Explanation</label>
              <label className="flex items-center gap-2 text-sm"><Checkbox checked={explicitRefusal} onCheckedChange={(v) => setExplicitRefusal(!!v)} /> Explicit refusal</label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{t("support_provided")}</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {supports.map((s) => (
              <label key={s.value} className="flex items-center gap-2 text-sm">
                <Checkbox checked={supportTypes.includes(s.value)} onCheckedChange={() => toggleSupport(s.value)} />
                {t(s.key as any)}
              </label>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{t("followups")}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={followupScheduled} onCheckedChange={(v) => setFollowupScheduled(!!v)} />
              {t("followup_date")}
            </label>
            {followupScheduled && (
              <Input type="date" value={followupDate} onChange={(e) => setFollowupDate(e.target.value)} />
            )}
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button type="submit" disabled={loading}>{loading ? t("loading") : t("save")}</Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>{t("cancel")}</Button>
        </div>
      </form>
    </div>
  );
}

export default function NewInteractionPage() {
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <NewInteractionInner />
    </Suspense>
  );
}
