import { getApp } from "@/platform/registry";
import { getSession } from "@/platform/session";
import { NotImplementedApp } from "@/platform/ui/not-implemented";

export default async function KycPage() {
  const user = await getSession();
  return <NotImplementedApp app={getApp("kyc")} role={user.role} />;
}
