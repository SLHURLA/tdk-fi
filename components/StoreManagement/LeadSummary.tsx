"use client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PieChart } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface LeadSummaryProps {
  totalLeads: number; // Total number of leads
  notInitializedLeads: number; // Number of leads with `init: false`
  inProgressLeads: number; // Number of leads with `status: "INPROGRESS"`
}

const LeadSummary = ({
  totalLeads,
  notInitializedLeads,
  inProgressLeads,
}: LeadSummaryProps) => {
  // Calculate percentages
  const notInitializedProgress = (notInitializedLeads / totalLeads) * 100;
  const inProgressProgress = (inProgressLeads / totalLeads) * 100;

  return (
    <div className="w-full space-y-6 mb-6">
      {/* Summary Header */}
      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-bold tracking-tight">Customer Summary</h2>
        <p className="text-muted-foreground">
          Track the status of Customer at a glance.
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Leads */}
        <Card className="overflow-hidden border-l-4 border-l-primary">
          <CardHeader className="pb-2">
            <CardDescription>Total Customers</CardDescription>
            <CardTitle className="text-3xl font-bold">{totalLeads}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-sm text-muted-foreground">
              <PieChart className="mr-1 h-4 w-4" />
              <span>100% of all Customers</span>
            </div>
          </CardContent>
        </Card>

        {/* Not Initialized Leads */}
        <Card className="overflow-hidden border-l-4 border-l-amber-500">
          <CardHeader className="pb-2">
            <CardDescription>Not Initialized Customers</CardDescription>
            <CardTitle className="text-3xl font-bold">
              {notInitializedLeads}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Progress value={notInitializedProgress} className="h-2" />
              <span className="text-sm font-medium">
                {notInitializedProgress.toFixed(0)}%
              </span>
            </div>
            <div className="mt-2 flex items-center text-sm text-amber-500">
              <span>{notInitializedLeads} Customers not initialized</span>
            </div>
          </CardContent>
        </Card>

        {/* In Progress Leads */}
        <Card className="overflow-hidden border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardDescription>In Progress Customers</CardDescription>
            <CardTitle className="text-3xl font-bold">
              {inProgressLeads}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Progress value={inProgressProgress} className="h-2" />
              <span className="text-sm font-medium">
                {inProgressProgress.toFixed(0)}%
              </span>
            </div>
            <div className="mt-2 flex items-center text-sm text-green-500">
              <span>{inProgressLeads} Customers in progress</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lead Progress */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-semibold">
              Customer Progress
            </CardTitle>
            <Badge
              variant={inProgressLeads === totalLeads ? "default" : "outline"}
            >
              {inProgressLeads === totalLeads
                ? "All In Progress"
                : "Partial Progress"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">Overall Progress</span>
                <span className="font-medium">
                  {inProgressProgress.toFixed(0)}%
                </span>
              </div>
              <div className="relative h-4 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-gradient-to-r from-green-400 to-green-600 transition-all duration-500 ease-in-out"
                  style={{ width: `${inProgressProgress}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>In Progress: {inProgressLeads}</span>
                <span>Not Initialized: {notInitializedLeads}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LeadSummary;
