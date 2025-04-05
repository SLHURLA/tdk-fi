"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, MoreHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";

export type Lead = {
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
  receiveCash: number;
  receiveOnline: number;
  createdAt: string;
  updatedAt: string;
  type: string;
  init: boolean;
};

export const columns: ColumnDef<Lead>[] = [
  {
    accessorKey: "lead_id",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Customer ID.
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => (
      <Link
        href={
          row.original.init
            ? `/tsmgowp/lead/${row.original.lead_id}`
            : `/tsmgowp/lead/init/${row.original.lead_id}`
        }
        className="hover:underline text-left block"
      >
        {row.original.lead_id}
      </Link>
    ),
  },
  {
    accessorKey: "customerName",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Customer Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
  },
  {
    accessorKey: "phoneNo",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Phone No.
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
  },
  {
    accessorKey: "contactInfo",
    header: "Contact Info",
  },
  {
    accessorKey: "init",
    header: "Type",
    cell: ({ row }) => {
      // Access the value of "init" and render the corresponding label
      return row.original.init ? "Live" : "Fresh";
    },
  },

  // {
  //   accessorKey: "handoverDate",
  //   header: "Handover Date",
  //   cell: ({ row }) => row.original.handoverDate ?? "N/A",
  // },
  // {
  //   accessorKey: "expectedHandoverDate",
  //   header: "Expected Handover Date",
  //   cell: ({ row }) => row.original.expectedHandoverDate ?? "N/A",
  // },
  {
    accessorKey: "status",
    header: () => (
      <Button variant="ghost" className="justify-start w-full">
        Status
      </Button>
    ),
    cell: ({ row }) => {
      const lead = row.original;
      let statusStyle = "";

     if (lead.status === "WON") statusStyle = "bg-green-600 text-white px-2 py-1 rounded-md";
      else if (lead.status === "INPROGRESS") statusStyle = "bg-yellow-600 text-white px-2 py-1 rounded-md";
      else if (lead.status === "LOST") statusStyle = "bg-red-600 text-white px-2 py-1 rounded-md";
      else if (lead.status === "CLOSED") statusStyle = "bg-blue-600 text-white px-2 py-1 rounded-md";

      return <span className={`text-center text-xs block ${statusStyle}`}>{lead.status === "WON" ? "NOT_INITIALIZED" :lead.status}</span>;
      
    },
  },

  // Add the payment percentage column
  {
    id: "paymentPercentage",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Payment %
          {/* <ArrowUpDown className="ml-2 h-4 w-4" /> */}
        </Button>
      );
    },
    cell: ({ row }) => {
      const lead = row.original;
      const totalReceived = (lead.receiveCash || 0) + (lead.receiveOnline || 0);
      const percentage =
        lead.totalProjectCost > 0
          ? Math.round((totalReceived / lead.totalProjectCost) * 100)
          : 0;

      // Define colors based on payment percentage
      let progressBarColor = "";
      let badgeColor = "";

      if (percentage >= 100) {
        progressBarColor = "bg-green-600";
        badgeColor = "bg-green-600 text-white";
      } else if (percentage >= 75) {
        progressBarColor = "bg-emerald-600";
        badgeColor = "bg-emerald-600 text-white";
      } else if (percentage >= 50) {
        progressBarColor = "bg-yellow-600";
        badgeColor = "bg-yellow-600 text-white";
      } else if (percentage >= 25) {
        progressBarColor = "bg-orange-600";
        badgeColor = "bg-orange-600 text-white";
      } else {
        progressBarColor = "bg-red-600";
        badgeColor = "bg-red-600 text-white";
      }

      return (
        <div className="flex items-center">
          <div className="w-20 bg-gray-300 rounded-full h-2.5 mr-2">
            <div
              className={`h-2.5 rounded-full ${progressBarColor}`}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            ></div>
          </div>
          <span
            className={`px-2 py-1 rounded-md text-xs font-medium ${badgeColor}`}
          >
            {percentage}%
          </span>
        </div>
      );
    },
    sortingFn: (rowA, rowB) => {
      const getPercentage = (row: any) => {
        const totalReceived =
          (row.original.receiveCash || 0) + (row.original.receiveOnline || 0);
        return row.original.totalProjectCost > 0
          ? (totalReceived / row.original.totalProjectCost) * 100
          : 0;
      };

      return getPercentage(rowA) - getPercentage(rowB);
    },
  },

  // {
  //   accessorKey: "createdAt",
  //   header: "Created At",
  //   cell: ({ row }) =>
  //     new Date(row.original.createdAt).toLocaleDateString("en-IN", {
  //       year: "numeric",
  //       month: "short",
  //       day: "numeric",
  //     }),
  // },
  // {
  //   accessorKey: "updatedAt",
  //   header: "Updated At",
  //   cell: ({ row }) =>
  //     new Date(row.original.updatedAt).toLocaleDateString("en-IN", {
  //       year: "numeric",
  //       month: "short",
  //       day: "numeric",
  //     }),
  // },
  {
    id: "actions",
    cell: ({ row }) => {
      const lead = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(lead.phoneNo)}
            >
              Copy Contact
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>View Lead</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
