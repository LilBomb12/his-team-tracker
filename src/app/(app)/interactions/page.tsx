"use client";
import { useEffect, useState } from "react";
import { useLanguage } from "@/components/providers/language-provider";
import { createClient } from "@/lib/supabase/client";
import { Interaction } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function InteractionsPage() {
  const { t } = useLanguage();
  const [items, setItems] = useState<Interaction[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data } = await supabase.from("interactions").select("*, staff_member:staff_members(full_name)").order("created_at", { ascending: false }).limit(100);
      setItems((data as Interaction[]) ?? []);
      setLoading(false);
    };
    load();
  }, []);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("interactions")}</h1>
        <Link href="/interactions/new"><Button>{t("new_interaction")}</Button></Link>
      </div>
      <Card>
        <CardContent className="pt-6">
          {loading ? <p>{t("loading")}</p> : items.length === 0 ? <p className="text-muted-foreground">{t("no_data")}</p> : (
            <ul className="divide-y">
              {items.map((i: any) => (
                <li key={i.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{i.staff_member?.full_name ?? i.staff_member_id}</p>
                    <p className="text-sm text-muted-foreground">{i.outcome} — {new Date(i.created_at).toLocaleString()}</p>
                  </div>
                  <Link href={`/interactions/${i.id}`}><Button size="sm" variant="outline">{t("view")}</Button></Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
