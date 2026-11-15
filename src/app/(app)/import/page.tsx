"use client";
import { useState } from "react";
import { useLanguage } from "@/components/providers/language-provider";
import { useUser } from "@/components/providers/user-provider";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import Papa from "papaparse";
import * as XLSX from "xlsx";

const SENSITIVE = ["p.s.","ps","pin","password","national id","phone","mobile","email","salary","address"];
const JOB_TYPES = ["Doctor","Specialist Doctor","Head Nurse","Nurse","Administration"];

function normalizeHeader(h: string) {
  return h.trim().toLowerCase().replace(/\s+/g, " ");
}

function isSensitive(h: string) {
  const n = normalizeHeader(h);
  return SENSITIVE.some((s) => n === s || n.includes(s));
}

function mapColumn(h: string): "full_name" | "job_type" | "his_user_id" | "legacy_status" | null {
  const n = normalizeHeader(h);
  if (n.includes("name") || n.includes("اسم")) return "full_name";
  if (n.includes("job") || n.includes("وظيفة") || n.includes("type")) return "job_type";
  if (n.includes("his") || n.includes("user id") || n.includes("userid") || n.includes("user_id")) return "his_user_id";
  if (n.includes("legacy") || n.includes("status") || n.includes("حالة")) return "legacy_status";
  return null;
}

interface ParsedRow {
  full_name: string;
  job_type: string;
  his_user_id: string | null;
  legacy_status: string | null;
  raw: any;
  valid: boolean;
  errors: string[];
  duplicate: boolean;
  duplicateOf?: string;
}

