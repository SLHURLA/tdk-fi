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
import { cn } from "@/lib/utils";

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
        className="justify-start w-full text-zinc-400 hover:text-white hover:bg-zinc-800/50 p-0 px-2"
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
        className="hover:underline text-left block text-zinc-300 font-medium"
      >
        {row.original.lead_id}
      </Link>
    ),
  },
  {
    accessorKey: "store",
    header: () => (
      <span className="text-zinc-400 font-medium text-sm px-2">Store</span>
    ),
    cell: ({ row }) => <span className="text-zinc-300 px-2">{row.getValue("store")}</span>
  },
  {
    accessorKey: "customerName",
    header: () => (
      <span className="text-zinc-400 font-medium text-sm px-2">Customer Name</span>
    ),
    cell: ({ row }) => <span className="text-zinc-300 px-2">{row.getValue("customerName")}</span>
  },
  {
    accessorKey: "phoneNo",
    header: () => (
      <span className="text-zinc-400 font-medium text-sm px-2">Phone No.</span>
    ),
    cell: ({ row }) => <span className="text-zinc-300 px-2">{row.getValue("phoneNo")}</span>
  },
  {
    accessorKey: "contactInfo",
    header: () => (
      <span className="text-zinc-400 font-medium text-sm px-2">Contact Info</span>
    ),
    cell: ({ row }) => <span className="text-zinc-300 px-2">{row.getValue("contactInfo")}</span>
  },
  {
    accessorKey: "status",
    header: () => (
      <span className="text-zinc-400 font-medium text-sm px-2">Status</span>
    ),
    cell: ({ row }) => {
      const lead = row.original;
      let statusStyle = "";

      if (lead.status === "WON")
        statusStyle = "bg-green-900/40 text-green-400 border border-green-800/50";
      else if (lead.status === "INPROGRESS")
        statusStyle = "bg-amber-900/40 text-amber-400 border border-amber-800/50";
      else if (lead.status === "LOST")
        statusStyle = "bg-red-900/40 text-red-400 border border-red-800/50";
      else if (lead.status === "CLOSED")
        statusStyle = "bg-blue-900/40 text-blue-400 border border-blue-800/50";

      return (
        <span className={cn("text-center text-[10px] font-bold uppercase tracking-wider block px-2 py-1 rounded-md", statusStyle)}>
          {lead.status === "WON" ? "NOT_INITIALIZED" : lead.status}
        </span>
      );
    },
  },
  {
    id: "paymentPercentage",
    header: () => (
      <span className="text-zinc-400 font-medium text-sm px-2">Payment %</span>
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
        progressBarColor = "bg-green-500";
        badgeColor = "text-green-400";
      } else if (percentage >= 50) {
        progressBarColor = "bg-amber-500";
        badgeColor = "text-amber-400";
      } else {
        progressBarColor = "bg-red-500";
        badgeColor = "text-red-400";
      }

      return (
        <div className="flex items-center w-full px-2">
          <div className="flex-1 bg-zinc-800 rounded-full h-1.5 mr-3 max-w-[100px]">
            <div
              className={cn("h-1.5 rounded-full transition-all duration-500", progressBarColor)}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            ></div>
          </div>
          <span className={cn("text-[10px] font-bold min-w-[30px]", badgeColor)}>
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
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0 text-zinc-400 hover:text-white hover:bg-zinc-800">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800 text-zinc-300">
            <DropdownMenuLabel className="text-zinc-500">Actions</DropdownMenuLabel>
            <DropdownMenuItem
              className="hover:bg-zinc-800 focus:bg-zinc-800 cursor-pointer"
              onClick={() => navigator.clipboard.writeText(lead.phoneNo)}
            >
              Copy Contact
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-zinc-800" />
            <DropdownMenuItem className="hover:bg-zinc-800 focus:bg-zinc-800 cursor-pointer">
              View Lead
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

export const getColumns = () => {
  const pathname = usePathname();

  return columns.filter((column) => {
    if (
      column.id === "paymentPercentage" &&
      pathname === "/tsmgowp/leads/all"
    ) {
      return false;
    }
    return true;
  });
};