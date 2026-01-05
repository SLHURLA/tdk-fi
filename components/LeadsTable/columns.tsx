"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, MoreHorizontal } from "lucide-react";
import { usePathname } from "next/navigation";

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
  init: boolean;
};

const columns: ColumnDef<Lead>[] = [
  {
    accessorKey: "lead_id",
    header: ({ column }) => (
      <Button
        variant="ghost"
        className="justify-start w-full"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Customer ID.
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
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
    accessorKey: "store",
    header: () => (
      <Button variant="ghost" className="justify-start w-full">
        Store
      </Button>
    ),
  },
  {
    accessorKey: "customerName",
    header: () => (
      <Button variant="ghost" className="justify-start w-full">
        Customer Name
      </Button>
    ),
  },
  {
    accessorKey: "phoneNo",
    header: () => (
      <Button variant="ghost" className="justify-start w-full">
        Phone No.
      </Button>
    ),
  },
  {
    accessorKey: "contactInfo",
    header: () => (
      <Button variant="ghost" className="justify-start w-full">
        Contact Info
      </Button>
    ),
  },
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

      if (lead.status === "WON")
        statusStyle = "bg-green-600 text-white px-2 py-1 rounded-md";
      else if (lead.status === "INPROGRESS")
        statusStyle = "bg-yellow-600 text-white px-2 py-1 rounded-md";
      else if (lead.status === "LOST")
        statusStyle = "bg-red-600 text-white px-2 py-1 rounded-md";
      else if (lead.status === "CLOSED")
        statusStyle = "bg-blue-600 text-white px-2 py-1 rounded-md";

      return (
        <span className={`text-center text-xs block ${statusStyle}`}>
          {lead.status === "WON" ? "NOT_INITIALIZED" : lead.status}
        </span>
      );
    },
  },
  {
    id: "paymentPercentage",
    header: () => (
      <Button variant="ghost" className="justify-start w-full">
        Payment %
      </Button>
    ),
    cell: ({ row }) => {
      const lead = row.original;
      const totalReceived = (lead.receiveCash || 0) + (lead.receiveOnline || 0);
      const percentage =
        lead.totalProjectCost > 0
          ? Math.round((totalReceived / lead.totalProjectCost) * 100)
          : 0;

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
        <div className="flex items-center w-full">
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
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const lead = row.original;

      const onDelete = async () => {
        const confirmDelete = confirm(
          "Are you sure you want to delete this uninitialized lead?"
        );
        if (!confirmDelete) return;

        try {
          // Note: Ensure your API route is at /api/deleteLead as per previous setup
          const response = await fetch("/api/deleteLead", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: lead.id }),
          });

          if (response.ok) {
            alert("Lead deleted successfully");
            window.location.reload(); 
          } else {
            const error = await response.text();
            alert(error || "Failed to delete lead");
          }
        } catch (err) {
          console.error("Delete error:", err);
          alert("An error occurred while deleting the lead");
        }
      };

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
            <DropdownMenuItem>
              <Link href={lead.init ? `/tsmgowp/lead/${lead.lead_id}` : `/tsmgowp/lead/init/${lead.lead_id}`}>
                View Lead
              </Link>
            </DropdownMenuItem>

            {/* SOFT DELETE OPTION FOR UNINITIALIZED LEADS */}
            {!lead.init && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={onDelete}
                  className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
                >
                  Delete Lead
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

// Function to dynamically filter columns based on pathname
export const getColumns = () => {
  const pathname = usePathname();

  return columns.filter((column) => {
    // Remove payment column if the path is "/tsmgowp/leads/all"
    if (
      column.id === "paymentPercentage" &&
      pathname === "/tsmgowp/leads/all"
    ) {
      return false;
    }
    return true;
  });
};