export default function ImportPage() {
  const { t } = useLanguage();
  const { user } = useUser();
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [importing, setImporting] = useState(false);

  const handleFile = async (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    let json: any[] = [];
    if (ext === "csv") {
      const text = await file.text();
      const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
      json = parsed.data as any[];
    } else {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf);
      const ws = wb.Sheets[wb.SheetNames[0]];
      json = XLSX.utils.sheet_to_json(ws);
    }

    if (!json.length) { toast.error("Empty file"); return; }

    const headers = Object.keys(json[0]);
    // build column mapping ignoring sensitive
    const mapping: Record<string, "full_name"|"job_type"|"his_user_id"|"legacy_status"|null> = {};
    for (const h of headers) {
      if (isSensitive(h)) { mapping[h] = null; continue; } // ignored entirely
      mapping[h] = mapColumn(h);
    }

    // existing staff for duplicate detection
    const supabase = createClient();
    const { data: existing } = await supabase.from("staff_members").select("id, full_name, his_user_id");
    const existingByHis = new Map((existing ?? []).map((e: any) => [e.his_user_id, e]));
    const existingByName = new Map((existing ?? []).map((e: any) => [e.full_name.trim().toLowerCase(), e]));

    const parsedRows: ParsedRow[] = json.map((r: any) => {
      const obj: any = { full_name: "", job_type: "", his_user_id: null, legacy_status: null };
      for (const h of headers) {
        const m = mapping[h];
        if (!m) continue;
        const val = r[h];
        if (m === "full_name") obj.full_name = String(val ?? "").trim();
        if (m === "job_type") obj.job_type = String(val ?? "").trim();
        if (m === "his_user_id") obj.his_user_id = val ? String(val).trim() : null;
        if (m === "legacy_status") obj.legacy_status = val ? String(val).trim() : null;
      }
      const errors: string[] = [];
      if (!obj.full_name) errors.push("Name required");
      if (!JOB_TYPES.includes(obj.job_type)) errors.push("Invalid job type");
      let duplicate = false;
      let duplicateOf: string | undefined;
      if (obj.his_user_id && existingByHis.has(obj.his_user_id)) { duplicate = true; duplicateOf = existingByHis.get(obj.his_user_id)?.id; }
      else if (existingByName.has(obj.full_name.trim().toLowerCase())) { duplicate = true; duplicateOf = existingByName.get(obj.full_name.trim().toLowerCase())?.id; }
      return { ...obj, raw: r, valid: errors.length === 0, errors, duplicate, duplicateOf };
    });

    setRows(parsedRows);
    const imported = parsedRows.filter((r) => r.valid && !r.duplicate).length;
    const dup = parsedRows.filter((r) => r.duplicate).length;
    const invalid = parsedRows.filter((r) => !r.valid).length;
    setSummary({ total: parsedRows.length, imported, duplicate: dup, invalid });
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  const confirmImport = async () => {
    setImporting(true);
    const supabase = createClient();
    // create import job
    const { data: job } = await supabase.from("import_jobs").insert({
      created_by: user?.id,
      file_name: "import",
      status: "processing",
      total_rows: rows.length,
    }).select().single();

    let importedCount = 0;
    for (const r of rows) {
      if (!r.valid) continue;
      if (r.duplicate) continue; // skip duplicates by default
      const { error } = await supabase.from("staff_members").insert({
        full_name: r.full_name,
        job_type: r.job_type,
        his_user_id: r.his_user_id,
        legacy_status: r.legacy_status,
        legacy_status_reviewed: false,
        is_active: true,
        registration_status: "not_started",
        created_by: user?.id,
        updated_by: user?.id,
      });
      if (!error) importedCount++;
    }
    if (job) {
      await supabase.from("import_jobs").update({
        status: "completed",
        imported_count: importedCount,
        duplicate_count: rows.filter((r) => r.duplicate).length,
        invalid_count: rows.filter((r) => !r.valid).length,
      }).eq("id", job.id);
    }
    await supabase.from("audit_logs").insert({
      actor_id: user?.id,
      action: "staff_import",
      entity_type: "import_job",
      entity_id: job?.id,
      new_values: { total: rows.length, imported: importedCount },
    });
    setImporting(false);
    toast.success(t("success"));
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("import_title")}</h1>
      <Card>
        <CardHeader><CardTitle>{t("import_upload")}</CardTitle></CardHeader>
        <CardContent>
          <input type="file" accept=".csv,.xlsx" onChange={onFileChange} />
          <p className="text-xs text-muted-foreground mt-2">Sensitive columns (PIN, P.S., passwords, national IDs, phone) are ignored.</p>
        </CardContent>
      </Card>

      {summary && (
        <Card>
          <CardHeader><CardTitle>{t("import_summary")}</CardTitle></CardHeader>
          <CardContent className="flex gap-4 flex-wrap">
            <Badge>Total: {summary.total}</Badge>
            <Badge variant="success">{t("imported_successfully")}: {summary.imported}</Badge>
            <Badge variant="warning">{t("duplicate_detected")}: {summary.duplicate}</Badge>
            <Badge variant="destructive">{t("invalid_row")}: {summary.invalid}</Badge>
          </CardContent>
        </Card>
      )}

      {rows.length > 0 && (
        <Card>
          <CardHeader><CardTitle>{t("import_preview")}</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="p-2 text-start">Name</th>
                    <th className="p-2 text-start">Job Type</th>
                    <th className="p-2 text-start">HIS User ID</th>
                    <th className="p-2 text-start">Legacy</th>
                    <th className="p-2 text-start">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 200).map((r, i) => (
                    <tr key={i} className="border-b">
                      <td className="p-2">{r.full_name}</td>
                      <td className="p-2">{r.job_type}</td>
                      <td className="p-2">{r.his_user_id}</td>
                      <td className="p-2">{r.legacy_status}</td>
                      <td className="p-2">
                        {!r.valid && <Badge variant="destructive">{t("invalid_row")}</Badge>}
                        {r.duplicate && <Badge variant="warning">{t("duplicate_detected")}</Badge>}
                        {r.valid && !r.duplicate && <Badge variant="success">{t("imported_successfully")}</Badge>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4">
              <Button onClick={confirmImport} disabled={importing}>{importing ? t("loading") : t("import_confirm")}</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
