import { db } from "@/utils/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    // Fetch all revenue data including the user and their store
    const revenues = await db.revenue.findMany({
      include: {
        User: {
          select: {
            id: true,
            store: true,
          },
        },
      },
    });

    // Fetch total projects data (leads)
    const leads = await db.lead.findMany();
    
    // Fetch vendor payments data
    const vendorPayments = await db.transactionNote.findMany({
      where: {
        transactionName: "VENDOR_PAYMENT",
      },
    });
    
    // Fetch store expenses data
    const storeExpenses = await db.storeExpNotes.findMany();

    console.log("Revenues:", revenues); // Log the fetched revenue data

    if (!revenues || revenues.length === 0) {
      return NextResponse.json(
        { message: "No revenue data found" },
        { status: 404 }
      );
    }

    // Existing aggregations
    const monthWiseRevenue: Record<string, any> = {};
    const yearWiseRevenue: Record<string, any> = {};
    const finYearWiseRevenue: Record<string, any> = {};
    const userStoreWiseRevenue: Record<string, any> = {};

    // New store-specific aggregations
    const storeMonthlyRevenue: Record<string, Record<string, any>> = {};
    const storeQuarterlyRevenue: Record<string, Record<string, any>> = {};
    const storeYearlyRevenue: Record<string, Record<string, any>> = {};
    const storeFinYearRevenue: Record<string, Record<string, any>> = {};

    // New aggregations for total metrics
    const monthWiseTotals: Record<string, any> = {};
    const yearWiseTotals: Record<string, any> = {};
    const finYearWiseTotals: Record<string, any> = {};
    const storeWiseTotals: Record<string, any> = {};

    let totalProfit = 0;
    let totalRevenue = 0;
    let totalProjects = leads.length;
    let totalVendorPayments = vendorPayments.reduce((sum, payment) => sum + payment.amount, 0);
    let totalExpenses = storeExpenses.reduce((sum, expense) => sum + expense.amount, 0);

    // Helper function to get month number from various formats
    const getMonthNumber = (monthRaw: string | number): number => {
      if (typeof monthRaw === "string" && isNaN(Number(monthRaw))) {
        const monthMap: Record<string, number> = {
          january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
          july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
          jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7,
          aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
        };
        return monthMap[monthRaw.toLowerCase()] || 1;
      } else {
        return Number(monthRaw) || 1;
      }
    };

    // Calculate month/year based metrics for leads
    leads.forEach((lead) => {
      const createdDate = new Date(lead.createdAt);
      const month = createdDate.getMonth() + 1; // JS months are 0-indexed
      const year = createdDate.getFullYear();
      const monthYearKey = `${month}-${year}`;
      const yearKey = `${year}`;
      const finYear = month >= 4 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
      const store = lead.store;
      
      // Initialize monthly totals
      if (!monthWiseTotals[monthYearKey]) {
        monthWiseTotals[monthYearKey] = {
          totalProjects: 0,
          totalVendorPayments: 0,
          totalExpenses: 0,
        };
      }
      monthWiseTotals[monthYearKey].totalProjects += 1;
      
      // Initialize yearly totals
      if (!yearWiseTotals[yearKey]) {
        yearWiseTotals[yearKey] = {
          totalProjects: 0,
          totalVendorPayments: 0,
          totalExpenses: 0,
        };
      }
      yearWiseTotals[yearKey].totalProjects += 1;
      
      // Initialize financial year totals
      if (!finYearWiseTotals[finYear]) {
        finYearWiseTotals[finYear] = {
          totalProjects: 0,
          totalVendorPayments: 0,
          totalExpenses: 0,
        };
      }
      finYearWiseTotals[finYear].totalProjects += 1;
      
      // Initialize store totals
      if (!storeWiseTotals[store]) {
        storeWiseTotals[store] = {
          totalProjects: 0,
          totalVendorPayments: 0,
          totalExpenses: 0,
        };
      }
      storeWiseTotals[store].totalProjects += 1;
    });

    // Calculate vendor payments by time periods
    vendorPayments.forEach((payment) => {
      const transactionDate = new Date(payment.transactionDate);
      const month = transactionDate.getMonth() + 1;
      const year = transactionDate.getFullYear();
      const monthYearKey = `${month}-${year}`;
      const yearKey = `${year}`;
      const finYear = month >= 4 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
      
      // Get lead and store info
      const leadId = payment.leadId;
      const lead = leads.find(l => l.id === leadId);
      const store = lead ? lead.store : "Unknown Store";
      
      // Update monthly totals
      if (monthWiseTotals[monthYearKey]) {
        monthWiseTotals[monthYearKey].totalVendorPayments += payment.amount;
      }
      
      // Update yearly totals
      if (yearWiseTotals[yearKey]) {
        yearWiseTotals[yearKey].totalVendorPayments += payment.amount;
      }
      
      // Update financial year totals
      if (finYearWiseTotals[finYear]) {
        finYearWiseTotals[finYear].totalVendorPayments += payment.amount;
      }
      
      // Update store totals
      if (storeWiseTotals[store]) {
        storeWiseTotals[store].totalVendorPayments += payment.amount;
      }
    });

    // Calculate store expenses by time periods
    storeExpenses.forEach((expense) => {
      const expenseDate = new Date(expense.date);
      const month = expenseDate.getMonth() + 1;
      const year = expenseDate.getFullYear();
      const monthYearKey = `${month}-${year}`;
      const yearKey = `${year}`;
      const finYear = month >= 4 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
      
      // Get user's store
      const userId = expense.userId;
      const user = revenues.find(r => r.userId === userId)?.User;
      const store = user?.store || "Unknown Store";
      
      // Update monthly totals
      if (monthWiseTotals[monthYearKey]) {
        monthWiseTotals[monthYearKey].totalExpenses += expense.amount;
      }
      
      // Update yearly totals
      if (yearWiseTotals[yearKey]) {
        yearWiseTotals[yearKey].totalExpenses += expense.amount;
      }
      
      // Update financial year totals
      if (finYearWiseTotals[finYear]) {
        finYearWiseTotals[finYear].totalExpenses += expense.amount;
      }
      
      // Update store totals
      if (storeWiseTotals[store]) {
        storeWiseTotals[store].totalExpenses += expense.amount;
      }
    });

    // Process revenue data as in the original code
    revenues.forEach((rev) => {
      // Ensure month is parsed as a number and in a valid range (1-12)
      const monthNum = getMonthNumber(rev.month);
      
      // Ensure month is between 1-12
      const month = Math.max(1, Math.min(12, monthNum));

      // Make sure year is a number
      const year = Number(rev.year);
      const monthYearKey = `${rev.month}-${rev.year}`;
      const yearKey = `${rev.year}`;
      const userId = rev.userId;
      const store = rev.User?.store || "Unknown Store"; // Handle users with no store

      // Calculate quarter (1-4) based on the actual month number
      const quarter = Math.ceil(month / 3);
      const quarterKey = `Q${quarter}-${year}`;

      const userStoreKey = `${userId}-${store}`;

      // Determine the financial year (April to March)
      const finYear =
        month >= 4 ? `${year}-${year + 1}` : `${year - 1}-${year}`;

      // Existing aggregations
      if (!monthWiseRevenue[monthYearKey]) {
        monthWiseRevenue[monthYearKey] = {
          totalProfit: 0,
          revenue: 0,
          projectClose: 0,
        };
      }
      monthWiseRevenue[monthYearKey].totalProfit += rev.totalProfit;
      monthWiseRevenue[monthYearKey].revenue += rev.revenue;
      monthWiseRevenue[monthYearKey].projectClose += rev.projectClose;

      if (!yearWiseRevenue[yearKey]) {
        yearWiseRevenue[yearKey] = {
          totalProfit: 0,
          revenue: 0,
          projectClose: 0,
        };
      }
      yearWiseRevenue[yearKey].totalProfit += rev.totalProfit;
      yearWiseRevenue[yearKey].revenue += rev.revenue;
      yearWiseRevenue[yearKey].projectClose += rev.projectClose;

      if (!finYearWiseRevenue[finYear]) {
        finYearWiseRevenue[finYear] = {
          totalProfit: 0,
          revenue: 0,
          projectClose: 0,
        };
      }
      finYearWiseRevenue[finYear].totalProfit += rev.totalProfit;
      finYearWiseRevenue[finYear].revenue += rev.revenue;
      finYearWiseRevenue[finYear].projectClose += rev.projectClose;

      if (!userStoreWiseRevenue[userStoreKey]) {
        userStoreWiseRevenue[userStoreKey] = {
          userId,
          store,
          totalProfit: 0,
          revenue: 0,
          projectClose: 0,
        };
      }
      userStoreWiseRevenue[userStoreKey].totalProfit += rev.totalProfit;
      userStoreWiseRevenue[userStoreKey].revenue += rev.revenue;
      userStoreWiseRevenue[userStoreKey].projectClose += rev.projectClose;

      // New store-specific aggregations

      // 1. Store Monthly Revenue
      if (!storeMonthlyRevenue[store]) {
        storeMonthlyRevenue[store] = {};
      }
      if (!storeMonthlyRevenue[store][monthYearKey]) {
        storeMonthlyRevenue[store][monthYearKey] = {
          month: rev.month,
          year: rev.year,
          totalProfit: 0,
          revenue: 0,
          projectClose: 0,
        };
      }
      storeMonthlyRevenue[store][monthYearKey].totalProfit += rev.totalProfit;
      storeMonthlyRevenue[store][monthYearKey].revenue += rev.revenue;
      storeMonthlyRevenue[store][monthYearKey].projectClose += rev.projectClose;

      // 2. Store Quarterly Revenue - Fixed to use proper quarters
      if (!storeQuarterlyRevenue[store]) {
        storeQuarterlyRevenue[store] = {};
      }
      if (!storeQuarterlyRevenue[store][quarterKey]) {
        storeQuarterlyRevenue[store][quarterKey] = {
          quarter,
          year,
          totalProfit: 0,
          revenue: 0,
          projectClose: 0,
        };
      }
      storeQuarterlyRevenue[store][quarterKey].totalProfit += rev.totalProfit;
      storeQuarterlyRevenue[store][quarterKey].revenue += rev.revenue;
      storeQuarterlyRevenue[store][quarterKey].projectClose += rev.projectClose;

      // 3. Store Yearly Revenue
      if (!storeYearlyRevenue[store]) {
        storeYearlyRevenue[store] = {};
      }
      if (!storeYearlyRevenue[store][yearKey]) {
        storeYearlyRevenue[store][yearKey] = {
          year,
          totalProfit: 0,
          revenue: 0,
          projectClose: 0,
        };
      }
      storeYearlyRevenue[store][yearKey].totalProfit += rev.totalProfit;
      storeYearlyRevenue[store][yearKey].revenue += rev.revenue;
      storeYearlyRevenue[store][yearKey].projectClose += rev.projectClose;

      // 4. Store Financial Year Revenue
      if (!storeFinYearRevenue[store]) {
        storeFinYearRevenue[store] = {};
      }
      if (!storeFinYearRevenue[store][finYear]) {
        storeFinYearRevenue[store][finYear] = {
          finYear,
          totalProfit: 0,
          revenue: 0,
          projectClose: 0,
        };
      }
      storeFinYearRevenue[store][finYear].totalProfit += rev.totalProfit;
      storeFinYearRevenue[store][finYear].revenue += rev.revenue;
      storeFinYearRevenue[store][finYear].projectClose += rev.projectClose;

      // Total overall profit and revenue
      totalProfit += rev.totalProfit;
      totalRevenue += rev.revenue;
    });

    // Merge the additional metrics into existing data structures
    Object.keys(monthWiseRevenue).forEach(key => {
      if (monthWiseTotals[key]) {
        monthWiseRevenue[key] = {
          ...monthWiseRevenue[key],
          ...monthWiseTotals[key]
        };
      } else {
        monthWiseRevenue[key] = {
          ...monthWiseRevenue[key],
          totalProjects: 0,
          totalVendorPayments: 0,
          totalExpenses: 0
        };
      }
    });

    Object.keys(yearWiseRevenue).forEach(key => {
      if (yearWiseTotals[key]) {
        yearWiseRevenue[key] = {
          ...yearWiseRevenue[key],
          ...yearWiseTotals[key]
        };
      } else {
        yearWiseRevenue[key] = {
          ...yearWiseRevenue[key],
          totalProjects: 0,
          totalVendorPayments: 0,
          totalExpenses: 0
        };
      }
    });

    Object.keys(finYearWiseRevenue).forEach(key => {
      if (finYearWiseTotals[key]) {
        finYearWiseRevenue[key] = {
          ...finYearWiseRevenue[key],
          ...finYearWiseTotals[key]
        };
      } else {
        finYearWiseRevenue[key] = {
          ...finYearWiseRevenue[key],
          totalProjects: 0,
          totalVendorPayments: 0,
          totalExpenses: 0
        };
      }
    });

    // Format store data for response
    const formattedStoreData = Object.keys(storeMonthlyRevenue).map((store) => {
      // Get store totals
      const storeTotals = storeWiseTotals[store] || {
        totalProjects: 0,
        totalVendorPayments: 0,
        totalExpenses: 0
      };

      // Add totals to monthly data
      const monthlyData = Object.values(storeMonthlyRevenue[store]).map(monthData => {
        const monthYear = `${monthData.month}-${monthData.year}`;
        const monthTotals = monthWiseTotals[monthYear] || {
          totalProjects: 0,
          totalVendorPayments: 0,
          totalExpenses: 0
        };
        return { ...monthData, ...monthTotals };
      });

      // Add totals to quarterly data
      const quarterlyData = Object.values(storeQuarterlyRevenue[store]).map(quarterData => {
        return { ...quarterData, ...storeTotals };
      });

      // Add totals to yearly data
      const yearlyData = Object.values(storeYearlyRevenue[store]).map(yearData => {
        const yearTotals = yearWiseTotals[yearData.year] || {
          totalProjects: 0,
          totalVendorPayments: 0,
          totalExpenses: 0
        };
        return { ...yearData, ...yearTotals };
      });

      // Add totals to financial year data
      const finYearData = Object.values(storeFinYearRevenue[store]).map(finYearData => {
        const finYearTotals = finYearWiseTotals[finYearData.finYear] || {
          totalProjects: 0,
          totalVendorPayments: 0,
          totalExpenses: 0
        };
        return { ...finYearData, ...finYearTotals };
      });

      return {
        store,
        monthly: monthlyData,
        quarterly: quarterlyData,
        yearly: yearlyData,
        financialYear: finYearData,
        ...storeTotals  // Add store totals at the store level
      };
    });

    console.log("Month-wise Revenue:", monthWiseRevenue);
    console.log("Year-wise Revenue:", yearWiseRevenue);
    console.log("Financial Year-wise Revenue:", finYearWiseRevenue);
    console.log("User-Store-wise Revenue:", userStoreWiseRevenue);
    console.log("Store Data Aggregation:", formattedStoreData);

    return NextResponse.json(
      {
        monthWiseRevenue: Object.entries(monthWiseRevenue).map(
          ([month, data]) => ({ month, ...data })
        ),
        yearWiseRevenue: Object.entries(yearWiseRevenue).map(
          ([year, data]) => ({
            year,
            ...data,
          })
        ),
        finYearWiseRevenue: Object.entries(finYearWiseRevenue).map(
          ([finYear, data]) => ({
            finYear,
            ...data,
          })
        ),
        userStoreWiseRevenue: Object.values(userStoreWiseRevenue),
        storeData: formattedStoreData,
        totalProfit,
        totalRevenue,
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