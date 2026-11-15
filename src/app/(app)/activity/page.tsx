"use client";
import { useEffect, useState } from "react";
import { useLanguage } from "@/components/providers/language-provider";
import { createClient } from "@/lib/supabase/client";
import { AuditLog } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function ActivityPage() {
  const { t } = useLanguage();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const load = async () => {
    const supabase = createClient();
    const { data } = await supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(200);
    setLogs((data as AuditLog[]) ?? []);
  };
  useEffect(() => { load(); }, []);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("activity_logs")}</h1>
      <Card>
        <CardContent className="pt-6">
          {logs.length === 0 ? <p className="text-muted-foreground">{t("no_data")}</p> : (
            <ul className="divide-y text-sm">
              {logs.map((l) => (
                <li key={l.id} className="py-2 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{l.action} — {l.entity_type}</p>
                    <p className="text-muted-foreground text-xs">{new Date(l.created_at).toLocaleString()}</p>
                  </div>
                  <Badge variant="secondary">{l.entity_id?.slice(0, 8) ?? ""}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
