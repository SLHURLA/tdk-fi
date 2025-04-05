"use client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowDownIcon, ArrowUpIcon, PieChart } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface VendorFinancialSummaryProps {
  totalCharge: number; // Total amount the vendor is supposed to receive
  givenCharge: number; // Amount already given to the vendor
}

const VendorFinancialSummary = ({
  totalCharge,
  givenCharge,
}: VendorFinancialSummaryProps) => {
  // Calculate remaining amount
  const remainingAmount = totalCharge - givenCharge;

  // Calculate progress percentages
  const paymentProgress = (givenCharge / totalCharge) * 100;
  const remainingProgress = 100 - paymentProgress;

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="w-full space-y-6 mb-6">
      {/* Summary Header */}
      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-bold tracking-tight">
          Vendor Financial Dashboard
        </h2>
        <p className="text-muted-foreground">
          Track vendor payments and financial status at a glance.
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Charge */}
        <Card className="overflow-hidden border-l-4 border-l-primary">
          <CardHeader className="pb-2">
            <CardDescription>Total Charge</CardDescription>
            <CardTitle className="text-3xl font-bold">
              {formatCurrency(totalCharge)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-sm text-muted-foreground">
              <PieChart className="mr-1 h-4 w-4" />
              <span>100% of vendor charge</span>
            </div>
          </CardContent>
        </Card>

        {/* Given Charge */}
        <Card
          className={`overflow-hidden border-l-4 ${
            paymentProgress > 50 ? "border-l-green-500" : "border-l-amber-500"
          }`}
        >
          <CardHeader className="pb-2">
            <CardDescription>Given Charge</CardDescription>
            <CardTitle className="text-3xl font-bold">
              {formatCurrency(givenCharge)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Progress value={paymentProgress} className="h-2" />
              <span className="text-sm font-medium">
                {paymentProgress.toFixed(0)}%
              </span>
            </div>
            <div className="mt-2 flex items-center text-sm text-green-500">
              <ArrowUpIcon className="mr-1 h-4 w-4" />
              <span>{formatCurrency(givenCharge)} paid</span>
            </div>
          </CardContent>
        </Card>

        {/* Remaining Amount */}
        <Card
          className={`overflow-hidden border-l-4 ${
            remainingAmount > 0 ? "border-l-red-500" : "border-l-green-500"
          }`}
        >
          <CardHeader className="pb-2">
            <CardDescription>Remaining Amount</CardDescription>
            <CardTitle className="text-3xl font-bold">
              {formatCurrency(remainingAmount)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Progress value={remainingProgress} className="h-2" />
              <span className="text-sm font-medium">
                {remainingProgress.toFixed(0)}%
              </span>
            </div>
            <div className="mt-2 flex items-center text-sm text-red-500">
              <ArrowDownIcon className="mr-1 h-4 w-4" />
              <span>{formatCurrency(remainingAmount)} outstanding</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Progress */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-semibold">
              Payment Progress
            </CardTitle>
            <Badge variant={paymentProgress >= 100 ? "default" : "outline"}>
              {paymentProgress >= 100 ? "Completed" : "In Progress"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">Overall Progress</span>
                <span className="font-medium">
                  {paymentProgress.toFixed(0)}%
                </span>
              </div>
              <div className="relative h-4 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-gradient-to-r from-green-400 to-green-600 transition-all duration-500 ease-in-out"
                  style={{ width: `${paymentProgress}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Paid: {formatCurrency(givenCharge)}</span>
                <span>Remaining: {formatCurrency(remainingAmount)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VendorFinancialSummary;
