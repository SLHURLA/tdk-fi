import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Leads from "@/components/Leads/Leads";
export default async function AllLeadsPage() {
  const session = await getServerSession(authOptions);

  return <Leads session={session} url="getWorkingLeads" />;
}
