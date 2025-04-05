"use client";

import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { DataTable } from "@/components/LeadsTable/data-table";
import { getColumns } from "@/components/LeadsTable/columns";
import useSWR from "swr";

async function fetcher(url: string) {
  const response = await fetch(`/api/${url}`);

  if (!response.ok) {
    throw new Error("Failed to fetch leads");
  }

  const data = await response.json();

  // Sort leads by createdAt in descending order (newest first)
  const sortedLeads = data.leads.sort((a: any, b: any) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  console.log("SORTED LEADS", sortedLeads);
  return sortedLeads;
}

export default function Leads({ session, url }: { session: any; url: string }) {
  const { data, error, isLoading } = useSWR(url, fetcher);
  const { toast } = useToast();
  const columns = getColumns();

  useEffect(() => {
    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Oops, something went wrong!",
      });
    }
  }, [error, toast]);

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

  return (
    <div className="container mx-auto py-10">
      <DataTable columns={columns} data={filteredData} />
    </div>
  );
}
