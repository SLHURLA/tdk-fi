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
import Link from "next/link"; // Import the Link component

export type Vendor = {
  id: number;
  name: string;
  mobileNo: string;
  address: string;
  city: string;
  TotalCharge: number;
  GivenCharge: number;
};

export const columns: ColumnDef<Vendor>[] = [
  {
    accessorKey: "id",
    header: "ID",
    cell: ({ row }) => (
      <Link
        href={`/tsmgowp/vendor/${row.original.id}`}
        className=" hover:underline"
      >
        {row.original.id}
      </Link>
    ),
  },
  {
    accessorKey: "name",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Vendor Name
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <Link
        href={`/tsmgowp/vendor/${row.original.id}`}
        className=" hover:underline"
      >
        {row.original.name}
      </Link>
    ),
  },
  {
    accessorKey: "mobileNo",
    header: "Mobile No.",
    cell: ({ row }) => (
      <span className="font-medium">{row.original.mobileNo}</span>
    ),
  },
  {
    accessorKey: "city",
    header: "City",
  },
  {
    accessorKey: "TotalCharge",
    header: "Total Charge",
    cell: ({ row }) => `₹${row.original.TotalCharge.toLocaleString()}`,
  },
  {
    accessorKey: "GivenCharge",
    header: "Given Charge",
    cell: ({ row }) => `₹${row.original.GivenCharge.toLocaleString()}`,
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const vendor = row.original;

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
              onClick={() => navigator.clipboard.writeText(vendor.mobileNo)}
            >
              Copy Contact
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>View Vendor</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
