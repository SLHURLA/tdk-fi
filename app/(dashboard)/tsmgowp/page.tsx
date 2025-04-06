// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import {
  BarChart,
  Calendar,
  ChevronDown,
  CircleDollarSign,
  Clock,
  DollarSign,
  Home,
  LayoutDashboard,
  LineChart,
  Menu,
  Package,
  PieChart,
  ReceiptIndianRupee,
  Settings,
  Store,
  TrendingUp,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import useSWR from "swr";
import React from "react";
import { useSession } from "next-auth/react";

// Define types for the data structures
interface RevenueData {
  month?: string;
  quarter?: string;
  year?: string;
  finYear?: string;
  revenue: number;
  totalProfit: number;
  projectClose: number;
}

interface CompanyData {
  totalRevenue: string;
  revenueChange: string;
  totalProfit: string;
  profitChange: string;
  projectsClosed: number;
  projectsLive: number;
  revenueData: RevenueData[];
}

interface StoreData {
  userId: number;
  store: string;
  revenue: number;
  totalProfit: number;
  projectClose: number;
  projectsLive?: number; // Optional if not always present
}

interface FinYearData {
  finYear: string;
  totalProfit: number;
  revenue: number;
  projectClose: number;
}

// Format numbers with commas for better readability
const formatNumber = (num: number): string => {
  return num?.toLocaleString("en-IN");
};

const fetcher = async (url: string): Promise<any> => {
  const response = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  const data = await response.json();
  return data;
};

