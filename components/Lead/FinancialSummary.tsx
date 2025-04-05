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

interface FinancialSummaryProps {
  totalProjectCost: number;
  totalPaid: number;
  payInCash: number;
  payInOnline: number;
  recievedCash: number;
  recievedOnline: number;
  additionalItemsCost: number;
}

const FinancialSummary = ({
  totalProjectCost,
  totalPaid,
  payInCash,
  payInOnline,
  recievedCash,
  recievedOnline,
  additionalItemsCost,
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
                <span>Paid: {formatCurrency(totalPaid)}</span>
                <span>Remaining: {formatCurrency(remainingAmount)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Analysis & Receivables */}
      <Tabs defaultValue="receivables" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="receivables">Receivables</TabsTrigger>
          <TabsTrigger value="analysis">Payment Analysis</TabsTrigger>
        </TabsList>
        <TabsContent value="analysis" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                <span>Payment Breakdown</span>
              </CardTitle>
              <CardDescription>
                Analysis of payment methods and their distribution
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Cash Payment */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BanknoteIcon className="h-5 w-5 text-amber-500" />
                    <span className="font-medium">Cash Payment</span>
                  </div>
                  <Badge variant="outline" className="font-mono">
                    {formatCurrency(payInCash)}
                  </Badge>
                </div>
                <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 to-amber-600 transition-all duration-500 ease-in-out"
                    style={{ width: `${cashProgress}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{cashProgress.toFixed(1)}% of total cost</span>
                  <span>Received: {formatCurrency(recievedCash)}</span>
                </div>
              </div>

              {/* Online Payment */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-blue-500" />
                    <span className="font-medium">Bank Payment</span>
                  </div>
                  <Badge variant="outline" className="font-mono">
                    {formatCurrency(totalOnlineAmount)}
                  </Badge>
                </div>
                <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-500 ease-in-out"
                    style={{ width: `${onlineProgress}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{onlineProgress.toFixed(1)}% of total cost</span>
                  <span>Received: {formatCurrency(totalOnlinePaidAmount)}</span>
                </div>
                {additionalItemsCost > 0 && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Includes additional items:{" "}
                    {formatCurrency(additionalItemsCost)}
                  </div>
                )}
              </div>

              {/* Payment Distribution */}
              <div className="mt-6 grid  gap-4 rounded-lg bg-muted p-4">
                {/* <div className="flex flex-col items-center justify-center space-y-1">
                  <div className="text-xs text-muted-foreground">
                    Cash vs Online
                  </div>
                  <div className="relative h-24 w-24">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="h-full w-full rounded-full border-8 border-amber-500 opacity-25"></div>
                      <div
                        className="absolute inset-0 rounded-full border-8 border-transparent border-t-blue-500"
                        style={{
                          transform: `rotate(${
                            (payInCash / (payInCash + totalOnlineAmount)) * 360
                          }deg)`,
                          transition: "transform 1s ease-in-out",
                        }}
                      ></div>
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-xs font-medium">
                          {payInCash + totalOnlineAmount > 0
                            ? `${(
                                (payInCash / (payInCash + totalOnlineAmount)) *
                                100
                              ).toFixed(0)}%`
                            : "0%"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Cash
                        </div>
                      </div>
                    </div>
                  </div>
                </div> */}
                <div className="flex flex-col justify-center space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <div className="h-3 w-3 rounded-full bg-amber-500"></div>
                      <span className="text-xs">Cash</span>
                    </div>
                    <span className="text-xs font-medium">
                      {formatCurrency(payInCash)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <div className="h-3 w-3 rounded-full bg-blue-500"></div>
                      <span className="text-xs">Bank</span>
                    </div>
                    <span className="text-xs font-medium">
                      {formatCurrency(totalOnlineAmount)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-xs font-medium">Total</span>
                    <span className="text-xs font-medium">
                      {formatCurrency(payInCash + totalOnlineAmount)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="receivables" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                <span>Receivables Status</span>
              </CardTitle>
              <CardDescription>
                Track outstanding payments and collection status
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Cash Receivables */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BanknoteIcon className="h-5 w-5 text-amber-500" />
                    <span className="font-medium">Cash Receivables</span>
                  </div>
                  <Badge
                    variant={
                      payInCash - recievedCash > 0 ? "destructive" : "default"
                    }
                    className={`font-mono ${
                      payInCash - recievedCash > 0
                        ? "bg-red-500 text-white"
                        : "bg-green-500 text-white"
                    }`}
                  >
                    {formatCurrency(payInCash - recievedCash)}
                  </Badge>
                </div>
                <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 to-amber-600 transition-all duration-500 ease-in-out"
                    style={{ width: `${cashReceivedProgress}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Received: {formatCurrency(recievedCash)}</span>
                  <span>
                    Outstanding: {formatCurrency(payInCash - recievedCash)}
                  </span>
                </div>
              </div>

              {/* Online Receivables */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-blue-500" />
                    <span className="font-medium">Bank Receivables</span>
                  </div>
                  <Badge
                    variant={
                      payInOnline - recievedOnline > 0
                        ? "destructive"
                        : "default"
                    }
                    className={`font-mono ${
                      payInOnline - recievedOnline > 0
                        ? "bg-red-500 text-white"
                        : "bg-green-500 text-white"
                    }`}
                  >
                    {formatCurrency(totalOnlineAmount - totalOnlinePaidAmount)}
                  </Badge>
                </div>
                <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-500 ease-in-out"
                    style={{ width: `${onlineReceivedProgress}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Received: {formatCurrency(totalOnlinePaidAmount)}</span>
                  <span>
                    Outstanding:{" "}
                    {formatCurrency(totalOnlineAmount - totalOnlinePaidAmount)}
                  </span>
                </div>
              </div>

              {/* Summary Card */}
              <Card className="bg-muted/50 border-dashed">
                <CardContent className="pt-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="text-sm font-medium">
                        Total Receivables
                      </div>
                      <div className="text-2xl font-bold">
                        {formatCurrency(
                          payInCash -
                            recievedCash +
                            (payInOnline - recievedOnline)
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {(
                          ((recievedCash + recievedOnline) /
                            (payInCash + payInOnline)) *
                          100
                        ).toFixed(1)}
                        % collected
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm font-medium">
                        Collection Status
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="relative h-10 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full bg-gradient-to-r from-red-500 to-green-500 transition-all duration-500 ease-in-out"
                            style={{
                              width: `${
                                ((recievedCash + recievedOnline) /
                                  (payInCash + payInOnline)) *
                                100
                              }%`,
                            }}
                          ></div>
                        </div>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-red-500">Outstanding</span>
                        <span className="text-green-500">Collected</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FinancialSummary;
