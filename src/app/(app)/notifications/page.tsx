"use client";
import { useEffect, useState } from "react";
import { useLanguage } from "@/components/providers/language-provider";
import { useUser } from "@/components/providers/user-provider";
import { createClient } from "@/lib/supabase/client";
import { Notification } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function NotificationsPage() {
  const { t } = useLanguage();
  const { user } = useUser();
  const [items, setItems] = useState<Notification[]>([]);
  const load = async () => {
    if (!user) return;
    const supabase = createClient();
    const { data } = await supabase.from("notifications").select("*").eq("recipient_id", user.id).order("created_at", { ascending: false });
    setItems((data as Notification[]) ?? []);
  };
  useEffect(() => { load(); }, [user]);
  const markRead = async (id: string) => {
    const supabase = createClient();
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    load();
  };
  const markAll = async () => {
    if (!user) return;
    const supabase = createClient();
    await supabase.from("notifications").update({ is_read: true }).eq("recipient_id", user.id);
    load();
  };
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("notifications")}</h1>
        <Button variant="outline" onClick={markAll}>{t("mark_all_read")}</Button>
      </div>
      <Card>
        <CardContent className="pt-6">
          {items.length === 0 ? <p className="text-muted-foreground">{t("no_data")}</p> : (
            <ul className="divide-y">
              {items.map((n) => (
                <li key={n.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{n.title}</p>
                    <p className="text-sm text-muted-foreground">{n.body}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {!n.is_read && <Badge variant="info">New</Badge>}
                    {!n.is_read && <Button size="sm" variant="outline" onClick={() => markRead(n.id)}>{t("mark_read")}</Button>}
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
