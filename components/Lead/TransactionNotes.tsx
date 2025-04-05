"use client";
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Banknote,
  Loader2,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import useSWR from "swr";

type TransactionNote = {
  leadId: number;
  id: number;
  amount: number;
  transactionName: string;
  transactionType: "CASH_IN" | "CASH_OUT";
  paymentMethod: string;
  remark: string | null;
  actualDate: Date;
  transactionDate: Date;
  vendorId: number | null;
};

interface TransactionNotesProp {
  leadId: string;
}

async function fetcher(url: string) {
  const response = await fetch(`/api/${url}`);
  if (!response.ok) {
    throw new Error("Failed to fetch leads");
  }
  const data = await response.json();

  return data.notes.sort(
    (a: TransactionNote, b: TransactionNote) =>
      new Date(b.transactionDate).getTime() -
      new Date(a.transactionDate).getTime()
  );
}

async function fetchVendor(vendorId: number) {
  const response = await fetch(`/api/getVendor/${vendorId}`);
  if (!response.ok) {
    throw new Error("Failed to fetch vendor");
  }
  const data = await response.json();
  return data.vendor.name; // Return only vendor name
}

const TransactionNotes = ({ leadId }: TransactionNotesProp) => {
  const { data, error, isLoading, mutate } = useSWR(
    `/getTransNotes/${leadId}`,
    fetcher,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      refreshInterval: 3000, // Poll every 3 seconds
    }
  );
  console.log("Transaction Notes", data);

  const [vendorNames, setVendorNames] = useState<{ [key: number]: string }>({});
  // Prevent hydration mismatch
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  //calculate cash in and out
  const totalInCash =
    data?.reduce((acc: number, transaction: TransactionNote) => {
      return transaction.transactionType === "CASH_IN"
        ? acc + transaction.amount
        : acc;
    }, 0) ?? 0;

  const totalOutCash =
    data?.reduce((acc: number, transaction: TransactionNote) => {
      return transaction.transactionType === "CASH_OUT"
        ? acc + transaction.amount
        : acc;
    }, 0) ?? 0;

  // Fetch vendor names once transactions are loaded
  useEffect(() => {
    if (data) {
      const vendorIds = [
        ...new Set(
          data
            .map((t: TransactionNote) => t.vendorId as number | null)
            .filter((id: number): id is number => id !== null)
        ),
      ];

      vendorIds.forEach(async (vendorId) => {
        if (!vendorNames[vendorId as number]) {
          const name = await fetchVendor(vendorId as number);
          setVendorNames((prev) => ({ ...prev, [vendorId as number]: name }));
        }
      });
    }
  }, [data, vendorNames]);

  if (!hasMounted) {
    return (
      <div className="container mx-auto py-10 flex justify-center">
        <Loader2 className="animate-spin w-8 h-8 text-gray-500" />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-10 flex justify-center">
        <Loader2 className="animate-spin w-8 h-8 text-gray-500" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-4 shadow-md rounded-lg mt-2">
        <CardHeader>
          <CardTitle className="flex items-center font-bold text-2xl  gap-2">
            <Banknote /> Transaction Notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-red-500 font-bold text-xl text-center">
            An error occurred. Please try again later.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="p-4 shadow-md rounded-lg mt-2">
      <CardHeader>
        <CardTitle className="flex items-center font-bold text-2xl  gap-2">
          <Banknote /> Transaction Notes
        </CardTitle>
        {data && data.length > 0 && (
          <div className="flex justify-between mt-4">
            <div className="flex items-center gap-2 text-green-500">
              <ArrowUpCircle className="h-4 w-4" />
              <span className="font-semibold">Payments Received:</span>
              <span>₹{totalInCash.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-2 text-red-500">
              <ArrowDownCircle className="h-4 w-4" />
              <span className="font-semibold">Payments Made:</span>
              <span>₹{totalOutCash.toLocaleString()}</span>
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto max-h-96">
          <Table>
            <TableCaption>
              {data && data.length > 0
                ? "A list of your recent transactions."
                : "No recent transactions"}
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="p-3">Date</TableHead>
                <TableHead className="p-3">Amount</TableHead>
                <TableHead className="p-3">Name</TableHead>
                <TableHead className="p-4">Type</TableHead>
                <TableHead className="p-3">Method</TableHead>
                <TableHead className="p-3">Remark</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data && data.length > 0 ? (
                data.map((transaction: TransactionNote) => {
                  const date = new Date(transaction.actualDate);
                  const formattedDate = date.toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "numeric",
                    year: "numeric",
                  });

                  return (
                    <TableRow key={transaction.id}>
                      <TableCell className="p-4">{formattedDate}</TableCell>
                      <TableCell className="p-4">
                        ₹{transaction.amount.toLocaleString()}
                      </TableCell>
                      <TableCell className="p-4">
                        {transaction.transactionName === "VENDOR_PAYMENT" &&
                        transaction.vendorId !== null
                          ? `${transaction.transactionName} (${
                              vendorNames[transaction.vendorId] || "Loading..."
                            })`
                          : transaction.transactionName}
                      </TableCell>

                      <TableCell className="p-4 min-w-[120px]">
                        {" "}
                        {/* Increased width */}
                        {transaction.transactionType === "CASH_IN" ? (
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
                        {transaction.paymentMethod === "ONLINE"
                          ? "BANK"
                          : transaction.paymentMethod}
                      </TableCell>
                      <TableCell className="p-4">
                        {transaction.remark}
                      </TableCell>
                      {/* <TableCell className="p-4">
                        {transaction.vendorId
                          ? vendorNames[transaction.vendorId] || "Loading..."
                          : "—"}
                      </TableCell> */}
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-4">
                    No transactions available.
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

export default TransactionNotes;
