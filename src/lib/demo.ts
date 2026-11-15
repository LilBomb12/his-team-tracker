import Papa from "papaparse";
import { StaffMember } from "@/lib/types";

export async function loadDemoStaff(): Promise<StaffMember[]> {
  const res = await fetch("/staff_import.csv");
  const text = await res.text();
  const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
  const rows = (parsed.data as any[]) ?? [];
  return rows.map((r, i) => ({
    id: `demo-${i}`,
    full_name: r["Full Name"] ?? "",
    job_type: r["Job Type"] ?? "Nurse",
    department_id: null,
    his_user_id: r["HIS User ID"] || null,
    legacy_status: r["Legacy Status"] || null,
    legacy_status_reviewed: false,
    is_active: true,
    registration_status: "not_started",
    manual_score: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    created_by: null,
    updated_by: null,
    department: null,
  })) as StaffMember[];
}
