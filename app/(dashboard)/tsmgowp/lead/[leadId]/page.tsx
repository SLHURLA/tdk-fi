"use client";
import React from "react";
import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { useToast } from "@/hooks/use-toast";
import { IndianRupee, Loader2, Info, Download } from "lucide-react";
import FinancialSummary from "@/components/Lead/FinancialSummary";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import LeadOverview from "@/components/Lead/LeadOverview";
import TransactionNotes from "@/components/Lead/TransactionNotes";
import AdditionalItems from "@/components/Lead/AdditionalItems";
import PriceBreakdown from "@/components/Lead/PriceBreakdown";
import AddTransactionNote from "@/components/Lead/SetTransactionNotes";
import Vendors from "@/components/Lead/Vendors";
import PDFDownloadButton from "@/components/Lead/CustomerInfoPDFGenerator";
import { Button } from "@/components/ui/button";
import { useSession } from "next-auth/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

async function fetcher(url: string) {
  const response = await fetch(`/api/${url}`);

  if (!response.ok) {
    throw new Error("Failed to fetch leads");
  }

  const data = await response.json();

  return data.data;
}

const SingleLead = () => {
  const { leadId } = useParams();
  const { data, error, isLoading, mutate } = useSWR(
    `/getLead/${leadId}`,
    fetcher,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      refreshInterval: 3000, // Poll every 3 seconds
    }
  );
  useEffect(() => {
    console.log("Lead data updated:", data);
  }, [data]);
  const { toast } = useToast();
  const { data: session } = useSession();
  const [hasMounted, setHasMounted] = useState(false);
  const [selectedVendorId, setSelectedVendorId] = useState<number | undefined>(
    undefined
  );
  const [prefilledAmount, setPrefilledAmount] = useState<number | undefined>(
    undefined
  );
  const transactionRef = useRef<HTMLDivElement>(null);
  const closedLead = data?.status === "CLOSED" || false;

  // New state variables for handover modal
  const [showHandoverModal, setShowHandoverModal] = useState(false);
  const [remainingPayment, setRemainingPayment] = useState(0);
  const [isHandingOver, setIsHandingOver] = useState(false);

  console.log("LEAD DATA", data);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Oops, something went wrong!",
      });
    }
  }, [error, toast]);

  // Handler for vendor payment button
  const handleVendorPayment = (vendorId: number, remainingAmount: number) => {
    setSelectedVendorId(vendorId);
    setPrefilledAmount(remainingAmount);

    // Scroll to transaction form after state updates
    setTimeout(() => {
      if (transactionRef.current) {
        transactionRef.current.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    }, 100);

    mutate();
  };

  const handleProjectHandOver = () => {
    // Calculate remaining amount
    const totalProjectCost = data.totalProjectCost;
    const totalPaid = data.receiveCash + data.receiveOnline;
    const remainingAmount = totalProjectCost - totalPaid;

    // Show modal instead of alert
    setShowHandoverModal(true);

    // Set remaining amount state for the modal to use
    setRemainingPayment(remainingAmount);
  };

  const confirmProjectHandover = async () => {
    if (remainingPayment > 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Cannot hand over project with pending payments.",
      });
      return;
    }

    if (!data || !data.id || !leadId || !session?.user?.id) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Missing required data for handover!",
      });
      return;
    }

    setIsHandingOver(true);

    try {
      const response = await fetch("/api/handoverProject", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: Number(session?.user?.id),
          leadId: Number(data?.id),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to hand over project");
      }

      toast({
        variant: "default",
        title: "Success",
        description: "Project successfully handed over!",
      });

      // Refresh data after handover
      mutate();
      setShowHandoverModal(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Something went wrong!",
      });
    } finally {
      setIsHandingOver(false);
    }
  };

  console.log("CUSTOMER DATA", data);
  if (!hasMounted || isLoading || !data) {
    return (
      <div className="container mx-auto py-10 flex justify-center">
        <Loader2 className="animate-spin w-8 h-8 text-gray-500" />
      </div>
    );
  }

  return (
    <div className="w-full mb-20">
      <div className="flex flex-row w-full justify-between">
        <div className="flex items-center gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" className="text-4xl font-semibold p-0">
                {data.customerName}
                <Info className="ml-2 h-6 w-6 text-gray-500 hover:text-gray-700" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[80%]">
              <DialogHeader>
                <DialogTitle>Customer Overview</DialogTitle>
              </DialogHeader>
              <LeadOverview
                leadId={data.lead_id}
                customer={data.customerName}
                phone={data.phoneNo}
                contactInfo={data.contactInfo}
                store={data.store}
                status={data.status}
                createdAt={new Date(data.createdAt).toLocaleDateString("en-GB")}
                updatedAt={new Date(data.updatedAt).toLocaleDateString("en-GB")}
                expectedHandover={new Date(
                  data.expectedHandoverDate
                ).toLocaleDateString("en-GB")}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <div className="flex gap-2 items-center mt-8 justify-between flex-wrap">
        <div className="flex items-center gap-4">
          {data.status === "CLOSED" && (
            <>
              <div>Total Profit:</div>
              <Button className="bg-green-400">
                <IndianRupee size={15} />
                {(
                  data.receiveCash +
                  data.receiveOnline -
                  data.totalExp -
                  data.totalGST
                ).toLocaleString()}
              </Button>
            </>
          )}
          <div>Total GST:</div>
          <Button className="bg-yellow-400">
            <IndianRupee size={15} />
            {data.totalGST.toLocaleString("hi")}
          </Button>
          <div>Total Expenses:</div>
          <Button className="bg-red-500">
            <IndianRupee size={15} />
            {data.totalExp.toLocaleString("hi")}
          </Button>
        </div>
        <div className="flex items-center gap-4">
          {data.status !== "CLOSED" && (
            <Button onClick={handleProjectHandOver}>Handover Project</Button>
          )}
          <PDFDownloadButton data={data} />
        </div>
      </div>
      <div className="py-4">
        <FinancialSummary
          totalProjectCost={data.totalProjectCost}
          totalPaid={data.receiveCash + data.receiveOnline}
          payInCash={data.payInCash}
          payInOnline={data.payInOnline}
          recievedCash={data.receiveCash}
          recievedOnline={data.receiveOnline}
          additionalItemsCost={data.additionalItemsCost}
        />
      </div>
      <div className="mt-2">
        <TransactionNotes
          leadId={Array.isArray(leadId) ? leadId[0] : leadId || ""}
        />
      </div>
      <div className="mt-4 flex lg:flex-row flex-col gap-4">
        <div className="lg:w-1/2">
          <AddTransactionNote
            ref={transactionRef}
            leadId={Array.isArray(leadId) ? leadId[0] : leadId || ""}
            vendors={data.vendors}
            closedLead={closedLead}
            leadData={data}
            id={data.id}
            prefilledVendorId={selectedVendorId}
            prefilledAmount={prefilledAmount}
            onDataUpdate={mutate}
          />
        </div>
      </div>
      <div className="mt-4">
        <PriceBreakdown
          priceBreakdown={data.ProvidedItems}
          leadId={data.id}
          closedLead={closedLead}
          onDataUpdate={mutate}
        />
      </div>
      {/* <div className="mt-4">
        <AdditionalItems
          additionalItems={data.additionalItems}
          leadId={data.id}
          closedLead={closedLead}
          onDataUpdate={mutate}
        />
      </div> */}
      <div className="mt-4">
        <Vendors
          leadId={Array.isArray(leadId) ? leadId[0] : leadId || ""}
          vendors={data.vendors}
          id={data.id}
          closedLead={closedLead}
          onVendorPayClick={handleVendorPayment}
          onDataUpdate={mutate}
        />
      </div>

      {/* Handover Confirmation Modal */}
      <Dialog open={showHandoverModal} onOpenChange={setShowHandoverModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>Project Handover Confirmation</span>
            </DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <p className="mb-4">
              Are you sure you want to hand over this project?
            </p>

            {remainingPayment > 0 && (
              <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <Info className="h-5 w-5 text-amber-500" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-amber-700 font-medium">
                      Warning
                    </p>
                    <p className="text-sm text-amber-700">
                      Project handover is not possible with due payments.
                      Remaining amount:{" "}
                      <span className="font-semibold">
                        ₹{remainingPayment.toLocaleString("hi")}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowHandoverModal(false)}
              >
                Cancel
              </Button>

              <Button
                onClick={confirmProjectHandover}
                disabled={remainingPayment > 0 || isHandingOver}
                className={
                  remainingPayment > 0 ? "bg-gray-400 cursor-not-allowed" : ""
                }
              >
                {isHandingOver ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Confirm Handover"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SingleLead;
