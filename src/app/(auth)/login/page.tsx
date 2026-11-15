"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/providers/language-provider";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";

export default function LoginPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { toast.error(t("email_required")); return; }
    if (!password) { toast.error(t("password_required")); return; }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { toast.error(t("invalid_credentials")); return; }
    router.push("/dashboard");
    router.refresh();
  };

  return (
    <> 
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 h-12 w-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl">H</div>
        <CardTitle>{t("app_name")}</CardTitle>
        <CardDescription>{t("sign_in")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{t("email")}</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{t("password")}</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>{loading ? t("loading") : t("sign_in")}</Button>
          <div className="text-center text-sm space-y-1">
            <a href="/forgot-password" className="text-primary hover:underline block">{t("forgot_password")}</a>
            <a href="/signup" className="text-primary hover:underline block">إنشاء حساب جديد</a>
          </div>
        </form>
      </CardContent>
    </Card>
    <p className="mt-4 text-xs text-muted-foreground">created by Ali Abuelsoud and Ismail Ali</p>
    </>
  );
}
