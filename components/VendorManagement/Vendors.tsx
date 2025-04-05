"use client";

import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { DataTable } from "@/components/VendorManagement/data-table";
import { columns } from "@/components/VendorManagement/columns";
import useSWR from "swr";

async function fetcher(url: string) {
  const response = await fetch(`/api/${url}`);

  if (!response.ok) {
    throw new Error("Failed to fetch vendors");
  }

  const data = await response.json();
  console.log("Vendors data", data.vendors);
  return data.vendors;
}

export default function Vendors({
  session,
  url,
}: {
  session: any;
  url: string;
}) {
  const { data, error, isLoading } = useSWR(url, fetcher);
  const { toast } = useToast();

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

  // Apply role-based filtering
  const filteredData =
    session?.user?.role === "STORE_MANAGER"
      ? data.filter((vendor: any) => vendor.city === session?.user?.store)
      : data;

  console.log("FETCHER", filteredData);

  return (
    <div className="container mx-auto py-10">
      <DataTable
        columns={columns}
        data={filteredData}
        userRole={session?.user?.role}
      />
    </div>
  );
}
