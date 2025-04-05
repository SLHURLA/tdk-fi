import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function AnalyticsCard() {
  return (
    <Card className="w-[200px] h-[140px] rounded-md shadow-md border border-gray-100">
      <CardContent className="flex justify-between items-start p-5">
        <div>
          <CardTitle className="text-sm font-medium text-gray-600">
            Total Revenue
          </CardTitle>
          <p className="text-3xl font-semibold mt-1">$45,231.89</p>
          <CardDescription className="text-sm text-gray-500 mt-1">
            +20.1% from last month
          </CardDescription>
        </div>
        <div className="text-gray-400 text-lg font-medium">$</div>
      </CardContent>
    </Card>
  );
}
