import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

/** Query an admin server fn. */
export function useAdminQuery<T>(key: unknown[], fn: any, data: any = {}) {
  const call = useServerFn(fn) as (a: { data: any }) => Promise<T>;
  return useQuery({ queryKey: ["admin", ...key], queryFn: () => call({ data }) });
}

/** Wrap an admin mutation with toast + cache invalidation. */
export function useAdminAction(fn: any) {
  const call = useServerFn(fn) as (a: { data: any }) => Promise<any>;
  const qc = useQueryClient();
  return async (data: any, success = "Saved") => {
    try {
      const r = await call({ data });
      if (success) toast.success(success);
      qc.invalidateQueries();
      return r;
    } catch (e: any) {
      toast.error(e.message ?? "Error");
      throw e;
    }
  };
}
