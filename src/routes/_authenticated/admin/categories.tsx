import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { adminCategories, adminSaveCategory, adminDeleteCategory } from "@/lib/admin.functions";
import { useAdminAction, useAdminQuery } from "@/components/lobex/useAdmin";
import { DataTable, Field, PageHeader, Panel, td } from "@/components/lobex/ui";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/_authenticated/admin/categories")({
  head: () => ({ meta: [{ title: "Categories — LOBEX SMM Admin" }] }),
  component: CategoriesPage,
});

function CategoriesPage() {
  const { data } = useAdminQuery<any[]>(["categories"], adminCategories);
  const save = useAdminAction(adminSaveCategory);
  const del = useAdminAction(adminDeleteCategory);
  const [name, setName] = useState("");
  const [sort, setSort] = useState("0");

  return (
    <>
      <PageHeader title="Categories" />
      <Panel className="mb-6">
        <form className="flex flex-wrap items-end gap-3" onSubmit={async (e) => { e.preventDefault(); await save({ name, sort: Number(sort) || 0, enabled: true }); setName(""); }}>
          <div className="min-w-56 flex-1"><Field label="New category"><input className="field" value={name} onChange={(e) => setName(e.target.value)} required /></Field></div>
          <div className="w-28"><Field label="Sort"><input className="field" type="number" value={sort} onChange={(e) => setSort(e.target.value)} /></Field></div>
          <Button type="submit">Add</Button>
        </form>
      </Panel>
      <DataTable head={["ID", "Name", "Sort", "Enabled", ""]} empty={!data?.length}>
        {data?.map((c) => <Row key={c.id} c={c} save={save} del={del} />)}
      </DataTable>
    </>
  );
}

function Row({ c, save, del }: { c: any; save: any; del: any }) {
  const [name, setName] = useState(c.name);
  const [sort, setSort] = useState(String(c.sort));
  return (
    <tr>
      <td className={td + " font-mono text-primary"}>{c.id}</td>
      <td className={td}><input className="field" value={name} onChange={(e) => setName(e.target.value)} /></td>
      <td className={td + " w-28"}><input className="field" type="number" value={sort} onChange={(e) => setSort(e.target.value)} /></td>
      <td className={td}><Switch checked={c.enabled} onCheckedChange={(v) => save({ id: c.id, name: c.name, sort: c.sort, enabled: v }, "")} /></td>
      <td className={td + " whitespace-nowrap"}>
        <Button size="sm" variant="outline" onClick={() => save({ id: c.id, name, sort: Number(sort) || 0, enabled: c.enabled })}>Save</Button>
        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => confirm("Delete category? Services will become uncategorized.") && del({ id: c.id }, "Deleted")}>Delete</Button>
      </td>
    </tr>
  );
}