export default function Dashboard() {
  const [timeframe, setTimeframe] = useState<string>("yearly");
  const [selectedYear, setSelectedYear] = useState<string>("2025");
  const [selectedMonth, setSelectedMonth] = useState<string>("January");
  const [selectedQuarter, setSelectedQuarter] = useState<string>("1");
  const [selectedFinYear, setSelectedFinYear] = useState<string>("2024-2025");
  const { data: session } = useSession();

  // Using static data instead of fetching from API
  const url =
    session?.user.role === "STORE_MANAGER"
      ? `/api/getStoreRevenue/${session?.user.id}`
      : "/api/getAllRevenue";
  const { data, isLoading, error } = useSWR(url, fetcher);
  console.log("Full API response:", data);
  console.log(session?.user?.role, data);

  const transformData = (
    data: any,
    isStoreManager: boolean = false
  ): {
    revenueData: RevenueData[];
    userStoreWiseRevenue: Record<string, StoreData>;
    finYearData: FinYearData[];
    storeData: any[]; // Add this to handle the new storeData structure
  } => {
    if (!data) {
      return {
        revenueData: [],
        userStoreWiseRevenue: {},
        finYearData: [],
        storeData: [],
      };
    }

    // For store manager, we need to structure the data differently
    if (isStoreManager) {
      const storeRevenueData =
        data.monthWiseRevenue?.map((item: any) => ({
          month: item.monthYear,
          revenue: item.revenue,
          totalProfit: item.totalProfit,
          projectClose: item.projectClose,
        })) || [];

      return {
        revenueData: storeRevenueData,
        userStoreWiseRevenue: {}, // Empty since store manager only sees their store
        finYearData:
          data.finYearWiseRevenue?.map((item: any) => ({
            finYear: item.finYear,
            totalProfit: item.totalProfit,
            revenue: item.revenue,
            projectClose: item.projectClose,
          })) || [],
        storeData: [], // Empty for store manager
      };
    }

    // Original admin data transformation
    const finYearData: FinYearData[] =
      data.finYearWiseRevenue?.map((item: any) => ({
        finYear: item.finYear,
        totalProfit: item.totalProfit,
        revenue: item.revenue,
        projectClose: item.projectClose,
      })) || [];

    const userStoreWiseRevenue =
      data.userStoreWiseRevenue?.reduce(
        (acc: Record<string, StoreData>, item: any) => {
          const key = `${item.userId}-${item.store}`;
          acc[key] = {
            userId: item.userId,
            store: item.store,
            revenue: item.revenue,
            totalProfit: item.totalProfit,
            projectClose: item.projectClose,
          };
          return acc;
        },
        {}
      ) || {};

    return {
      revenueData: data.monthWiseRevenue || [],
      userStoreWiseRevenue,
      finYearData,
      storeData: data.storeData || [], // Add the storeData from the response
    };
  };
  const isStoreManager = session?.user.role === "STORE_MANAGER";
  const { revenueData, finYearData, userStoreWiseRevenue, storeData } = data
    ? transformData(data, isStoreManager)
    : {
        revenueData: [],
        finYearData: [],
        userStoreWiseRevenue: {},
        storeData: [],
      };

  // Get unique years from data
  const years = Array.from(
    new Set(revenueData.map((item) => item.month?.split("-")[1]))
  ).filter(Boolean);

  // Get unique financial years from data
  const finYears = Array.from(
    new Set(finYearData.map((item) => item.finYear))
  ).filter(Boolean);

  // Filter data based on selected timeframe
  const getFilteredData = (): RevenueData[] => {
    switch (timeframe) {
      case "yearly":
        return revenueData.filter((item) => item.month?.endsWith(selectedYear));
      case "monthly":
        return revenueData.filter(
          (item) => item.month === `${selectedMonth}-${selectedYear}`
        );
      case "quarterly":
        return revenueData.filter((item) => {
          const month = item.month?.split("-")[0];
          const year = item.month?.split("-")[1];
          if (!month || !year) return false;

          const monthNum = new Date(`${month} 1, ${year}`).getMonth();
          const quarter = Math.floor(monthNum / 3) + 1;
          return quarter === parseInt(selectedQuarter) && year === selectedYear;
        });
      case "financial":
        // Add filtered data for financial year
        return revenueData.filter((item) => {
          const month = item.month?.split("-")[0];
          const year = item.month?.split("-")[1];
          if (!month || !year) return false;

          // Assuming financial year format is "YYYY-YYYY"
          const [startYear, endYear] = selectedFinYear.split("-");

          // Simple check - if month is before April, it belongs to the previous year's financial year
          const monthNum = new Date(`${month} 1, ${year}`).getMonth();
          if (monthNum < 3 && year === endYear) return true; // Jan-Mar of end year
          if (monthNum >= 3 && year === startYear) return true; // Apr-Dec of start year

          return false;
        });
      default:
        return revenueData;
    }
  };
  const getFilteredStoreData = (storeName: string): any => {
    const store = storeData.find((s) => s.store === storeName);
    if (!store) return null;

    switch (timeframe) {
      case "yearly":
        return (
          store.yearly.find((y: any) => y.year.toString() === selectedYear) || {
            year: parseInt(selectedYear),
            revenue: 0,
            totalProfit: 0,
            projectClose: 0,
          }
        );
      case "monthly":
        return (
          store.monthly.find(
            (m: any) =>
              m.month === selectedMonth && m.year.toString() === selectedYear
          ) || {
            month: selectedMonth,
            year: parseInt(selectedYear),
            revenue: 0,
            totalProfit: 0,
            projectClose: 0,
          }
        );
      case "quarterly":
        // First check if we have explicit quarterly data that matches the selected quarter
        const quarterData = store.quarterly?.find(
          (q: any) =>
            q.quarter?.toString() === selectedQuarter &&
            q.year?.toString() === selectedYear
        );

        // If we have explicit data that matches the selected quarter, return it
        if (quarterData && quarterData.quarter === parseInt(selectedQuarter)) {
          return quarterData;
        }

        // Otherwise calculate from monthly data
        const quarterMonths =
          store.monthly?.filter((m: any) => {
            const monthNum = new Date(`${m.month} 1, ${m.year}`).getMonth() + 1;
            const quarter = Math.ceil(monthNum / 3);
            return (
              quarter === parseInt(selectedQuarter) &&
              m.year.toString() === selectedYear
            );
          }) || [];

        // If we have months in this quarter, sum them up
        if (quarterMonths.length > 0) {
          return {
            totalProfit: quarterMonths.reduce(
              (sum: number, m: any) => sum + m.totalProfit,
              0
            ),
            revenue: quarterMonths.reduce(
              (sum: number, m: any) => sum + m.revenue,
              0
            ),
            projectClose: quarterMonths.reduce(
              (sum: number, m: any) => sum + m.projectClose,
              0
            ),
            quarter: parseInt(selectedQuarter),
            year: parseInt(selectedYear),
          };
        }

        // Return zero values if no data exists for this quarter
        return {
          quarter: parseInt(selectedQuarter),
          year: parseInt(selectedYear),
          revenue: 0,
          totalProfit: 0,
          projectClose: 0,
        };
      case "financial":
        return (
          store.financialYear?.find(
            (fy: any) => fy.finYear === selectedFinYear
          ) || {
            finYear: selectedFinYear,
            revenue: 0,
            totalProfit: 0,
            projectClose: 0,
          }
        );
      default:
        return {
          revenue: 0,
          totalProfit: 0,
          projectClose: 0,
        };
    }
  };
  const filteredData = getFilteredData();
  // const filteredStoreData = getFilteredStoreData();
  // Get financial year data for the selected financial year
  const getSelectedFinYearData = (): FinYearData | null => {
    return finYearData.find((item) => item.finYear === selectedFinYear) || null;
  };

  const selectedFinYearData = getSelectedFinYearData();

  // Calculate growth or decrease
  const calculateGrowth = (current: number, previous: number): string => {
    if (previous === 0) return "+0%";
    const growth = ((current - previous) / previous) * 100;
    return `${growth >= 0 ? "+" : ""}${growth.toFixed(1)}%`;
  };

  // Get previous year/month data
  const getPreviousData = (): { revenue: number; totalProfit: number } => {
    if (timeframe === "yearly") {
      const previousYearData = revenueData.filter((item) =>
        item.month?.endsWith(String(parseInt(selectedYear) - 1))
      );
      return previousYearData.reduce(
        (acc, item) => ({
          revenue: acc.revenue + item.revenue,
          totalProfit: acc.totalProfit + item.totalProfit,
        }),
        { revenue: 0, totalProfit: 0 }
      );
    } else if (timeframe === "monthly") {
      const previousMonth = new Date(`${selectedMonth} 1, ${selectedYear}`);
      previousMonth.setMonth(previousMonth.getMonth() - 1);
      const previousMonthData = revenueData.find(
        (item) =>
          item.month ===
          `${previousMonth?.toLocaleString("default", {
            month: "long",
          })}-${previousMonth.getFullYear()}`
      );
      return previousMonthData || { revenue: 0, totalProfit: 0 };
    } else if (timeframe === "quarterly") {
      const prevQuarter =
        parseInt(selectedQuarter) > 1 ? parseInt(selectedQuarter) - 1 : 4;
      const prevYear =
        parseInt(selectedQuarter) > 1
          ? parseInt(selectedYear)
          : parseInt(selectedYear) - 1;

      const prevQuarterData = revenueData.filter((item) => {
        const month = item.month?.split("-")[0];
        const year = item.month?.split("-")[1];
        if (!month || !year) return false;

        const monthNum = new Date(`${month} 1, ${year}`).getMonth();
        const quarter = Math.floor(monthNum / 3) + 1;
        return quarter === prevQuarter && parseInt(year) === prevYear;
      });

      return prevQuarterData.reduce(
        (acc, item) => ({
          revenue: acc.revenue + item.revenue,
          totalProfit: acc.totalProfit + item.totalProfit,
        }),
        { revenue: 0, totalProfit: 0 }
      );
    } else if (timeframe === "financial") {
      // For financial year, get the previous financial year data
      const [startYear, endYear] = selectedFinYear.split("-");
      const prevFinYear = `${parseInt(startYear) - 1}-${parseInt(endYear) - 1}`;

      const prevFinYearData = finYearData.find(
        (item) => item.finYear === prevFinYear
      );

      return prevFinYearData
        ? { revenue: 0, totalProfit: prevFinYearData.totalProfit }
        : { revenue: 0, totalProfit: 0 };
    }
    return { revenue: 0, totalProfit: 0 };
  };

  const previousData = getPreviousData();

  useEffect(() => {
    initTooltips();
  }, [filteredData]);

  if (isLoading) return <div className="p-8 text-center">Loading data...</div>;
  if (error) return <div className="p-8 text-center">Error loading data</div>;
  if (!data) return <div className="p-8 text-center">No data available</div>;

  return (
    <div>
      <div className="flex min-h-screen bg-background">
        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          <header className=" flex lg:flex-row flex-col justify-center items-center gap-4 border-b bg-background p-6">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold">
                Company Analytics Dashboard
              </h1>
            </div>
            <div className="ml-auto flex flex-wrap  items-center gap-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Calendar className="h-4 w-4" />
                    {timeframe === "yearly"
                      ? "Yearly Overview"
                      : timeframe === "monthly"
                      ? "Monthly Overview"
                      : timeframe === "quarterly"
                      ? "Quarterly Overview"
                      : "Financial Year Overview"}
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setTimeframe("monthly")}>
                    Monthly Overview
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTimeframe("quarterly")}>
                    Quarterly Overview
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTimeframe("yearly")}>
                    Yearly Overview
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTimeframe("financial")}>
                    Financial Year Overview
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              {timeframe === "yearly" && (
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Select Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={year}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {timeframe === "monthly" && (
                <>
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue placeholder="Select Year" />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map((year) => (
                        <SelectItem key={year} value={year}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={selectedMonth}
                    onValueChange={setSelectedMonth}
                  >
                    <SelectTrigger className="w-[120px]">
                      <SelectValue placeholder="Select Month" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => {
                        const month = new Date(2023, i).toLocaleString(
                          "default",
                          { month: "long" }
                        );
                        return (
                          <SelectItem key={month} value={month}>
                            {month}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </>
              )}
              {timeframe === "quarterly" && (
                <>
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue placeholder="Select Year" />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map((year) => (
                        <SelectItem key={year} value={year}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={selectedQuarter}
                    onValueChange={setSelectedQuarter}
                  >
                    <SelectTrigger className="w-[120px]">
                      <SelectValue placeholder="Select Quarter" />
                    </SelectTrigger>
                    <SelectContent>
                      {["1", "2", "3", "4"].map((quarter) => (
                        <SelectItem key={quarter} value={quarter}>
                          Q{quarter}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              )}
              {timeframe === "financial" && (
                <Select
                  value={selectedFinYear}
                  onValueChange={setSelectedFinYear}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Select Fin Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {finYearData.map((item) => (
                      <SelectItem key={item.finYear} value={item.finYear}>
                        {item.finYear}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </header>

          <main className="grid gap-6 p-6 md:gap-8 md:p-8">
            <section>
              <div className="mb-6">
                <h2 className="text-2xl font-bold">Company Profit Overview</h2>
                <p className="text-muted-foreground">
                  Comprehensive view of company-wide performance metrics
                </p>
              </div>
              {/* Top metrics */}
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Revenue
                    </CardTitle>
                    <ReceiptIndianRupee className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      ₹
                      {formatNumber(
                        isStoreManager
                          ? data.totalRevenue
                          : timeframe === "financial"
                          ? data.totalRevenue || 0
                          : filteredData.reduce(
                              (acc, item) => acc + item.revenue,
                              0
                            )
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <TrendingUp className="h-3 w-3 text-green-500" />
                      <span className="text-green-500">
                        {calculateGrowth(
                          isStoreManager
                            ? data.totalRevenue
                            : timeframe === "financial"
                            ? data.totalRevenue || 0
                            : filteredData.reduce(
                                (acc, item) => acc + item.revenue,
                                0
                              ),
                          previousData.revenue
                        )}
                      </span>{" "}
                      from previous{" "}
                      {timeframe === "yearly"
                        ? "year"
                        : timeframe === "monthly"
                        ? "month"
                        : timeframe === "quarterly"
                        ? "quarter"
                        : "financial year"}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Profit
                    </CardTitle>
                    <span className="text-muted-foreground items-center justify-center">
                      ₹
                    </span>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      ₹
                      {formatNumber(
                        isStoreManager
                          ? data.totalProfit
                          : timeframe === "financial" && selectedFinYearData
                          ? selectedFinYearData.totalProfit || 0
                          : filteredData.reduce(
                              (acc, item) => acc + item.totalProfit,
                              0
                            )
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <TrendingUp className="h-3 w-3 text-green-500" />
                      <span className="text-green-500">
                        {calculateGrowth(
                          isStoreManager
                            ? data.totalProfit
                            : timeframe === "financial" && selectedFinYearData
                            ? selectedFinYearData.totalProfit || 0
                            : filteredData.reduce(
                                (acc, item) => acc + item.totalProfit,
                                0
                              ),
                          previousData.totalProfit
                        )}
                      </span>{" "}
                      from previous{" "}
                      {timeframe === "yearly"
                        ? "year"
                        : timeframe === "monthly"
                        ? "month"
                        : timeframe === "quarterly"
                        ? "quarter"
                        : "financial year"}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">
                      Projects Closed
                    </CardTitle>
                    <Package className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {timeframe === "financial"
                        ? selectedFinYearData?.projectClose || 0 // Show only selected financial year's projects
                        : filteredData.reduce(
                            (acc, item) => acc + item.projectClose,
                            0
                          )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Successfully completed projects
                    </p>
                  </CardContent>
                </Card>
                {timeframe === "financial" && (
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium">
                        Financial Year
                      </CardTitle>
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {selectedFinYear}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        April {selectedFinYear.split("-")[0]} - March{" "}
                        {selectedFinYear.split("-")[1]}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
              {/* Financial Year Overview Card */}
              {timeframe === "financial" && selectedFinYear && (
                <Card className="mt-4">
                  <CardHeader>
                    <CardTitle>
                      Financial Year {selectedFinYear} Overview
                    </CardTitle>
                    <CardDescription>
                      Comprehensive financial data for FY {selectedFinYear}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <span>Total Profit:</span>
                        <span
                          className={`font-semibold ${
                            (isStoreManager
                              ? data.totalProfit
                              : selectedFinYearData?.totalProfit || 0) < 0
                              ? "text-red-500"
                              : "text-green-500"
                          }`}
                        >
                          ₹
                          {formatNumber(
                            isStoreManager
                              ? data.totalProfit
                              : selectedFinYearData?.totalProfit || 0
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Revenue:</span>
                        <span className="font-semibold">
                          ₹
                          {formatNumber(
                            isStoreManager
                              ? data.totalRevenue
                              : selectedFinYearData?.revenue || 0
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Projects Closed:</span>
                        <span className="font-semibold">
                          {isStoreManager
                            ? data.totalProjectClose
                            : selectedFinYearData?.projectClose || 0}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              {/* Charts */}
              {timeframe !== "monthly" && timeframe !== "financial" && (
                <div className="mt-6 grid gap-6 lg:grid-cols-2">
                  <Card className="col-span-1 lg:max-w-lg max-w-sm">
                    <CardHeader>
                      <CardTitle>
                        {timeframe === "yearly"
                          ? "Yearly Revenue"
                          : timeframe === "quarterly"
                          ? "Quarterly Revenue"
                          : timeframe === "financial"
                          ? "Financial Year Revenue"
                          : "Revenue"}
                      </CardTitle>
                      <CardDescription>
                        Revenue trends over the selected period
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="px-2">
                      <RevenueChart data={filteredData} timeframe={timeframe} />
                    </CardContent>
                  </Card>
                  {timeframe !== "financial" && (
                    <Card className="col-span-1 lg:max-w-lg max-w-sm">
                      <CardHeader>
                        <CardTitle>
                          {timeframe === "yearly"
                            ? "Yearly Profit"
                            : timeframe === "quarterly"
                            ? "Quarterly Profit"
                            : timeframe === "financial"
                            ? "Financial Year Profit"
                            : "Profit"}
                        </CardTitle>
                        <CardDescription>
                          Profit distribution over the selected period
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="px-2">
                        <ProfitChart
                          data={filteredData}
                          timeframe={timeframe}
                        />
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
              {/* Financial Year Comparison */}
              {timeframe === "financial" && (
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle>Financial Years Comparison</CardTitle>
                    <CardDescription>
                      Compare profit across financial years
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="px-2">
                    <FinancialYearComparisonChart data={finYearData} />
                  </CardContent>
                </Card>
              )}
            </section>
            {!isStoreManager && (
              <section>
                <div className="mb-6">
                  <h2 className="text-2xl font-bold">
                    Store Performance Comparison
                  </h2>
                  <p className="text-muted-foreground">
                    Detailed metrics for each store location
                  </p>
                </div>

                <Tabs defaultValue="overview" className="w-full">
                  <TabsList className="flex flex-wrap gap-2 w-full md:w-auto">
                    <TabsTrigger value="overview" className="flex-1">
                      Overview
                    </TabsTrigger>
                    <TabsTrigger value="revenue" className="flex-1">
                      Revenue
                    </TabsTrigger>
                    <TabsTrigger value="projects" className="flex-1">
                      Projects
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="mt-6">
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                      {storeData.map((store, index) => {
                        const filteredStoreData = getFilteredStoreData(
                          store.store
                        );
                        // Skip rendering if no data exists for this quarter
                        if (timeframe === "quarterly" && !filteredStoreData) {
                          return null;
                        }
                        const displayData =
                          filteredStoreData || store.yearly[0]; // Fallback to yearly data

                        return (
                          <Card key={index}>
                            <CardHeader>
                              <CardTitle className="flex items-center gap-2">
                                <Store className="h-5 w-5" />
                                {store.store}
                              </CardTitle>
                              <CardDescription>
                                {timeframe === "yearly"
                                  ? `Yearly Overview (${selectedYear})`
                                  : timeframe === "monthly"
                                  ? `Monthly Overview (${selectedMonth} ${selectedYear})`
                                  : timeframe === "quarterly"
                                  ? `Quarterly Overview (Q${selectedQuarter} ${selectedYear})`
                                  : `Financial Year Overview (${selectedFinYear})`}
                              </CardDescription>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-4">
                                <div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">
                                      Revenue
                                    </span>
                                    <span className="text-sm">
                                      ₹{formatNumber(displayData.revenue)}
                                    </span>
                                  </div>
                                  <Progress
                                    value={
                                      (displayData.revenue / 2000000) * 100
                                    }
                                    className="h-2 mt-2"
                                  />
                                </div>
                                <div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">
                                      Profit
                                    </span>
                                    <span className="text-sm">
                                      ₹{formatNumber(displayData.totalProfit)}
                                    </span>
                                  </div>
                                  <Progress
                                    value={
                                      (displayData.totalProfit / 2000000) * 100
                                    }
                                    className="h-2 mt-2"
                                  />
                                </div>
                                <div className="flex justify-between pt-4">
                                  <div>
                                    <p className="text-sm font-medium">
                                      Projects Closed
                                    </p>
                                    <p className="text-2xl font-bold">
                                      {displayData.projectClose}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </TabsContent>

                  <TabsContent value="revenue" className="mt-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Store Revenue Comparison</CardTitle>
                        <CardDescription>
                          Revenue breakdown by store location (
                          {timeframe === "yearly"
                            ? `Year ${selectedYear}`
                            : timeframe === "monthly"
                            ? `${selectedMonth} ${selectedYear}`
                            : timeframe === "quarterly"
                            ? `Q${selectedQuarter} ${selectedYear}`
                            : `FY ${selectedFinYear}`}
                          )
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="px-2">
                        <StoreComparisonChart
                          data={storeData.map((store) => {
                            const filteredData = getFilteredStoreData(
                              store.store
                            );
                            return {
                              store: store.store,
                              revenue: filteredData?.revenue || 0,
                              totalProfit: filteredData?.totalProfit || 0,
                              projectClose: filteredData?.projectClose || 0,
                            };
                          })}
                          metric="revenue"
                        />
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="projects" className="mt-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Store Projects Comparison</CardTitle>
                        <CardDescription>
                          Projects closed by store (
                          {timeframe === "yearly"
                            ? `Year ${selectedYear}`
                            : timeframe === "monthly"
                            ? `${selectedMonth} ${selectedYear}`
                            : timeframe === "quarterly"
                            ? `Q${selectedQuarter} ${selectedYear}`
                            : `FY ${selectedFinYear}`}
                          )
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="px-2">
                        <ProjectsComparisonChart
                          data={storeData.map((store) => {
                            const filteredData = getFilteredStoreData(
                              store.store
                            );
                            return {
                              store: store.store,
                              revenue: filteredData?.revenue || 0,
                              totalProfit: filteredData?.totalProfit || 0,
                              projectClose: filteredData?.projectClose || 0,
                            };
                          })}
                        />
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </section>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

interface RevenueChartProps {
  data: RevenueData[];
  timeframe: string;
}

function RevenueChart({ data, timeframe }: RevenueChartProps) {
  const totalRevenue = data.reduce((acc, item) => acc + item.revenue, 0);

  // Extract month names from the data
  const getMonthLabels = () => {
    return data.map((item) => {
      if (!item.month) return "";

      // For monthly data, the format is "Month-Year" (e.g., "January-2023")
      const [month, year] = item.month.split("-");
      return month;
    });
  };

  const monthLabels = getMonthLabels();

  return (
    <div className="h-[320px] w-full">
      <div className="flex h-full w-full flex-col">
        <div className="flex items-center justify-between">
          <div className="space-y-1 ml-5">
            <p className="text-sm font-medium">
              {timeframe === "yearly"
                ? "Yearly Revenue"
                : timeframe === "quarterly"
                ? "Quarterly Revenue"
                : "Revenue"}
            </p>
            <p className="text-xl font-bold">₹{formatNumber(totalRevenue)}</p>
          </div>
        </div>
        <div className="mt-4 h-[250px] w-full">
          <div className="h-full w-full relative group">
            <svg className="h-full w-full" viewBox="0 0 500 200">
              <path
                d="M0,200 L20,180 L40,160 L60,140 L80,150 L100,130 L120,110 L140,100 L160,80 L180,70 L200,60 L220,50 L240,40 L260,45 L280,35 L300,30 L320,25 L340,20 L360,15 L380,10 L400,5 L420,10 L440,15 L460,10 L480,5 L500,0"
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="2"
                className="transition-all duration-300 group-hover:stroke-width-3"
              />
              <path
                d="M0,200 L20,180 L40,160 L60,140 L80,150 L100,130 L120,110 L140,100 L160,80 L180,70 L200,60 L220,50 L240,40 L260,45 L280,35 L300,30 L320,25 L340,20 L360,15 L380,10 L400,5 L420,10 L440,15 L460,10 L480,5 L500,0 L500,200 L0,200"
                fill="hsl(var(--primary)/0.1)"
                className="transition-all duration-300 group-hover:fill-opacity-20"
              />
              {data.map((item, index) => {
                const xPos = (index * 500) / data.length;
                const nextXPos = ((index + 1) * 500) / data.length;
                const width = nextXPos - xPos;

                return (
                  <g key={index}>
                    <line
                      x1={xPos}
                      y1="0"
                      x2={xPos}
                      y2="200"
                      stroke="hsl(var(--border))"
                      strokeWidth="1"
                      strokeDasharray="4,4"
                    />
                    <text
                      x={xPos + width / 2}
                      y="220"
                      fontSize="12"
                      textAnchor="middle"
                      fill="currentColor"
                    >
                      {monthLabels[index] || ""}
                    </text>
                    <rect
                      x={xPos}
                      y="0"
                      width={width}
                      height="200"
                      fill="transparent"
                      className="cursor-pointer hover:fill-primary hover:fill-opacity-5"
                      data-revenue={item.revenue}
                      data-period={monthLabels[index] || ""}
                    />
                  </g>
                );
              })}
            </svg>

            {/* Tooltip */}
            <div className="absolute inset-0 pointer-events-none">
              <div
                id="revenue-tooltip"
                className="hidden absolute bg-background border border-border rounded-md shadow-md p-2 text-sm transform -translate-x-1/2 -translate-y-full"
              >
                <div className="font-medium" id="tooltip-period"></div>
                <div>
                  Revenue:{" "}
                  <span className="font-semibold" id="tooltip-revenue"></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ProfitChartProps {
  data: RevenueData[];
  timeframe: string;
}

function ProfitChart({ data, timeframe }: ProfitChartProps) {
  // Calculate total profit
  const total = data.reduce((acc, item) => acc + item.totalProfit, 0);

  // Calculate maxProfit
  const maxProfit = Math.max(...data.map((item) => item.totalProfit));

  // Log data and maxProfit for debugging
  console.log("ProfitChart Data:", data);
  console.log("Max Profit:", maxProfit);

  // Adjust bar width based on timeframe
  const barWidth = timeframe === "yearly" ? "w-8" : "w-16"; // Narrower bars for yearly view

  return (
    <div className="h-[300px] max-w-lg overflow-x-scroll">
      <div className="flex h-full w-full flex-col">
        <div className="flex items-center justify-between">
          <div className="space-y-1 ml-5">
            <p className="text-sm font-medium">
              {timeframe === "yearly"
                ? "Yearly Profit"
                : timeframe === "quarterly"
                ? "Quarterly Profit"
                : "Profit"}
            </p>
            <p className="text-xl font-bold">₹{formatNumber(total)}</p>
          </div>
        </div>
        <div className="mt-4 h-[250px] w-full overflow-x-auto">
          <div className="flex h-full items-end gap-2 px-4">
            {data.map((item, index) => {
              // Calculate bar height dynamically
              const barHeight = (item.totalProfit / maxProfit) * 150;

              // Log bar height for debugging
              console.log(
                `Bar ${index + 1} - Profit: ${
                  item.totalProfit
                }, Height: ${barHeight}px`
              );

              return (
                <div
                  key={index}
                  className="flex flex-col items-center justify-end"
                >
                  <div
                    className={`${barWidth} bg-primary rounded-t-md transition-all duration-500 hover:opacity-100`}
                    style={{
                      height: `${barHeight}px`, // Dynamic height based on profit
                    }}
                  />
                  <div className="text-xs font-medium mt-2">
                    {timeframe === "yearly"
                      ? item.month?.split("-")[0] // Display month name for yearly view
                      : timeframe === "quarterly"
                      ? `${item.month}` // Display month for quarterly view
                      : item.month}{" "}
                    {/* Display month for monthly view */}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    ₹{formatNumber(item.totalProfit)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
// JavaScript for tooltip functionality
function initTooltips() {
  const revenueAreas = document.querySelectorAll("[data-revenue]");
  const tooltip = document.getElementById("revenue-tooltip");
  const tooltipPeriod = document.getElementById("tooltip-period");
  const tooltipRevenue = document.getElementById("tooltip-revenue");

  if (!tooltip || !tooltipPeriod || !tooltipRevenue) return;

  revenueAreas.forEach((area) => {
    area.addEventListener("mouseenter", (e) => {
      const target = e.target as HTMLElement;
      const revenue = target.getAttribute("data-revenue");
      const period = target.getAttribute("data-period");

      tooltipPeriod.textContent = period || "";
      tooltipRevenue.textContent = "₹" + formatNumber(Number(revenue));

      const rect = target.getBoundingClientRect();
      const svgRect = target.closest("svg")?.getBoundingClientRect();

      if (svgRect) {
        const x = rect.left + rect.width / 2 - svgRect.left;
        const y = rect.top - svgRect.top;

        tooltip.style.left = `${x}px`;
        tooltip.style.top = `${y}px`;
        tooltip.classList.remove("hidden");
      }
    });

    area.addEventListener("mouseleave", () => {
      tooltip.classList.add("hidden");
    });
  });
}
function StoreComparisonChart({ data, metric }) {
  const maxValue = Math.max(...data.map((item) => item[metric] || 0));

  return (
    <div className="h-[300px] lg:max-w-screen-lg max-w-sm">
      <div className="flex h-full w-full flex-col">
        <div className="mt-4 h-[250px] w-full overflow-x-auto">
          <div className="flex h-full items-end gap-4 px-4">
            {data.map((item, index) => (
              <React.Fragment key={`chart-group-${index}`}>
                <div key={index} className="flex flex-col items-center gap-2">
                  <div
                    className="w-16 bg-primary rounded-t-md transition-all duration-500"
                    style={{
                      height: `${((item[metric] || 0) / maxValue) * 200}px`,
                      backgroundColor:
                        index === 0
                          ? "hsl(var(--primary))"
                          : index === 1
                          ? "hsl(var(--primary)/0.8)"
                          : "hsl(var(--primary)/0.6)",
                    }}
                  />
                  <div className="text-xs font-medium">{item.store}</div>
                  <div className="text-xs text-muted-foreground">
                    ₹{formatNumber(item[metric] || 0)}
                  </div>
                  {index < data.length - 1 && (
                    <div
                      className="w-px h-full border-l border-dashed border-border"
                      style={{ height: "100%" }}
                    />
                  )}
                </div>
                <div className="h-full border border-dashed" />
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProjectsComparisonChart({ data }) {
  const maxClosed = Math.max(...data.map((item) => item.projectClose || 0));

  return (
    <div className="h-[300px] lg:max-w-screen-lg max-w-sm">
      <div className="flex h-full w-full flex-col">
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-primary"></div>
            <span className="text-sm">Projects Closed</span>
          </div>
        </div>
        <div className="mt-4 h-[250px] w-full overflow-x-auto">
          <div className="flex h-full items-end gap-4 px-4">
            {data.map((item, index) => (
              <React.Fragment key={`chart-group-${index}`}>
                <div className="flex flex-col items-center gap-4">
                  <div className="flex gap-2">
                    <div
                      className="w-12 bg-primary rounded-t-md transition-all duration-500"
                      style={{
                        height: `${
                          ((item.projectClose || 0) / maxClosed) * 180
                        }px`,
                      }}
                    />
                  </div>
                  <div className="text-xs font-medium">{item.store}</div>
                  <div className="text-xs text-muted-foreground">
                    Closed: {item.projectClose || 0}
                  </div>
                </div>
                {index < data.length - 1 && (
                  <div className="h-full border-dashed border" />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const VerticalSeparator = () => (
  <div className="w-px h-full border-l border-dashed border-border" />
);

function FinancialYearComparisonChart({ data }: { data: FinYearData[] }) {
  // Sort financial years by profit in descending order
  const sortedData = [...data].sort((a, b) => b.totalProfit - a.totalProfit);

  // Find the maximum profit to calculate relative bar heights
  const maxProfit = Math.max(...data.map((item) => item.totalProfit));

  return (
    <div className="h-[300px] lg:max-w-screen-lg max-w-sm">
      <div className="flex h-full w-full flex-col">
        <div className="mt-4 h-[250px] w-full overflow-x-auto">
          <div className="flex h-full items-end gap-4 px-4">
            {sortedData.map((item, index) => (
              <React.Fragment key={`fin-year-chart-group-${index}`}>
                <div className="flex flex-col items-center gap-2">
                  <div
                    className="w-16 bg-primary rounded-t-md transition-all duration-500 hover:opacity-80"
                    style={{
                      height: `${(item.totalProfit / maxProfit) * 200}px`,
                      backgroundColor:
                        index === 0
                          ? "hsl(var(--primary))"
                          : index === 1
                          ? "hsl(var(--primary)/0.8)"
                          : "hsl(var(--primary)/0.6)",
                    }}
                  />
                  <div className="text-xs font-medium">{item.finYear}</div>
                  <div className="text-xs text-muted-foreground">
                    ₹{formatNumber(item.totalProfit)}
                  </div>
                  {/* Add a dotted line separator */}
                  {index < sortedData.length - 1 && (
                    <div
                      className="w-px h-full border-l border-dashed border-border"
                      style={{ height: "100%" }}
                    />
                  )}
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
