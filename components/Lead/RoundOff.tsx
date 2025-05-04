"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, IndianRupee } from "lucide-react";

interface RoundOffProps {
  leadId: string | string[];
}

const RoundOff: React.FC<RoundOffProps> = ({ leadId }) => {
  const [amount, setAmount] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) === 0) {
      toast({
        variant: "destructive",
        title: "Invalid amount",
        description: "Please enter a valid amount.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/setTransNotes/${leadId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: Number(amount),
          paymentMethod: "ONLINE",
          transactionName: "ROUNDOFF",
          transactionType: "CASH_IN",
          actualDate: new Date().toISOString(),
          remark: "Round off adjustment",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to add round off transaction");
      }

      toast({
        title: "Success",
        description: "Round off transaction added successfully.",
      });

      setOpen(false);
      setAmount("");

      // Refresh the page to show updated data
      window.location.reload();
    } catch (error) {
      console.error("Error adding round off:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error instanceof Error ? error.message : "An error occurred",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center">
          <IndianRupee className="mr-1 h-4 w-4" />
          Round Off
        </Button>
      </DialogTrigger> */}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Round Off Adjustment</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <div className="grid w-full items-center gap-4">
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="round-off-amount">Round Off Amount</Label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  id="round-off-amount"
                  type="number"
                  placeholder="Enter amount"
                  className="pl-9"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Enter the amount you want to adjust as round off. Use positive
                value for adding to total, negative for subtracting.
              </p>
            </div>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              "Add Round Off"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RoundOff;
