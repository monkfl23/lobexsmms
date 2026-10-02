import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { updateProfile } from "@/lib/customer.functions";
import { useI18n } from "@/lib/i18n";
import { Field, PageHeader, Panel } from "@/components/lobex/ui";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/_customer/account")({
  head: () => ({ meta: [{ title: "Account — LOBEX SMM" }] }),
  component: Account,
});

function Account() {
  const { t, lang, setLang } = useI18n();
  const { user } = Route.useRouteContext();
  const save = useServerFn(updateProfile);
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => (await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle()).data,
  });
  const [name, setName] = useState("");
  const [pw, setPw] = useState("");
  useEffect(() => setName(data?.display_name ?? ""), [data]);

  return (
    <>
      <PageHeader title={t("account")} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel className="space-y-4">
          <Field label="Email"><input className="field opacity-70" value={user.email ?? ""} disabled /></Field>
          <Field label="Display name"><input className="field" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} /></Field>
          <Field label="Language">
            <select className="field" value={lang} onChange={(e) => setLang(e.target.value as "en" | "ar")}>
              <option value="en">English</option><option value="ar">العربية</option>
            </select>
          </Field>
          <Button onClick={async () => { try { await save({ data: { display_name: name } }); toast.success("Saved"); qc.invalidateQueries(); } catch (e: any) { toast.error(e.message); } }}>{t("save")}</Button>
        </Panel>
        <Panel className="space-y-4">
          <h2 className="font-semibold">Change password</h2>
          <Field label="New password"><input className="field" type="password" value={pw} onChange={(e) => setPw(e.target.value)} minLength={8} /></Field>
          <Button
            variant="outline"
            onClick={async () => {
              if (pw.length < 8) { toast.error("At least 8 characters"); return; }
              const { error } = await supabase.auth.updateUser({ password: pw });
              if (error) toast.error(error.message); else { toast.success("Password updated"); setPw(""); }
            }}
          >Update password</Button>
        </Panel>
      </div>
    </>
  );
}
