import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Leads from "@/components/Leads/Leads";

export default async function ClosedLeadsPage() {
  const session = await getServerSession(authOptions);

  // Assuming your API endpoint for closed leads is "getClosedLeads"
  return <Leads session={session} url="getClosedLeads" />;
}