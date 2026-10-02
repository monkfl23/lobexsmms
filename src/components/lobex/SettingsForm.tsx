import { useEffect, useState } from "react";
import { adminSettings, adminSaveSettings } from "@/lib/admin.functions";
import { useAdminAction, useAdminQuery } from "./useAdmin";
import { Field, Panel } from "./ui";
import { Button } from "@/components/ui/button";

export type SettingField = { key: string; label: string; type?: "text" | "textarea" | "toggle" | "number"; hint?: string };

export function SettingsForm({ fields }: { fields: SettingField[] }) {
  const { data } = useAdminQuery<Record<string, string>>(["settings"], adminSettings);
  const save = useAdminAction(adminSaveSettings);
  const [v, setV] = useState<Record<string, string>>({});
  useEffect(() => { if (data) setV(data); }, [data]);

  return (
    <Panel glow className="max-w-2xl space-y-4">
      {fields.map((f) => (
        <Field key={f.key} label={f.label} hint={f.hint}>
          {f.type === "textarea" ? (
            <textarea className="field min-h-28" value={v[f.key] ?? ""} onChange={(e) => setV({ ...v, [f.key]: e.target.value })} />
          ) : f.type === "toggle" ? (
            <select className="field" value={v[f.key] ?? "false"} onChange={(e) => setV({ ...v, [f.key]: e.target.value })}>
              <option value="true">Enabled</option><option value="false">Disabled</option>
            </select>
          ) : (
            <input className="field" type={f.type === "number" ? "number" : "text"} value={v[f.key] ?? ""} onChange={(e) => setV({ ...v, [f.key]: e.target.value })} />
          )}
        </Field>
      ))}
      <Button onClick={() => save(Object.fromEntries(fields.map((f) => [f.key, v[f.key] ?? ""])))}>Save settings</Button>
    </Panel>
  );
}
