"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useLanguage } from "@/components/providers/language-provider";
import { createClient } from "@/lib/supabase/client";
import { Interaction, InteractionSupport } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function InteractionDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useLanguage();
  const [interaction, setInteraction] = useState<Interaction | null>(null);
  const [supports, setSupports] = useState<InteractionSupport[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: i } = await supabase.from("interactions").select("*, staff_member:staff_members(full_name)").eq("id", id).single();
      setInteraction(i as Interaction);
      const { data: s } = await supabase.from("interaction_support").select("*").eq("interaction_id", id);
      setSupports((s as InteractionSupport[]) ?? []);
      setLoading(false);
    };
    load();
  }, [id]);
  if (loading) return <p>{t("loading")}</p>;
  if (!interaction) return <p>{t("no_data")}</p>;
  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">{t("interaction_details")}</h1>
      <Card>
        <CardHeader><CardTitle>{(interaction as any).staff_member?.full_name}</CardTitle></CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-3 text-sm">
          <div><p className="text-muted-foreground">{t("date_time")}</p><p>{new Date(interaction.created_at).toLocaleString()}</p></div>
          <div><p className="text-muted-foreground">{t("outcome")}</p><p>{interaction.outcome}</p></div>
          <div><p className="text-muted-foreground">{t("reason")}</p><p>{interaction.reason_category} — {interaction.reason_detail}</p></div>
          <div><p className="text-muted-foreground">{t("reporter_name")}</p><p>{interaction.reporter_name}</p></div>
          <div><p className="text-muted-foreground">{t("reporter_phone")}</p><p>{interaction.reporter_phone}</p></div>
          <div><p className="text-muted-foreground">{t("eligible_points")}</p><Badge>{interaction.eligible_points}</Badge></div>
          <div className="md:col-span-2"><p className="text-muted-foreground">{t("notes")}</p><p>{interaction.notes}</p></div>
          <div className="md:col-span-2"><p className="text-muted-foreground">{t("support_provided")}</p><p>{supports.map((s) => s.support_type).join(", ")}</p></div>
        </CardContent>
      </Card>
    </div>
  );
}
