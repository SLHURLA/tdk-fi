"use client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  BanknoteIcon,
  CreditCard,
  PieChart,
  Wallet,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {Button} from "@/components/ui/button"
interface FinancialSummaryProps {
  totalProjectCost: number;
  totalPaid: number;
  payInCash: number;
  payInOnline: number;
  recievedCash: number;
  recievedOnline: number;
  additionalItemsCost: number;
  onPayCash?: () => void;
  onPayBank?: () => void;
}

const FinancialSummary = ({
  totalProjectCost,
  totalPaid,
  payInCash,
  payInOnline,
  recievedCash,
  recievedOnline,
  additionalItemsCost,
  onPayBank,
  onPayCash,
}: FinancialSummaryProps) => {
  // Calculate remaining amount
  const remainingAmount = totalProjectCost - totalPaid;
  console.log("additionalItemscost", additionalItemsCost);
  // Calculate payment progress percentage, handle case when totalProjectCost is zero
  let paymentProgress = 0;
  let remainingProgress = 100;
  let cashProgress = 0;
  let onlineProgress = 0;
  let cashReceivedProgress = 0;
  let onlineReceivedProgress = 0;

  // Total online amount including additional items
  const totalOnlineAmount = payInOnline + additionalItemsCost;
  const totalOnlinePaidAmount = recievedOnline

  if (totalProjectCost > 0) {
    paymentProgress = (totalPaid / totalProjectCost) * 100;
    remainingProgress = 100 - paymentProgress;
    cashProgress = (payInCash / totalProjectCost) * 100;
    onlineProgress =
      ((payInOnline + additionalItemsCost) / totalProjectCost) * 100;
  }

  if (payInCash > 0) {
    cashReceivedProgress = (recievedCash / payInCash) * 100;
  }

  if (totalOnlineAmount > 0) {
    onlineReceivedProgress = (totalOnlinePaidAmount / totalOnlineAmount) * 100;
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="w-full space-y-6">
      {/* Summary Header */}
      <div className="flex flex-col gap-4">
        <h2 className="text-2xl font-bold tracking-tight">
          Financial Dashboard
        </h2>
        <p className="text-muted-foreground">
          Track your project finances, payments, and receivables at a glance.
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="overflow-hidden border-l-4 border-l-primary">
          <CardHeader className="pb-2">
            <CardDescription>Total Project Cost</CardDescription>
            <CardTitle className="text-3xl font-bold">
              {formatCurrency(totalProjectCost)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-sm text-muted-foreground">
              <PieChart className="mr-1 h-4 w-4" />
              <span>100% of budget</span>
            </div>
          </CardContent>
        </Card>

        {/* <Card
          className={`overflow-hidden border-l-4 ${
            paymentProgress > 50 ? "border-l-green-500" : "border-l-amber-500"
          }`}
        >
          <CardHeader className="pb-2">
            <CardDescription>Total Paid</CardDescription>
            <CardTitle className="text-3xl font-bold">
              {formatCurrency(totalPaid)}
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
              <span>{formatCurrency(totalPaid)} received</span>
            </div>
          </CardContent>
        </Card> */}

        <Card
  className={`overflow-hidden border-l-4 ${
    paymentProgress > 50 ? "border-l-green-500" : "border-l-amber-500"
  }`}
>
  <CardHeader className="pb-2">
    <CardDescription>Total Paid</CardDescription>
    <CardTitle className="text-3xl font-bold">
      {formatCurrency(totalPaid)}
    </CardTitle>
  </CardHeader>
  <CardContent>
    <div className="space-y-2 mt-1">
      {/* Cash Summary */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <BanknoteIcon className="h-4 w-4 text-amber-500" />
          <span>Cash Received</span>
        </div>
        <span className="font-semibold">{formatCurrency(recievedCash)}</span>
      </div>

      {/* Online Summary */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <CreditCard className="h-4 w-4 text-blue-500" />
          <span>Online Received</span>
        </div>
        <span className="font-semibold">{formatCurrency(recievedOnline)}</span>
      </div>

      <div className="pt-2 mt-2 border-t flex items-center text-xs text-green-600 font-medium">
        <ArrowUpIcon className="mr-1 h-3 w-3" />
        <span>{paymentProgress.toFixed(0)}% of total cost collected</span>
      </div>
    </div>
  </CardContent>
</Card>

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

             {remainingAmount > 0 && (
            <div className="mt-4 flex gap-2">
              <Button
                variant="outline"
                className="bg-green-50 hover:bg-green-100 text-green-700 border-green-300"
                onClick={onPayCash}
              >
                <BanknoteIcon className="mr-2 h-4 w-4" />
                Pay Cash
              </Button>
              <Button
                variant="outline"
                className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-300"
                onClick={onPayBank}
              >
                <CreditCard className="mr-2 h-4 w-4" />
                Pay Bank
              </Button>
            </div>
          )}
          </CardContent>
        </Card>
      </div>

      {/* Payment Progress */}
      {/* <Card>
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
                <span>Paid: {formatCurrency(totalPaid)}</span>
                <span>Remaining: {formatCurrency(remainingAmount)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card> */}

      
    </div>
  );
};

export default FinancialSummary;
