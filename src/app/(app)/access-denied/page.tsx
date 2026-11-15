import { useLanguage } from "@/components/providers/language-provider";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AccessDeniedPage() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
      <h1 className="text-3xl font-bold">403</h1>
      <p className="text-muted-foreground">Access Denied</p>
      <Link href="/dashboard"><Button>Dashboard</Button></Link>
    </div>
  );
}
