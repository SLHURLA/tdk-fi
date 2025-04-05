"use client";

import * as React from "react";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

interface ChartData {
  date: string;
  pending: number;
  done: number;
}

const chartData: ChartData[] = [
  { date: "2025-01-16", pending: 15, done: 25 },
  { date: "2025-01-17", pending: 18, done: 20 },
  { date: "2025-01-18", pending: 12, done: 30 },
  { date: "2025-01-19", pending: 20, done: 35 },
  { date: "2025-01-20", pending: 25, done: 15 },
  { date: "2025-01-21", pending: 10, done: 40 },
  { date: "2025-01-22", pending: 22, done: 28 },
  { date: "2025-01-23", pending: 18, done: 32 },
  { date: "2025-01-24", pending: 13, done: 36 },
  { date: "2025-01-25", pending: 19, done: 22 },
];

const chartConfig = {
  pending: {
    label: "Pending Leads",
    color: "#ee4444",
  },
  done: {
    label: "Completed Leads",
    color: "#23c55e",
  },
} satisfies ChartConfig;

export default function AnalyticsChart() {
  return (
    <Card className="w-full">
      <CardHeader className="flex flex-col items-stretch space-y-0 border-b p-0 sm:flex-row">
        <div className="flex flex-1 flex-col justify-center gap-1 px-6 py-5 sm:py-6 ">
          <CardTitle>Dreams Kitchen - Leads Analytics</CardTitle>
          <CardDescription>
            Tracking pending and completed leads for the last 10 days
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="px-2 sm:p-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <BarChart
            data={chartData}
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={16}
              tickFormatter={(value) => {
                const date = new Date(value);
                return date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                });
              }}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  className="w-[150px]"
                  nameKey="views"
                  labelFormatter={(value) => {
                    return new Date(value).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    });
                  }}
                />
              }
            />
            <Bar
              dataKey="pending"
              fill={chartConfig.pending.color}
              name={chartConfig.pending.label}
            />
            <Bar
              dataKey="done"
              fill={chartConfig.done.color}
              name={chartConfig.done.label}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
