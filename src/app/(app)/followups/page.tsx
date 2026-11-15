"use client";
import { useEffect, useState } from "react";
import { useLanguage } from "@/components/providers/language-provider";
import { useUser } from "@/components/providers/user-provider";
import { createClient } from "@/lib/supabase/client";
import { Followup } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function FollowupsPage() {
  const { t } = useLanguage();
  const { user } = useUser();
  const [items, setItems] = useState<Followup[]>([]);
  const [loading, setLoading] = useState(true);
  const [staffId, setStaffId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [priority, setPriority] = useState("medium");
  const [staffList, setStaffList] = useState<any[]>([]);

  const load = async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase.from("follow_ups").select("*, staff_member:staff_members(full_name)").order("due_date");
    setItems((data as Followup[]) ?? []);
    const { data: s } = await supabase.from("staff_members").select("id, full_name").order("full_name");
    setStaffList(s ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!staffId || !dueDate) return;
    const supabase = createClient();
    await supabase.from("follow_ups").insert({
      staff_member_id: staffId,
      assigned_to: user?.id,
      due_date: dueDate,
      notes: notes || null,
      priority,
      status: "scheduled",
      created_by: user?.id,
    });
    setStaffId(""); setDueDate(""); setNotes("");
    load();
  };

  const complete = async (id: string) => {
    const supabase = createClient();
    await supabase.from("follow_ups").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", id);
    load();
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("followups")}</h1>
      <Card>
        <CardHeader><CardTitle>{t("create")}</CardTitle></CardHeader>
        <CardContent className="grid md:grid-cols-4 gap-3">
          <Select value={staffId} onValueChange={setStaffId}>
            <SelectTrigger><SelectValue placeholder={t("staff_directory")} /></SelectTrigger>
            <SelectContent>
              {staffList.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={create}>{t("create")}</Button>
          <Input className="md:col-span-4" placeholder={t("notes")} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          {loading ? <p>{t("loading")}</p> : items.length === 0 ? <p className="text-muted-foreground">{t("no_data")}</p> : (
            <ul className="divide-y">
              {items.map((f: any) => (
                <li key={f.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{f.staff_member?.full_name}</p>
                    <p className="text-sm text-muted-foreground">{new Date(f.due_date).toLocaleDateString()} — {f.notes}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge>{f.status}</Badge>
                    {f.status !== "completed" && <Button size="sm" onClick={() => complete(f.id)}>{t("approve")}</Button>}
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
