import { db } from "@/utils/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const userId = parseInt((await params).userId);
    const parsedUserId = userId ? Number(userId) : undefined;

    // Fetch user data first to get the store
    const user = parsedUserId
      ? await db.user.findUnique({
          where: { id: parsedUserId },
          select: { id: true, store: true },
        })
      : null;

    const userStore = user?.store;

    // Fetch revenue data for the specific user
    const revenues = await db.revenue.findMany({
      where: parsedUserId ? { userId: parsedUserId } : undefined,
      include: {
        User: {
          select: {
            id: true,
            fullName: true,
            store: true,
          },
        },
      },
    });

    if (!revenues || revenues.length === 0) {
      return NextResponse.json(
        { message: "No revenue data found" },
        { status: 404 }
      );
    }

    // Fetch leads for the user's store
    const leads = await db.lead.findMany({
      where: userStore
        ? { store: userStore, status: "CLOSED" }
        : { status: "CLOSED" },
      include: {
        transactions: {
          where: {
            transactionName: "VENDOR_PAYMENT",
          },
        },
      },
    });

    // Fetch store expenses for the user
    const storeExpenses = await db.storeExpNotes.findMany({
      where: parsedUserId ? { userId: parsedUserId } : {},
    });

    const monthWiseRevenue: Record<string, any> = {};
    const userStoreWiseRevenue: Record<string, any> = {};
    const yearWiseRevenue: Record<string, any> = {};
    const finYearWiseRevenue: Record<string, any> = {};

    // New aggregations for additional metrics
    const monthWiseTotals: Record<string, any> = {};
    const yearWiseTotals: Record<string, any> = {};
    const finYearWiseTotals: Record<string, any> = {};

    let totalRevenue = 0;
    let totalProjectClose = 0;
    let totalProjects = leads.length;
    let totalVendorPayments = 0;
    let totalExpenses = 0;

    // Calculate total vendor payments from leads' transactions
    leads.forEach((lead) => {
      totalVendorPayments += lead.transactions.reduce(
        (sum, tx) => sum + tx.amount,
        0
      );
    });

    // Calculate total expenses
    totalExpenses = storeExpenses.reduce((sum, exp) => sum + exp.amount, 0);

    // Process leads data for time-based aggregations
    leads.forEach((lead) => {
      const createdDate = new Date(lead.createdAt);
      const month = createdDate.getMonth() + 1; // JS months are 0-indexed
      const year = createdDate.getFullYear();
      const monthName = getMonthName(month);
      const yearString = year.toString();
      const monthYearKey = `${monthName}-${yearString}`;

      // Calculate vendor payments for this lead
      const leadVendorPayments = lead.transactions.reduce(
        (sum, tx) => sum + tx.amount,
        0
      );

      // For financial year calculation
      const finYear =
        month >= 4 ? `${year}-${year + 1}` : `${year - 1}-${year}`;

      // Monthly totals
      if (!monthWiseTotals[monthYearKey]) {
        monthWiseTotals[monthYearKey] = {
          totalProjects: 0,
          totalVendorPayments: 0,
          totalExpenses: 0,
        };
      }
      monthWiseTotals[monthYearKey].totalProjects += 1;
      monthWiseTotals[monthYearKey].totalVendorPayments += leadVendorPayments;

      // Yearly totals
      if (!yearWiseTotals[yearString]) {
        yearWiseTotals[yearString] = {
          totalProjects: 0,
          totalVendorPayments: 0,
          totalExpenses: 0,
        };
      }
      yearWiseTotals[yearString].totalProjects += 1;
      yearWiseTotals[yearString].totalVendorPayments += leadVendorPayments;

      // Financial year totals
      if (!finYearWiseTotals[finYear]) {
        finYearWiseTotals[finYear] = {
          totalProjects: 0,
          totalVendorPayments: 0,
          totalExpenses: 0,
        };
      }
      finYearWiseTotals[finYear].totalProjects += 1;
      finYearWiseTotals[finYear].totalVendorPayments += leadVendorPayments;
    });

    // Process expenses data for time-based aggregations
    storeExpenses.forEach((expense) => {
      const expenseDate = new Date(expense.date);
      const month = expenseDate.getMonth() + 1;
      const year = expenseDate.getFullYear();
      const monthName = getMonthName(month);
      const yearString = year.toString();
      const monthYearKey = `${monthName}-${yearString}`;

      // For financial year calculation
      const finYear =
        month >= 4 ? `${year}-${year + 1}` : `${year - 1}-${year}`;

      // Monthly totals
      if (monthWiseTotals[monthYearKey]) {
        monthWiseTotals[monthYearKey].totalExpenses += expense.amount;
      } else {
        monthWiseTotals[monthYearKey] = {
          totalProjects: 0,
          totalVendorPayments: 0,
          totalExpenses: expense.amount,
        };
      }

      // Yearly totals
      if (yearWiseTotals[yearString]) {
        yearWiseTotals[yearString].totalExpenses += expense.amount;
      } else {
        yearWiseTotals[yearString] = {
          totalProjects: 0,
          totalVendorPayments: 0,
          totalExpenses: expense.amount,
        };
      }

      // Financial year totals
      if (finYearWiseTotals[finYear]) {
        finYearWiseTotals[finYear].totalExpenses += expense.amount;
      } else {
        finYearWiseTotals[finYear] = {
          totalProjects: 0,
          totalVendorPayments: 0,
          totalExpenses: expense.amount,
        };
      }
    });

    revenues.forEach((rev) => {
      // Get month and year from both createdAt and original fields
      const createdDate = new Date(rev.createdAt);
      // Using the original month and year fields for month/year views
      const monthName = rev.month; // e.g., 'April'
      const yearString = rev.year; // e.g., '2025'

      // For financial year calculation, use createdAt
      const monthNum = createdDate.getMonth() + 1; // JavaScript months are 0-indexed
      const yearNum = createdDate.getFullYear();

      const monthYearKey = `${monthName}-${yearString}`;
      const store = rev.User?.store || "Unknown Store";
      const userStoreKey = `${rev.userId}-${store}`;

      // Correctly determine the financial year (April to March)
      // April 1st marks the beginning of a new financial year
      const finYear =
        monthNum >= 4
          ? `${yearNum}-${yearNum + 1}`
          : `${yearNum - 1}-${yearNum}`;

      // Month-wise revenue (using original month/year strings)
      if (!monthWiseRevenue[monthYearKey]) {
        monthWiseRevenue[monthYearKey] = {
          revenue: 0,
          projectClose: 0,
          month: monthName,
          year: yearString,
        };
      }
      monthWiseRevenue[monthYearKey].revenue += rev.revenue;
      monthWiseRevenue[monthYearKey].projectClose += rev.projectClose;

      // Year-wise revenue (using original year string)
      if (!yearWiseRevenue[yearString]) {
        yearWiseRevenue[yearString] = {
          revenue: 0,
          projectClose: 0,
        };
      }
      yearWiseRevenue[yearString].revenue += rev.revenue;
      yearWiseRevenue[yearString].projectClose += rev.projectClose;

      // User-Store-wise revenue
      if (!userStoreWiseRevenue[userStoreKey]) {
        userStoreWiseRevenue[userStoreKey] = {
          userId: rev.userId,
          store,
          revenue: 0,
          projectClose: 0,
        };
      }
      userStoreWiseRevenue[userStoreKey].revenue += rev.revenue;
      userStoreWiseRevenue[userStoreKey].projectClose += rev.projectClose;

      // Financial Year-wise revenue and project close calculation
      if (!finYearWiseRevenue[finYear]) {
        finYearWiseRevenue[finYear] = {
          totalRevenue: 0,
          projectClose: 0,
        };
      }
      finYearWiseRevenue[finYear].totalRevenue += rev.revenue;
      finYearWiseRevenue[finYear].projectClose += rev.projectClose;

      // Total overall revenue and project close
      totalRevenue += rev.revenue;
      totalProjectClose += rev.projectClose;
    });

    // Calculate total profit based on the correct formula
    const totalProfit = totalRevenue - totalVendorPayments - totalExpenses;

    // Merge the additional metrics into existing data structures and calculate profits
    Object.keys(monthWiseRevenue).forEach((key) => {
      if (monthWiseTotals[key]) {
        monthWiseRevenue[key] = {
          ...monthWiseRevenue[key],
          ...monthWiseTotals[key],
          // Calculate profit for each month
          totalProfit: monthWiseRevenue[key].revenue - 
                       (monthWiseTotals[key].totalVendorPayments || 0) - 
                       (monthWiseTotals[key].totalExpenses || 0)
        };
      } else {
        monthWiseRevenue[key] = {
          ...monthWiseRevenue[key],
          totalProjects: 0,
          totalVendorPayments: 0,
          totalExpenses: 0,
          totalProfit: monthWiseRevenue[key].revenue // No expenses or vendor payments
        };
      }
    });

    Object.keys(yearWiseRevenue).forEach((key) => {
      if (yearWiseTotals[key]) {
        yearWiseRevenue[key] = {
          ...yearWiseRevenue[key],
          ...yearWiseTotals[key],
          // Calculate profit for each year
          totalProfit: yearWiseRevenue[key].revenue - 
                       (yearWiseTotals[key].totalVendorPayments || 0) - 
                       (yearWiseTotals[key].totalExpenses || 0)
        };
      } else {
        yearWiseRevenue[key] = {
          ...yearWiseRevenue[key],
          totalProjects: 0,
          totalVendorPayments: 0,
          totalExpenses: 0,
          totalProfit: yearWiseRevenue[key].revenue // No expenses or vendor payments
        };
      }
    });

    Object.keys(finYearWiseRevenue).forEach((key) => {
      if (finYearWiseTotals[key]) {
        finYearWiseRevenue[key] = {
          ...finYearWiseRevenue[key],
          ...finYearWiseTotals[key],
          // Calculate profit for each financial year
          totalProfit: finYearWiseRevenue[key].totalRevenue - 
                       (finYearWiseTotals[key].totalVendorPayments || 0) - 
                       (finYearWiseTotals[key].totalExpenses || 0)
        };
      } else {
        finYearWiseRevenue[key] = {
          ...finYearWiseRevenue[key],
          totalProjects: 0,
          totalVendorPayments: 0,
          totalExpenses: 0,
          totalProfit: finYearWiseRevenue[key].totalRevenue // No expenses or vendor payments
        };
      }
    });

    // Add store-specific metrics to user-store revenue data
    Object.keys(userStoreWiseRevenue).forEach((key) => {
      const storeRevenue = userStoreWiseRevenue[key].revenue;
      // Calculate profit for each store using the correct formula
      const storeProfit = storeRevenue - totalVendorPayments - totalExpenses;
      
      userStoreWiseRevenue[key] = {
        ...userStoreWiseRevenue[key],
        totalProjects,
        totalVendorPayments,
        totalExpenses,
        totalProfit: storeProfit
      };
    });

    return NextResponse.json(
      {
        monthWiseRevenue: Object.entries(monthWiseRevenue).map(
          ([monthYear, data]) => ({ monthYear, ...data })
        ),
        yearWiseRevenue: Object.entries(yearWiseRevenue).map(
          ([year, data]) => ({ year, ...data })
        ),
        userStoreWiseRevenue: Object.values(userStoreWiseRevenue),
        finYearWiseRevenue: Object.entries(finYearWiseRevenue).map(
          ([finYear, data]) => ({
            finYear,
            ...data,
          })
        ),
        totalProfit,
        totalRevenue,
        totalProjectClose,
        totalProjects,
        totalVendorPayments,
        totalExpenses,
        message: "Revenue data fetched successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching revenue data:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// Helper function to convert month number to month name
function getMonthName(monthNumber: number): string {
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return monthNames[monthNumber - 1] || "Unknown";
}