"use client";

import React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Banknote,
  CalendarIcon,
  CreditCard,
  DollarSign,
  FileText,
  ReceiptIndianRupee,
  User,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// Updated schema with date field
const transactionSchema = z
  .object({
    amount: z.preprocess(
      (val) => (typeof val === "string" ? Number.parseFloat(val) : val),
      z.number().positive("Amount must be positive")
    ),
    partyType: z.enum(["CLIENT", "VENDOR"]),
    flowType: z.enum(["IN", "OUT"]),
    paymentMethod: z.enum(["ONLINE", "CASH"]),
    remark: z.string().optional(),
    actualDate: z.date({
      required_error: "Date is required",
    }),
    vendorId: z.preprocess((val) => {
      if (val === "" || val === "none" || val === undefined) return undefined;
      const num = Number(val);
      return isNaN(num) ? undefined : num;
    }, z.number().optional()),
  })
  .refine(
    (data) => {
      // For client payments, no vendor should be selected
      if (data.partyType === "CLIENT" && data.vendorId !== undefined) {
        return false;
      }
      // For vendor payments, a vendor must be selected
      if (data.partyType === "VENDOR" && data.vendorId === undefined) {
        return false;
      }
      return true;
    },
    {
      message:
        "Vendor selection is required for vendor payments and should not be selected for client payments",
      path: ["vendorId"],
    }
  );

interface Vendor {
  id: number;
  name: string;
  vendorsBreakdown: Array<{
    totalAmt: number;
    totalGiven: number;
    leadId: number;
  }>;
}

interface LeadData {
  id: number;
  totalProjectCost: number;
  payInCash: number;
  payInOnline: number;
  receiveCash: number;
  receiveOnline: number;
  additionalItemsCost: number;
}

interface AddTransactionNoteProps {
  leadId: string;
  vendors: Vendor[];
  leadData: LeadData;
  closedLead: boolean;
  id: number;
  prefilledVendorId?: number;
  prefilledAmount?: number;
  prefilledPaymentMethod?: "ONLINE" | "CASH";
  ref?: React.ForwardedRef<HTMLDivElement>;
  onDataUpdate: () => void;
}

