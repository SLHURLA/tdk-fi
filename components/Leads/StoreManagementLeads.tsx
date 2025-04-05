"use client";

import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { DataTable } from "@/components/StoreManagement/data-table";
import { columns } from "@/components/StoreManagement/columns";
import useSWR from "swr";
import LeadSummary from "../StoreManagement/LeadSummary";
import { useSession } from "next-auth/react";
interface Lead {
  id: number;
  lead_id: string;
  store: string;
  customerName: string;
  phoneNo: string;
  contactInfo: string;
  handoverDate: string | null;
  expectedHandoverDate: string | null;
  status: string;
  totalProjectCost: number;
  payInCash: number;
  payInOnline: number;
  createdAt: string;
  updatedAt: string;
  type: string;
  init: boolean;
}
async function fetcher(url: string) {
  const response = await fetch(`/api/${url}`);

  if (!response.ok) {
    throw new Error("Failed to fetch leads");
  }

  const data = await response.json();
  // Sort leads by createdAt in descending order (newest first)
  const sortedLeads = data.data.sort((a: any, b: any) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  console.log("SORTED LEADS", sortedLeads);
  return sortedLeads;
}

export default function StoreManagementLeads({ url }: { url: string }) {
  const { data, error, isLoading } = useSWR(url, fetcher);
  const { toast } = useToast();
  const { data: session } = useSession();
  useEffect(() => {
    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Oops, something went wrong!",
      });
    }
  }, [error, toast]);

  console.log("DATA", data);

  if (isLoading || !data) {
    return (
      <div className="container mx-auto py-10 flex justify-center ">
        <Loader2 className="animate-spin w-8 h-8 text-gray-500" />
      </div>
    );
  }

  // Filter leads if user is STORE_MANAGER
  const filteredData =
    session?.user?.role === "STORE_MANAGER"
      ? data.filter((lead: any) => lead.store === session?.user?.store)
      : data;

  const totalLeads = filteredData.length;
  const notInitializedLeads = filteredData.filter(
    (lead: Lead) => !lead.init
  ).length;
  const inProgressLeads = filteredData.filter(
    (lead: Lead) => lead.status === "INPROGRESS"
  ).length;

  return (
    <div className="container mx-auto py-10">
      <LeadSummary
        totalLeads={totalLeads}
        notInitializedLeads={notInitializedLeads}
        inProgressLeads={inProgressLeads}
      />

      <DataTable columns={columns} data={filteredData} />
    </div>
  );
}
