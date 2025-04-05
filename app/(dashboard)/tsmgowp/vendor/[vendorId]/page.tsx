"use client";
import React from "react";
import useSWR from "swr";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import TransactionNotes from "@/components/VendorManagement/VendorTransaction";
import AssignedLeads from "@/components/VendorManagement/AssignedLeads";
import VendorOverview from "@/components/VendorManagement/VendorOverview";
import VendorFinancialSummary from "@/components/VendorManagement/FinancialSummary";
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
  transactions: TransactionNote[];
}
type TransactionNote = {
  leadId: number;
  id: number;
  amount: number;
  transactionName: string;
  transactionType: "CASH_IN" | "CASH_OUT";
  paymentMethod: string;
  remark: string | null;
  transactionDate: Date;
  vendorId: number | null;
};
const fetcher = async (url: string) => {
  const response = await fetch(`/api${url}`);
  if (!response.ok) {
    throw new Error("Failed to fetch vendor");
  }

  const data = await response.json();
  console.log(data);
  return data;
};

const VendorDetailPage = () => {
  const { vendorId } = useParams();
  const { data, error, isLoading } = useSWR(`/getVendor/${vendorId}`, fetcher);

  if (isLoading) {
    return (
      <div className="container mx-auto py-10 flex justify-center">
        <Loader2 className="animate-spin w-8 h-8 text-gray-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 text-center">
        Error fetching vendor details.
      </div>
    );
  }

  const { vendor, breakDown } = data;
  console.log("vendor:", vendor);

  // Collect all transactions from all leads
  const transactions = vendor.leads.flatMap((lead: Lead) =>
    lead.transactions.map((transaction: any) => ({
      ...transaction,
      lead_id: lead.lead_id,
      customerName: lead.customerName,
    }))
  );

  return (
    <div className="container mx-auto lg:p-4 p-2 flex flex-col items-center">
      <div className=" lg:text-4xl text-2xl font-semibold mr-auto mb-4">
        <div>{vendor.name}</div>
      </div>
      <VendorFinancialSummary
        totalCharge={Number(vendor.TotalCharge)}
        givenCharge={Number(vendor.GivenCharge)}
      />

      {/* Vendor Details */}
      <VendorOverview {...vendor} />

      <AssignedLeads leads={vendor.leads} vendor={breakDown} />

      {/* Transaction Notes */}
      <TransactionNotes transactions={transactions} />
    </div>
  );
};

export default VendorDetailPage;
