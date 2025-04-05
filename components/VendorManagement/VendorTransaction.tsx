"use client";
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowDownCircle, ArrowUpCircle, Banknote, Eye } from "lucide-react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type TransactionNote = {
  id: number;
  lead_id: string;
  customerName: string;
  amount: number;
  transactionName: string;
  transactionType: "CASH_IN" | "CASH_OUT";
  paymentMethod: string;
  remark: string | null;
  transactionDate: Date;
};

interface TransactionNotesProp {
  transactions: TransactionNote[];
}

const TransactionNotes = ({ transactions }: TransactionNotesProp) => {
  const [selectedRemark, setSelectedRemark] = useState<string | null>(null);

  if (!transactions || transactions.length === 0) {
    return (
      <Card className="lg:p-4 shadow-md rounded-lg mt-6 w-full">
        <CardHeader>
          <CardTitle className="flex items-center font-bold lg:text-2xl text-lg gap-2">
            <Banknote /> Transaction Notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-gray-500 font-bold text-xl text-center">
            No transactions available.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-md rounded-lg mt-6 w-full">
      <CardHeader>
        <CardTitle className="flex items-center text-lg font-semibold gap-2">
          <Banknote /> Transaction Notes
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto max-h-96 border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="p-4">Lead ID</TableHead>
                <TableHead className="p-4">Customer Name</TableHead>
                <TableHead className="p-4">Date</TableHead>
                <TableHead className="p-4">Amount</TableHead>
                <TableHead className="p-4">Transaction Name</TableHead>
                <TableHead className="p-4">Type</TableHead>
                <TableHead className="p-4">Method</TableHead>
                <TableHead className="p-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((transaction) => {
                const date = new Date(transaction.transactionDate);
                const formattedDate = date.toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "numeric",
                  year: "numeric",
                });

                return (
                  <TableRow key={transaction.id} className="">
                    <TableCell className="p-4">{transaction.lead_id}</TableCell>
                    <TableCell className="p-4">
                      {transaction.customerName}
                    </TableCell>
                    <TableCell className="p-4">{formattedDate}</TableCell>
                    <TableCell className="p-4">
                      ₹{transaction.amount.toLocaleString()}
                    </TableCell>
                    <TableCell className="p-4">
                      {transaction.transactionName}
                    </TableCell>
                    <TableCell className="p-4 w-fit text-xs">
                      {transaction.transactionType !== "CASH_IN" ? (
                        <span className="text-green-500 flex gap-1 items-center">
                          <ArrowUpCircle size={12} /> Pay In
                        </span>
                      ) : (
                        <span className="text-red-500 flex gap-1 items-center">
                          <ArrowDownCircle size={12} /> Pay Out
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="p-4">
                      {transaction.paymentMethod === "ONLINE" ? "Bank" : "Cash"}
                    </TableCell>
                    <TableCell className="p-4">
                      <Dialog>
                        <DialogTrigger asChild>
                          <button
                            className="flex items-center gap-1 text-sm text-blue-500 hover:text-blue-700"
                            onClick={() =>
                              setSelectedRemark(transaction.remark)
                            }
                          >
                            <Eye size={16} />
                          </button>
                        </DialogTrigger>
                        <DialogContent className="max-w-sm">
                          <DialogHeader>
                            <DialogTitle>Remark</DialogTitle>
                          </DialogHeader>
                          <div className="mt-4">
                            {transaction.remark || "No remark available."}
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default TransactionNotes;
