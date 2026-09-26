import { getApp } from "@/platform/registry";
import { getSession } from "@/platform/session";
import { NotImplementedApp } from "@/platform/ui/not-implemented";

export default async function RefundsPage() {
  const user = await getSession();
  return <NotImplementedApp app={getApp("refunds")} role={user.role} />;
}