const AddTransactionNote: React.FC<AddTransactionNoteProps> = React.forwardRef(
  (
    {
      leadId,
      vendors,
      leadData,
      closedLead,
      id,
      prefilledVendorId,
      prefilledAmount,
      prefilledPaymentMethod,
      onDataUpdate,
    },
    ref
  ) => {
    // Get total received amount (both cash and online)
    const totalReceivedAmount =
      (leadData?.receiveCash || 0) + (leadData?.receiveOnline || 0);
    // Calculate remaining amount to be received from client
    const remainingClientAmount =
      (leadData?.totalProjectCost || 0) - totalReceivedAmount;

    const {
      register,
      handleSubmit,
      control,
      watch,
      reset,
      setValue,
      formState: { errors, isSubmitting },
    } = useForm<z.infer<typeof transactionSchema>>({
      resolver: zodResolver(transactionSchema),
      defaultValues: {
        partyType: prefilledVendorId ? "VENDOR" : undefined,
        flowType: prefilledVendorId ? "OUT" : undefined,
        vendorId: prefilledVendorId,
        amount: prefilledAmount,
        paymentMethod: "CASH", // Default payment method
        actualDate: new Date(), // Default to current date
      },
    });

    console.log(
      "SET TRANSNOTES ADDIIONLAITEMSCOST",
      leadData.additionalItemsCost
    );

    const { toast } = useToast();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [formData, setFormData] = useState<z.infer<
      typeof transactionSchema
    > | null>(null);
    const [open, setOpen] = useState(false);
    const [maxAmount, setMaxAmount] = useState<number>(0);
    const [amountError, setAmountError] = useState<string | null>(null);
    const [isPrefilled, setIsPrefilled] = useState<boolean>(false);
    const partyType = watch("partyType");
    const flowType = watch("flowType");
    const selectedVendorId = watch("vendorId");
    const amount = watch("amount");
    const paymentMethod = watch("paymentMethod");
    const actualDate = watch("actualDate");
    const cardRef = useRef<HTMLDivElement>(null);
    const [isSettingTransaction, setIsSettingTransaction] = useState(false);
    const isClientTransaction = partyType === "CLIENT";
    const isVendorTransaction = partyType === "VENDOR";
    const isCashIn = flowType === "IN";
    const isCashOut = flowType === "OUT";

    // Helper function to get combined transaction type
    const getTransactionName = () => {
      if (partyType && flowType) {
        return `${partyType}_PAYMENT_${flowType}`;
      }
      return undefined;
    };

    // Apply prefilled values when they change
    useEffect(() => {
      if (prefilledVendorId) {
        // For vendor payments
        setValue("partyType", "VENDOR");
        setValue("flowType", "OUT");
        setValue("vendorId", prefilledVendorId);
        setValue("paymentMethod", prefilledPaymentMethod || "CASH");
        setIsPrefilled(true);

        if (prefilledAmount) {
          setValue("amount", prefilledAmount);
        }
      } else if (prefilledAmount !== undefined) {
        // For client payments (cash or bank)
        setValue("partyType", "CLIENT");
        setValue("flowType", "IN");
        setValue("amount", prefilledAmount);
        setValue("paymentMethod", prefilledPaymentMethod || "CASH");
        setIsPrefilled(true);
      }
    }, [prefilledVendorId, prefilledAmount, prefilledPaymentMethod, setValue]);

    useEffect(() => {
      // Move this inside the effect to avoid dependency issues
      const transactionName = getTransactionName();

      if (transactionName === "CLIENT_PAYMENT_IN") {
        // Dynamically set max amount based on payment method for client cash in
        if (flowType === "IN") {
          if (paymentMethod === "CASH") {
            // Remaining cash that can be paid
            const remainingCashAmount =
              (leadData?.payInCash || 0) - (leadData?.receiveCash || 0);
            setMaxAmount(remainingCashAmount);
          } else if (paymentMethod === "ONLINE") {
            // Remaining online payment that can be made
            const remainingOnlineAmount =
              (leadData?.payInOnline || 0) +
              (leadData?.additionalItemsCost || 0) -
              (leadData?.receiveOnline || 0);

            console.log(
              "REMAINING AMOUNT",
              leadData.payInOnline,
              leadData.additionalItemsCost,
              leadData.receiveOnline,
              remainingOnlineAmount
            );
            setMaxAmount(remainingOnlineAmount);
          }
        }
      } else if (transactionName === "CLIENT_PAYMENT_OUT") {
        if (paymentMethod === "CASH") {
          setMaxAmount(leadData.receiveCash);
        } else if (paymentMethod === "ONLINE") {
          setMaxAmount(leadData.receiveOnline);
        }
      } else if (transactionName?.startsWith("VENDOR_") && selectedVendorId) {
        const vendorBreakdown = vendors
          .find((v) => v.id === selectedVendorId)
          ?.vendorsBreakdown.find((b) => b.leadId === id);

        if (vendorBreakdown) {
          if (transactionName === "VENDOR_PAYMENT_OUT") {
            const remainingVendorAmount =
              vendorBreakdown.totalAmt - vendorBreakdown.totalGiven;
            setMaxAmount(remainingVendorAmount);
          } else if (transactionName === "VENDOR_PAYMENT_IN") {
            setMaxAmount(vendorBreakdown.totalGiven);
          }
        } else {
          setMaxAmount(0);
        }
      } else {
        setMaxAmount(0);
      }
    }, [
      partyType,
      flowType,
      selectedVendorId,
      vendors,
      leadId,
      remainingClientAmount,
      totalReceivedAmount,
      id,
      paymentMethod,
      leadData,
      // Only include the function itself if it's defined outside of the component
      // or if it depends on props/state not already in this list
      getTransactionName,
    ]);

    // Validate amount against maximum
    useEffect(() => {
      if (amount && amount > maxAmount) {
        setAmountError(`Amount cannot exceed ${maxAmount}`);
      } else {
        setAmountError(null);
      }
    }, [amount, maxAmount]);

    const onSubmit = async (data: z.infer<typeof transactionSchema>) => {
      if (!leadId) {
        toast({
          title: "Error",
          description: "Lead ID is missing!",
          variant: "destructive",
        });
        return;
      }

      // Determine transaction type based on the new transaction names
      const transactionType = data.flowType === "IN" ? "CASH_IN" : "CASH_OUT";

      // Combine party type and flow type to create the traditional transaction name format
      const transactionName = `${data.partyType}_PAYMENT`;
      setIsSettingTransaction(true);
      try {
        const response = await fetch(`/api/setTransNotes/${leadId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...data,
            transactionType,
            transactionName, // Send combined name for backward compatibility
            actualDate: data.actualDate.toISOString(),
          }),
        });

        const responseData = await response.json();

        if (!response.ok) {
          throw new Error(responseData.message || "Failed to add transaction");
        }
        onDataUpdate();
        toast({
          title: "Transaction Added",
          description: "The transaction has been successfully recorded.",
        });

        // Reset the form after successful submission
        reset();
        setIsPrefilled(false);
        window.location.reload();
      } catch (error) {
        console.error("API Error:", error);
        toast({
          title: "Error",
          description:
            error instanceof Error ? error.message : "An error occurred",
          variant: "destructive",
        });
      } finally {
        setIsSettingTransaction(false);
      }
    };

    const handleFormSubmit = (data: z.infer<typeof transactionSchema>) => {
      // Check if amount exceeds the maximum allowed
      if (amount > maxAmount) {
        toast({
          title: "Error",
          description: `Amount cannot exceed ${maxAmount}`,
          variant: "destructive",
        });
        return;
      }

      setFormData(data); // Store form data for confirmation
      setIsDialogOpen(true); // Open the confirmation dialog
    };

    const handleConfirm = () => {
      if (formData) {
        onSubmit(formData); // Submit the form data
      }
      setIsDialogOpen(false); // Close the dialog
    };

    const handleCancel = () => {
      setIsDialogOpen(false); // Close the dialog without submitting
    };

    // Handler for party type change to reset vendor selection
    const handlePartyTypeChange = (value: string) => {
      setValue("partyType", value as any);

      // Reset vendor selection when changing to a client transaction
      if (value === "CLIENT") {
        setValue("vendorId", undefined);
      }
    };

    // Handler to clear prefilled values
    const clearPrefilled = () => {
      reset({
        partyType: undefined,
        flowType: undefined,
        vendorId: undefined,
        amount: undefined,
        paymentMethod: "CASH",
        remark: undefined,
        actualDate: new Date(),
      });
      setIsPrefilled(false);
    };

    // Scroll into view when prefilled data is provided
    useEffect(() => {
      if (prefilledVendorId && cardRef.current) {
        cardRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, [prefilledVendorId]);

    // Helper function to get transaction background color
    const getTransactionColor = () => {
      if (isCashIn) {
        return "bg-green-600 hover:bg-green-700";
      } else if (isCashOut) {
        return "bg-red-600 hover:bg-red-700";
      }
      return "";
    };

    return (
      <Card className="w-full mx-auto" ref={ref || cardRef}>
        <CardHeader>
          <CardTitle className="flex items-center text-2xl font-semibold text-primary">
            <Banknote className="w-6 h-6 mr-2" />
            Add Transaction Note
            {isPrefilled && (
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto"
                onClick={clearPrefilled}
                title="Clear prefilled values"
              >
                <X className="w-4 h-4" />
                <span className="ml-1">Clear</span>
              </Button>
            )}
          </CardTitle>
          <CardDescription>
            Record a new financial transaction for this Customer.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Amount Field */}
              <div className="space-y-2">
                <Label htmlFor="amount" className="text-sm font-medium">
                  Amount
                </Label>
                <div className="relative">
                  <ReceiptIndianRupee className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    placeholder="Enter amount"
                    className={`pl-9 ${amountError ? "border-red-500" : ""}`}
                    {...register("amount")}
                  />
                </div>
                {amountError && (
                  <p className="text-sm text-destructive">{amountError}</p>
                )}
                {errors.amount && (
                  <p className="text-sm text-destructive">
                    {errors.amount.message}
                  </p>
                )}
                {maxAmount > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Maximum amount: {maxAmount}
                  </p>
                )}
              </div>

              {/* Date Field (New) */}
              <div className="space-y-2">
                <Label htmlFor="actualDate" className="text-sm font-medium">
                  Transaction Date
                </Label>
                <Controller
                  control={control}
                  name="actualDate"
                  render={({ field }) => (
                    <Popover open={open} onOpenChange={setOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal pl-9 relative",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={(date) => {
                            field.onChange(date);
                            setOpen(false); // Close the popover after selecting a date
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                />
                {errors.actualDate && (
                  <p className="text-sm text-destructive">
                    {errors.actualDate.message}
                  </p>
                )}
              </div>

              {/* Party Type Dropdown */}
              <div className="space-y-2">
                <Label htmlFor="partyType" className="text-sm font-medium">
                  Party Type
                </Label>
                <Controller
                  name="partyType"
                  control={control}
                  render={({ field }) => (
                    <Select
                      onValueChange={handlePartyTypeChange}
                      value={field.value}
                    >
                      <SelectTrigger id="partyType">
                        <SelectValue placeholder="Select Party Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CLIENT">
                          <div className="flex items-center">
                            <User className="w-4 h-4 mr-2" />
                            Client
                          </div>
                        </SelectItem>
                        <SelectItem value="VENDOR">
                          <div className="flex items-center">
                            <User className="w-4 h-4 mr-2" />
                            Vendor
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.partyType && (
                  <p className="text-sm text-destructive">
                    {errors.partyType.message}
                  </p>
                )}
              </div>

              {/* Flow Type Dropdown */}
              <div className="space-y-2">
                <Label htmlFor="flowType" className="text-sm font-medium">
                  Flow Type
                </Label>
                <Controller
                  name="flowType"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger id="flowType">
                        <SelectValue placeholder="Select Flow Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="IN">
                          <div className="flex items-center">
                            <ArrowUpCircle className="w-4 h-4 mr-2 text-green-500" />
                            Cash In
                          </div>
                        </SelectItem>
                        <SelectItem value="OUT">
                          <div className="flex items-center">
                            <ArrowDownCircle className="w-4 h-4 mr-2 text-red-500" />
                            Cash Out
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.flowType && (
                  <p className="text-sm text-destructive">
                    {errors.flowType.message}
                  </p>
                )}
              </div>

              {/* Payment Method Field */}
              <div className="space-y-2">
                <Label htmlFor="paymentMethod" className="text-sm font-medium">
                  Payment Method
                </Label>
                <Controller
                  name="paymentMethod"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger id="paymentMethod">
                        <SelectValue placeholder="Select Method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ONLINE">
                          <div className="flex items-center">
                            <CreditCard className="w-4 h-4 mr-2" />
                            Bank
                          </div>
                        </SelectItem>
                        <SelectItem value="CASH">
                          <div className="flex items-center">
                            <Banknote className="w-4 h-4 mr-2" />
                            Cash
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.paymentMethod && (
                  <p className="text-sm text-destructive">
                    {errors.paymentMethod.message}
                  </p>
                )}
              </div>
            </div>

            {/* Vendor Field (Conditional) - Only shown for vendor transactions */}
            {isVendorTransaction && (
              <div className="space-y-2">
                <Label htmlFor="vendorId" className="text-sm font-medium">
                  Vendor
                </Label>
                <Controller
                  name="vendorId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      onValueChange={(value) =>
                        field.onChange(
                          value === "none" ? undefined : Number(value)
                        )
                      }
                      value={field.value?.toString() || "none"}
                    >
                      <SelectTrigger id="vendorId">
                        <SelectValue placeholder="Select Vendor" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {vendors.map((vendor) => {
                          // Find vendor breakdown for this lead
                          const breakdown = vendor.vendorsBreakdown.find(
                            (b) => b.leadId === id
                          );

                          // For OUT flow (payment), show vendors with remaining amounts
                          // For IN flow (refund), show vendors who have been paid
                          const totalAmount = breakdown?.totalAmt || 0;
                          const givenAmount = breakdown?.totalGiven || 0;
                          const remaining = totalAmount - givenAmount;

                          const shouldShow =
                            (flowType === "OUT" &&
                              breakdown &&
                              remaining > 0) ||
                            (flowType === "IN" && breakdown && givenAmount > 0);

                          if (shouldShow) {
                            return (
                              <SelectItem
                                key={vendor.id}
                                value={vendor.id.toString()}
                              >
                                <div className="flex items-center">
                                  <User className="w-4 h-4 mr-2" />
                                  {vendor.name}
                                  {flowType === "OUT" &&
                                    ` (Remaining: ${remaining})`}
                                  {flowType === "IN" &&
                                    ` (Paid: ${givenAmount})`}
                                </div>
                              </SelectItem>
                            );
                          }
                          return null;
                        })}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.vendorId && (
                  <p className="text-sm text-destructive">
                    {errors.vendorId.message}
                  </p>
                )}
              </div>
            )}

            {/* Remark Field */}
            <div className="space-y-2">
              <Label htmlFor="remark" className="text-sm font-medium">
                Remark (Optional)
              </Label>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  id="remark"
                  type="text"
                  placeholder="Add a remark"
                  className="pl-9"
                  {...register("remark")}
                />
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={
                isSettingTransaction ||
                isSubmitting ||
                closedLead ||
                !!amountError ||
                amount > maxAmount ||
                !partyType ||
                !flowType
              }
              className={cn("w-full", getTransactionColor())}
            >
              {isSettingTransaction || isSubmitting
                ? "Adding Transaction..."
                : "Add Transaction"}
            </Button>

            {/* Transaction Summary */}
            {partyType && flowType && (
              <div className="text-sm text-muted-foreground border-t border-dashed pt-4">
                <p className="font-medium">Transaction Summary:</p>
                <ul className="mt-2 space-y-1">
                  <li>
                    • Party Type: {partyType === "CLIENT" ? "Client" : "Vendor"}
                  </li>
                  <li>
                    • Flow Type: {flowType === "IN" ? "Cash In" : "Cash Out"}
                  </li>
                  {selectedVendorId && isVendorTransaction && (
                    <li>
                      • Vendor:{" "}
                      {vendors.find((v) => v.id === selectedVendorId)?.name}
                    </li>
                  )}
                  {amount > 0 && <li>• Amount: {amount}</li>}
                  {actualDate && <li>• Date: {format(actualDate, "PPP")}</li>}
                </ul>
              </div>
            )}
          </form>
        </CardContent>

        {/* Confirmation Dialog */}
        <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Transaction</AlertDialogTitle>
              <AlertDialogDescription>
                <div className="space-y-2">
                  <p className="mb-2">Please review the transaction details:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>
                      <span className="font-medium">Party Type:</span>{" "}
                      {formData?.partyType === "CLIENT" ? "Client" : "Vendor"}
                    </li>
                    <li>
                      <span className="font-medium">Flow Type:</span>{" "}
                      {formData?.flowType === "IN" ? "Cash In" : "Cash Out"}
                    </li>
                    <li>
                      <span className="font-medium">Amount:</span> ₹
                      {formData?.amount}
                    </li>
                    <li>
                      <span className="font-medium">Method:</span>{" "}
                      {formData?.paymentMethod === "ONLINE" ? "Bank" : "Cash"}
                    </li>
                    <li>
                      <span className="font-medium">Date:</span>{" "}
                      {formData?.actualDate
                        ? format(formData.actualDate, "PPP")
                        : "N/A"}
                    </li>
                    {formData?.partyType === "VENDOR" && formData?.vendorId && (
                      <li>
                        <span className="font-medium">Vendor:</span>{" "}
                        {vendors.find((v) => v.id === formData?.vendorId)?.name}
                      </li>
                    )}
                    {formData?.remark && (
                      <li>
                        <span className="font-medium">Remark:</span>{" "}
                        {formData?.remark}
                      </li>
                    )}
                  </ul>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleCancel}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirm}>
                Confirm
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Card>
    );
  }
);

AddTransactionNote.displayName = "AddTransactionNote";

export default AddTransactionNote;
