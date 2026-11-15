"use client";
import { useLanguage } from "@/components/providers/language-provider";
import { useTheme } from "next-themes";
import { useUser } from "@/components/providers/user-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export default function SettingsPage() {
  const { t, lang, setLang } = useLanguage();
  const { theme, setTheme } = useTheme();
  const { profile, signOut } = useUser();
  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-2xl font-bold">{t("settings")}</h1>
      <Card>
        <CardHeader><CardTitle>{t("settings_profile")}</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <p className="font-medium">{profile?.full_name}</p>
          <p className="text-sm text-muted-foreground">{profile?.email}</p>
          <p className="text-sm">{profile?.role}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>{t("settings_appearance")}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>{t("theme")}</Label>
            <Button variant="outline" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>{theme === "dark" ? t("dark") : t("light")}</Button>
          </div>
          <div className="flex items-center justify-between">
            <Label>{t("language")}</Label>
            <Button variant="outline" onClick={() => setLang(lang === "ar" ? "en" : "ar")}>{lang === "ar" ? t("arabic") : t("english")}</Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <Button variant="destructive" onClick={signOut}>{t("logout")}</Button>
        </CardContent>
      </Card>
    </div>
  );
}
