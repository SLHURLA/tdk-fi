import { db } from "@/utils/db";
import { NextRequest } from "next/server";

// Type definitions to match the required response format
type MonthYearRevenue = {
  monthYear: string;
  totalProfit: number;
  revenue: number;
  projectClose: number;
  month: string;
  year: string;
  totalProjects: number;
  totalVendorPayments: number;
  totalExpenses: number;
  receiveCash: number;
  receiveOnline: number;
  payInCash: number;
  payInOnline: number;
};

type YearRevenue = {
  year: string;
  totalProfit: number;
  revenue: number;
  projectClose: number;
  totalProjects: number;
  totalVendorPayments: number;
  totalExpenses: number;
  receiveCash: number;
  receiveOnline: number;
  payInCash: number;
  payInOnline: number;
};

type StoreRevenue = {
  userId: number;
  store: string;
  totalProfit: number;
  revenue: number;
  projectClose: number;
  totalProjects: number;
  totalVendorPayments: number;
  totalExpenses: number;
  receiveCash: number;
  receiveOnline: number;
  payInCash: number;
  payInOnline: number;
};

type FinYearRevenue = {
  finYear: string;
  totalRevenue: number;
  totalProfit: number;
  projectClose: number;
  totalProjects: number;
  totalVendorPayments: number;
  totalExpenses: number;
  receiveCash: number;
  receiveOnline: number;
  payInCash: number;
  payInOnline: number;
};

