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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import Link from "next/link";
import { toast } from "@/hooks/use-toast";

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
  // ✅ Added: required for correct profit calculation (matches SingleLead formula)
  totalExp: number;   // vendor expenses
  totalGST: number;   // GST amount
  createdAt: string;
  updatedAt: string;
  init: boolean;
};

const handleDelete = async (id: number) => {
  try {
    const res = await fetch("/api/deleteLead", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ leadId: id }),
    });

    const data = await res.json();

    if (res.ok) {
      toast({
        title: "Lead Deleted",
        description: "The lead has been permanently removed.",
      });
      window.location.reload();
    } else {
      toast({
        variant: "destructive",
        title: "Delete Failed",
        description: data.message,
      });
    }
  } catch (error) {
    toast({
      variant: "destructive",
      title: "Error",
      description: "Something went wrong",
    });
  }
};

export const columns: ColumnDef<Lead>[] = [
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
    header: "Store",
  },
  {
    accessorKey: "customerName",
    header: "Customer Name",
  },
  {
    accessorKey: "phoneNo",
    header: "Phone No.",
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      const styles: Record<string, string> = {
        WON: "bg-green-600",
        INPROGRESS: "bg-yellow-600",
        LOST: "bg-red-600",
        CLOSED: "bg-blue-600",
      };
      return (
        <span
          className={`px-2 py-1 rounded-md text-white text-xs font-medium ${
            styles[status] || "bg-gray-500"
          }`}
        >
          {status === "WON" ? "NOT_INITIALIZED" : status}
        </span>
      );
    },
  },
  {
    id: "financials",
    header: () => (
      <Button variant="ghost" className="justify-start w-full">
        Financials / Progress
      </Button>
    ),
    cell: ({ row }) => {
      const lead = row.original;

      const totalReceived = (lead.receiveCash || 0) + (lead.receiveOnline || 0);

      // ✅ Correct profit formula — identical to SingleLead:
      // profit = receiveCash + receiveOnline - totalExp - totalGST
      if (lead.status === "CLOSED") {
        const netProfit =
          totalReceived - (lead.totalExp || 0) - (lead.totalGST || 0);

        const profitMargin =
          totalReceived > 0
            ? Math.round((netProfit / totalReceived) * 100)
            : 0;

        return (
          <div className="flex flex-col gap-1">
            <span
              className={`text-xs font-bold ${
                netProfit >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              Profit: ₹{netProfit.toLocaleString("en-IN")}
            </span>
            <span className="text-[10px] text-muted-foreground font-medium uppercase">
              {profitMargin}% Margin
            </span>
          </div>
        );
      }

      // Non-closed leads: payment progress bar (unchanged)
      const percentage =
        lead.totalProjectCost > 0
          ? Math.round((totalReceived / lead.totalProjectCost) * 100)
          : 0;

      const getProgressColor = (pct: number) => {
        if (pct >= 100) return "bg-green-600";
        if (pct >= 50) return "bg-yellow-600";
        return "bg-red-600";
      };

      return (
        <div className="flex items-center space-x-2">
          <div className="w-16 bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${getProgressColor(percentage)}`}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>
          <span className="text-xs font-semibold">{percentage}%</span>
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
            <Button variant="ghost" className="h-8 w-8 p-0">
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
            {!lead.init && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem
                    className="text-red-600"
                    onSelect={(e) => e.preventDefault()}
                  >
                    Delete Lead
                  </DropdownMenuItem>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Delete Lead {lead.lead_id}?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete
                      this lead and all related data.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-red-600 hover:bg-red-700"
                      onClick={() => handleDelete(lead.id)}
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

export const getColumns = () => {
  const pathname = usePathname();
  return columns;
};