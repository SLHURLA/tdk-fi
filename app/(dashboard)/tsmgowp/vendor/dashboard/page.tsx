import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Vendors from "@/components/VendorManagement/Vendors";

export default async function AllVendorsPage() {
  const session = await getServerSession(authOptions);

  return <Vendors session={session} url="getAllVendors" />;
}
