"use client";
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";

interface Vendor {
  id: number;
  TotalCharge: number;
  GivenCharge: number;
}

interface Lead {
  id: number;
  lead_id: string;
  customerName: string;
  store: string;
  status: string;
  vendors: Vendor[];
}

interface VendorBreakdown {
  id: number;
  createdAt: Date;
  updatedAt: Date;
  vendorId: number;
  leadId: number;
  totalAmt: number;
  totalGiven: number;
}

interface AssignedLeadsProps {
  leads: Lead[];
  vendor: VendorBreakdown[];
}

const AssignedLeads: React.FC<AssignedLeadsProps> = ({ leads, vendor }) => {
  // Create a map of lead IDs to vendor breakdowns for efficient lookup
  const vendorBreakdownMap = React.useMemo(() => {
    return vendor.reduce((acc, vendorBreakdown) => {
      acc[vendorBreakdown.leadId] = vendorBreakdown;
      return acc;
    }, {} as Record<number, VendorBreakdown>);
  }, [vendor]);

  return (
    <Card className="w-full mt-6 border shadow-sm rounded-lg">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Assigned Leads</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="p-4">Lead ID</TableHead>
                <TableHead className="p-4">Customer Name</TableHead>
                <TableHead className="p-4">Store</TableHead>
                <TableHead className="p-4">Status</TableHead>
                <TableHead className="p-4">Total Amt</TableHead>
                <TableHead className="p-4">Given Amt</TableHead>
                <TableHead className="p-4">Remaining Amt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads && leads.length > 0 ? (
                leads.map((lead) => {
                  // Find the corresponding vendor breakdown using lead ID
                  const vendorBreakdown = vendorBreakdownMap[lead.id];

                  return (
                    <TableRow key={lead.id}>
                      <TableCell className="p-4">
                        <Link href={`/tsmgowp/lead/${lead.lead_id}`}>
                          {lead.lead_id}{" "}
                        </Link>
                      </TableCell>
                      <TableCell className="p-4">{lead.customerName}</TableCell>
                      <TableCell className="p-4">{lead.store}</TableCell>
                      <TableCell className="p-4">
                        <p
                          className={`text-right font-bold w-fit py-1 px-4 rounded-md ${
                            lead.status === "WON"
                              ? "text-green-600 bg-lime-200"
                              : lead.status === "INPROGRESS"
                              ? "text-yellow-600 bg-yellow-100"
                              : "text-red-600 bg-red-200"
                          }`}
                        >
                          {lead.status}
                        </p>
                      </TableCell>
                      <TableCell className="p-4">
                        {vendorBreakdown
                          ? vendorBreakdown.totalAmt.toLocaleString()
                          : "N/A"}
                      </TableCell>
                      <TableCell className="p-4">
                        {vendorBreakdown
                          ? vendorBreakdown.totalGiven.toLocaleString()
                          : "N/A"}
                      </TableCell>
                      <TableCell className="p-4">
                        {vendorBreakdown
                          ? (
                              vendorBreakdown.totalAmt -
                              vendorBreakdown.totalGiven
                            ).toLocaleString()
                          : "N/A"}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="p-4 text-center text-gray-500"
                  >
                    No leads assigned.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default AssignedLeads;
