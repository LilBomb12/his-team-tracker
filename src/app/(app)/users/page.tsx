"use client";
import { useEffect, useState } from "react";
import { useLanguage } from "@/components/providers/language-provider";
import { useUser } from "@/components/providers/user-provider";
import { createClient } from "@/lib/supabase/client";
import { Profile } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function UsersPage() {
  const { t } = useLanguage();
  const { role } = useUser();
  const [users, setUsers] = useState<Profile[]>([]);
  const load = async () => {
    const supabase = createClient();
    const { data } = await supabase.from("profiles").select("*").order("full_name");
    setUsers((data as Profile[]) ?? []);
  };
  useEffect(() => { load(); }, []);
  const changeRole = async (id: string, newRole: string) => {
    if (role !== "admin") { toast.error("Admin only"); return; }
    const supabase = createClient();
    await supabase.from("profiles").update({ role: newRole }).eq("id", id);
    load();
    toast.success(t("success"));
  };
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("users_roles")}</h1>
      <Card>
        <CardContent className="pt-6">
          <ul className="divide-y">
            {users.map((u) => (
              <li key={u.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium">{u.full_name}</p>
                  <p className="text-sm text-muted-foreground">{u.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  {role === "admin" ? (
                    <Select value={u.role} onValueChange={(v) => changeRole(u.id, v)}>
                      <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="supervisor">Supervisor</SelectItem>
                        <SelectItem value="team_member">Team Member</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : <Badge>{u.role}</Badge>}
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