type RevenueResponse = {
  monthWiseRevenue: MonthYearRevenue[];
  yearWiseRevenue: YearRevenue[];
  userStoreWiseRevenue: StoreRevenue[];
  finYearWiseRevenue: FinYearRevenue[];
  totalProfit: number;
  totalRevenue: number;
  totalProjectClose: number;
  totalProjects: number;
  totalVendorPayments: number;
  totalExpenses: number;
  receiveCash: number;
  receiveOnline: number;
  payInCash: number;
  payInOnline: number;
  message: string;
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const userId = parseInt((await params).userId);
  const parsedUserId = userId ? Number(userId) : undefined;

  try {
    // Get all leads associated with the user
    const leads = await db.lead.findMany({
      where: {
        userId: parsedUserId,
        user: {
          role: "STORE_MANAGER",
        },
        status:"INPROGRESS"
      },
      include: {
        user: true,
        transactions: true,
        vendors: {
          include: {
            transNotes: true,
          },
        },
      },
    });

    // Get store expenses
    const storeExpenses = await db.storeExpNotes.findMany({
      where: {
        userId: parsedUserId,
      },
    });

    // Initialize the response object
    const response: RevenueResponse = {
      monthWiseRevenue: [],
      yearWiseRevenue: [],
      userStoreWiseRevenue: [],
      finYearWiseRevenue: [],
      totalProfit: 0,
      totalRevenue: 0,
      totalProjectClose: 0,
      totalProjects: 0,
      totalVendorPayments: 0,
      totalExpenses: 0,
      receiveCash: 0,
      receiveOnline: 0,
      payInCash: 0,
      payInOnline: 0,
      message: "Revenue data fetched successfully",
    };

    // Helper function to get month name
    const getMonthName = (monthIndex: number): string => {
      const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ];
      return months[monthIndex];
    };

    // Process all leads to calculate metrics
    const monthYearMap = new Map<string, MonthYearRevenue>();
    const yearMap = new Map<string, YearRevenue>();
    const finYearMap = new Map<string, FinYearRevenue>();
    
    // Store user info for store-wise revenue
    const userStore = leads.length > 0 ? leads[0].store : "Unknown Store";
    const storeRev: StoreRevenue = {
      userId: parsedUserId || 0,
      store: userStore,
      totalProfit: 0,
      revenue: 0,
      projectClose: 0,
      totalProjects: leads.length,
      totalVendorPayments: 0,
      totalExpenses: 0,
      receiveCash: 0,
      receiveOnline: 0,
      payInCash: 0,
      payInOnline: 0,
    };

    // Process all leads
    leads.forEach(lead => {
      const createdAt = lead.createdAt;
      const month = getMonthName(createdAt.getMonth());
      const year = createdAt.getFullYear().toString();
      const monthYear = `${month}-${year}`;
      
      // Calculate financial year (April to March)
      const finYearStart = createdAt.getMonth() >= 3 ? createdAt.getFullYear() : createdAt.getFullYear() - 1;
      const finYearEnd = finYearStart + 1;
      const finYear = `${finYearStart}-${finYearEnd}`;

      // Calculate revenue and other metrics
      const revenue = lead.totalProjectCost;
      const vendorPayments = lead.vendors.reduce((sum, vendor) => sum + vendor.GivenCharge, 0);
      const profit = revenue - vendorPayments - lead.totalExp;
      
      // Calculate cash and online payments
      const receiveCash = lead.receiveCash;
      const receiveOnline = lead.receiveOnline;
      const payInCash = lead.payInCash;
      const payInOnline = lead.payInOnline;

      // Aggregate for total stats
      response.totalRevenue += revenue;
      response.totalVendorPayments += vendorPayments;
      response.totalProfit += profit;
      response.totalProjects += 1;
      response.receiveCash += receiveCash;
      response.receiveOnline += receiveOnline;
      response.payInCash += payInCash;
      response.payInOnline += payInOnline;

      if (lead.status === "CLOSED") {
        response.totalProjectClose += 1;
      }

      // Month-Year aggregation
      if (!monthYearMap.has(monthYear)) {
        monthYearMap.set(monthYear, {
          monthYear,
          month,
          year,
          totalProfit: 0,
          revenue: 0,
          projectClose: 0,
          totalProjects: 0,
          totalVendorPayments: 0,
          totalExpenses: 0,
          receiveCash: 0,
          receiveOnline: 0,
          payInCash: 0,
          payInOnline: 0,
        });
      }
      
      const monthData = monthYearMap.get(monthYear)!;
      monthData.totalProfit += profit;
      monthData.revenue += revenue;
      monthData.totalProjects += 1;
      monthData.totalVendorPayments += vendorPayments;
      monthData.receiveCash += receiveCash;
      monthData.receiveOnline += receiveOnline;
      monthData.payInCash += payInCash;
      monthData.payInOnline += payInOnline;
      
      if (lead.status === "CLOSED") {
        monthData.projectClose += 1;
      }

      // Year aggregation
      if (!yearMap.has(year)) {
        yearMap.set(year, {
          year,
          totalProfit: 0,
          revenue: 0,
          projectClose: 0,
          totalProjects: 0,
          totalVendorPayments: 0,
          totalExpenses: 0,
          receiveCash: 0,
          receiveOnline: 0,
          payInCash: 0,
          payInOnline: 0,
        });
      }
      
      const yearData = yearMap.get(year)!;
      yearData.totalProfit += profit;
      yearData.revenue += revenue;
      yearData.totalProjects += 1;
      yearData.totalVendorPayments += vendorPayments;
      yearData.receiveCash += receiveCash;
      yearData.receiveOnline += receiveOnline;
      yearData.payInCash += payInCash;
      yearData.payInOnline += payInOnline;
      
      if (lead.status === "CLOSED") {
        yearData.projectClose += 1;
      }

      // Financial Year aggregation
      if (!finYearMap.has(finYear)) {
        finYearMap.set(finYear, {
          finYear,
          totalProfit: 0,
          totalRevenue: 0,
          projectClose: 0,
          totalProjects: 0,
          totalVendorPayments: 0,
          totalExpenses: 0,
          receiveCash: 0,
          receiveOnline: 0,
          payInCash: 0,
          payInOnline: 0,
        });
      }
      
      const finYearData = finYearMap.get(finYear)!;
      finYearData.totalProfit += profit;
      finYearData.totalRevenue += revenue;
      finYearData.totalProjects += 1;
      finYearData.totalVendorPayments += vendorPayments;
      finYearData.receiveCash += receiveCash;
      finYearData.receiveOnline += receiveOnline;
      finYearData.payInCash += payInCash;
      finYearData.payInOnline += payInOnline;
      
      if (lead.status === "CLOSED") {
        finYearData.projectClose += 1;
      }

      // Store-wise aggregation
      storeRev.totalProfit += profit;
      storeRev.revenue += revenue;
      storeRev.totalVendorPayments += vendorPayments;
      storeRev.receiveCash += receiveCash;
      storeRev.receiveOnline += receiveOnline;
      storeRev.payInCash += payInCash;
      storeRev.payInOnline += payInOnline;
      
      if (lead.status === "CLOSED") {
        storeRev.projectClose += 1;
      }
    });

    // Process store expenses
    storeExpenses.forEach(expense => {
      const expenseDate = expense.transactionDate;
      const month = getMonthName(expenseDate.getMonth());
      const year = expenseDate.getFullYear().toString();
      const monthYear = `${month}-${year}`;
      
      // Calculate financial year
      const finYearStart = expenseDate.getMonth() >= 3 ? expenseDate.getFullYear() : expenseDate.getFullYear() - 1;
      const finYearEnd = finYearStart + 1;
      const finYear = `${finYearStart}-${finYearEnd}`;

      // Update total expenses
      response.totalExpenses += expense.amount;
      
      // Update month expenses
      if (monthYearMap.has(monthYear)) {
        monthYearMap.get(monthYear)!.totalExpenses += expense.amount;
      }
      
      // Update year expenses
      if (yearMap.has(year)) {
        yearMap.get(year)!.totalExpenses += expense.amount;
      }
      
      // Update financial year expenses
      if (finYearMap.has(finYear)) {
        finYearMap.get(finYear)!.totalExpenses += expense.amount;
      }
      
      // Update store expenses
      storeRev.totalExpenses += expense.amount;
    });

    // Convert maps to arrays for the response
    response.monthWiseRevenue = Array.from(monthYearMap.values());
    response.yearWiseRevenue = Array.from(yearMap.values());
    response.finYearWiseRevenue = Array.from(finYearMap.values());
    response.userStoreWiseRevenue = [storeRev];

    return Response.json(response);
  } catch (error) {
    console.error("Error fetching revenue data:", error);
    return Response.json(
      { error: "Failed to fetch revenue data", details: error },
      { status: 500 }
    );
  }
}