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

    // Fetch total projects data (leads) with store information
    const leads = await db.lead.findMany();

    // Fetch vendor payments data with more comprehensive information
    const vendorPayments = await db.transactionNote.findMany({
      where: {
        transactionName: "VENDOR_PAYMENT",
      },
      include: {
        lead: {
          select: {
            id: true,
            store: true,
          },
        },
      },
    });

    // Fetch store expenses data with user info
    const storeExpenses = await db.storeExpNotes.findMany({
      include: {
        user: {
          select: {
            id: true,
            store: true,
          },
        },
      },
    });

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
    let totalVendorPayments = 0;
    let totalExpenses = 0;

    // Helper function to get month number from various formats
    const getMonthNumber = (monthRaw: string | number): number => {
      if (typeof monthRaw === "string" && isNaN(Number(monthRaw))) {
        const monthMap: Record<string, number> = {
          january: 1,
          february: 2,
          march: 3,
          april: 4,
          may: 5,
          june: 6,
          july: 7,
          august: 8,
          september: 9,
          october: 10,
          november: 11,
          december: 12,
          jan: 1,
          feb: 2,
          mar: 3,
          apr: 4,
          jun: 6,
          jul: 7,
          aug: 8,
          sep: 9,
          oct: 10,
          nov: 11,
          dec: 12,
        };
        return monthMap[monthRaw.toLowerCase()] || 1;
      } else {
        return Number(monthRaw) || 1;
      }
    };

    // Standardize month format for keys
    const getStandardMonthKey = (month: string | number, year: string | number) => {
      return `${month}-${year}`;
    };

    // Get standard month-year key for aggregations
    const getStandardizedMonthYearKey = (month: number, year: number) => {
      return `${month}-${year}`;
    };

    // Initialize store-wise totals first
    const stores = new Set<string>();
    
    // Add all stores from revenues
    revenues.forEach(rev => {
      if (rev.User?.store) {
        stores.add(rev.User.store);
      }
    });
    
    // Add all stores from leads
    leads.forEach(lead => {
      if (lead.store) {
        stores.add(lead.store);
      }
    });
    
    // Add all stores from vendor payments
    vendorPayments.forEach(payment => {
      if (payment.lead?.store) {
        stores.add(payment.lead.store);
      }
    });
    
    // Add all stores from expenses
    storeExpenses.forEach(expense => {
      if (expense.user?.store) {
        stores.add(expense.user.store);
      }
    });
    
    // Initialize store totals structure
    stores.forEach(store => {
      storeWiseTotals[store] = {
        totalProjects: 0,
        totalVendorPayments: 0,
        totalExpenses: 0,
        totalProfit: 0,
        revenue: 0,
        projectClose: 0
      };
      
      // Initialize container objects for this store
      storeMonthlyRevenue[store] = {};
      storeQuarterlyRevenue[store] = {};
      storeYearlyRevenue[store] = {};
      storeFinYearRevenue[store] = {};
    });

    // Calculate month/year based metrics for leads (projects) by store
    leads.forEach((lead) => {
      const createdDate = new Date(lead.createdAt);
      const month = createdDate.getMonth() + 1; // JS months are 0-indexed
      const year = createdDate.getFullYear();
      const monthYearKey = getStandardizedMonthYearKey(month, year);
      const yearKey = `${year}`;
      const finYear = month >= 4 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
      const store = lead.store || "Unknown Store";

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

      // Count project for this specific store
      storeWiseTotals[store].totalProjects += 1;
      
      // Initialize store monthly data for this project
      const monthName = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(createdDate);
      const displayMonthYearKey = `${monthName}-${year}`;
      
      if (!storeMonthlyRevenue[store][displayMonthYearKey]) {
        storeMonthlyRevenue[store][displayMonthYearKey] = {
          month: monthName,
          year: year.toString(),
          totalProfit: 0,
          revenue: 0,
          projectClose: 0,
          totalProjects: 0,
          totalVendorPayments: 0,
          totalExpenses: 0
        };
      }
      
      // Increment project count for this store and month
      storeMonthlyRevenue[store][displayMonthYearKey].totalProjects += 1;
    });

    // Process vendor payments and attribute to correct stores
    vendorPayments.forEach((payment) => {
      const transactionDate = new Date(payment.transactionDate);
      const month = transactionDate.getMonth() + 1;
      const year = transactionDate.getFullYear();
      
      // Create standardized and display month-year keys
      const standardMonthYearKey = getStandardizedMonthYearKey(month, year);
      
      // Get month name for display
      const monthName = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(transactionDate);
      const displayMonthYearKey = `${monthName}-${year}`;
      
      const yearKey = `${year}`;
      const finYear = month >= 4 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
      
      // Get store from the Lead relationship
      const store = payment.lead?.store || "Unknown Store";
      
      // Update total vendor payments
      totalVendorPayments += payment.amount;
      
      // Update monthly totals
      if (!monthWiseTotals[standardMonthYearKey]) {
        monthWiseTotals[standardMonthYearKey] = {
          totalProjects: 0,
          totalVendorPayments: 0,
          totalExpenses: 0
        };
      }
      monthWiseTotals[standardMonthYearKey].totalVendorPayments += payment.amount;
      
      // Make sure the displayMonthYearKey exists in monthWiseRevenue
      if (!monthWiseRevenue[displayMonthYearKey]) {
        monthWiseRevenue[displayMonthYearKey] = {
          totalProfit: 0,
          revenue: 0,
          projectClose: 0,
          totalProjects: 0,
          totalVendorPayments: 0,
          totalExpenses: 0,
          displayMonth: monthName,
          year
        };
      }
      
      // Update vendor payments directly in monthWiseRevenue
      monthWiseRevenue[displayMonthYearKey].totalVendorPayments += payment.amount;
      
      // Update yearly totals
      if (!yearWiseTotals[yearKey]) {
        yearWiseTotals[yearKey] = {
          totalProjects: 0,
          totalVendorPayments: 0,
          totalExpenses: 0
        };
      }
      yearWiseTotals[yearKey].totalVendorPayments += payment.amount;
      
      // Update financial year totals
      if (!finYearWiseTotals[finYear]) {
        finYearWiseTotals[finYear] = {
          totalProjects: 0,
          totalVendorPayments: 0,
          totalExpenses: 0
        };
      }
      finYearWiseTotals[finYear].totalVendorPayments += payment.amount;
      
      // Update store totals
      storeWiseTotals[store].totalVendorPayments += payment.amount;
      
      // Update store-specific monthly data
      if (!storeMonthlyRevenue[store][displayMonthYearKey]) {
        storeMonthlyRevenue[store][displayMonthYearKey] = {
          month: monthName,
          year: year.toString(),
          totalProfit: 0,
          revenue: 0,
          projectClose: 0,
          totalProjects: 0,
          totalVendorPayments: 0,
          totalExpenses: 0
        };
      }
      storeMonthlyRevenue[store][displayMonthYearKey].totalVendorPayments += payment.amount;
    });

    // Process store expenses and attribute to correct stores
    storeExpenses.forEach((expense) => {
      const expenseDate = new Date(expense.date);
      const month = expenseDate.getMonth() + 1;
      const year = expenseDate.getFullYear();
      
      // Create standardized and display month-year keys
      const standardMonthYearKey = getStandardizedMonthYearKey(month, year);
      
      // Get month name for display
      const monthName = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(expenseDate);
      const displayMonthYearKey = `${monthName}-${year}`;
      
      const yearKey = `${year}`;
      const finYear = month >= 4 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
      
      // Get store from the User relation
      const store = expense.user?.store || "Unknown Store";
      
      // Update total expenses
      totalExpenses += expense.amount;
      
      // Update monthly totals
      if (!monthWiseTotals[standardMonthYearKey]) {
        monthWiseTotals[standardMonthYearKey] = {
          totalProjects: 0,
          totalVendorPayments: 0,
          totalExpenses: 0
        };
      }
      monthWiseTotals[standardMonthYearKey].totalExpenses += expense.amount;
      
      // Make sure the displayMonthYearKey exists in monthWiseRevenue
      if (!monthWiseRevenue[displayMonthYearKey]) {
        monthWiseRevenue[displayMonthYearKey] = {
          totalProfit: 0,
          revenue: 0,
          projectClose: 0,
          totalProjects: 0,
          totalVendorPayments: 0,
          totalExpenses: 0,
          displayMonth: monthName,
          year
        };
      }
      
      // Update expenses directly in monthWiseRevenue
      monthWiseRevenue[displayMonthYearKey].totalExpenses += expense.amount;
      
      // Update yearly totals
      if (!yearWiseTotals[yearKey]) {
        yearWiseTotals[yearKey] = {
          totalProjects: 0,
          totalVendorPayments: 0,
          totalExpenses: 0
        };
      }
      yearWiseTotals[yearKey].totalExpenses += expense.amount;
      
      // Update financial year totals
      if (!finYearWiseTotals[finYear]) {
        finYearWiseTotals[finYear] = {
          totalProjects: 0,
          totalVendorPayments: 0,
          totalExpenses: 0
        };
      }
      finYearWiseTotals[finYear].totalExpenses += expense.amount;
      
      // Update store totals
      storeWiseTotals[store].totalExpenses += expense.amount;
      
      // Update store-specific monthly data
      if (!storeMonthlyRevenue[store][displayMonthYearKey]) {
        storeMonthlyRevenue[store][displayMonthYearKey] = {
          month: monthName,
          year: year.toString(),
          totalProfit: 0,
          revenue: 0,
          projectClose: 0,
          totalProjects: 0,
          totalVendorPayments: 0,
          totalExpenses: 0
        };
      }
      storeMonthlyRevenue[store][displayMonthYearKey].totalExpenses += expense.amount;
    });

    // Process revenue data
    revenues.forEach((rev) => {
      // Ensure month is parsed as a number and in a valid range (1-12)
      const monthNum = getMonthNumber(rev.month);
      const month = Math.max(1, Math.min(12, monthNum));
      const year = Number(rev.year);
      const monthYearKey = getStandardMonthKey(rev.month, rev.year);
      const standardMonthYearKey = getStandardizedMonthYearKey(month, year);
      const yearKey = `${rev.year}`;
      const userId = rev.userId;
      const store = rev.User?.store || "Unknown Store";
      const quarter = Math.ceil(month / 3);
      const quarterKey = `Q${quarter}-${year}`;
      const userStoreKey = `${userId}-${store}`;
      const finYear = month >= 4 ? `${year}-${year + 1}` : `${year - 1}-${year}`;

      // Existing aggregations
      if (!monthWiseRevenue[monthYearKey]) {
        monthWiseRevenue[monthYearKey] = {
          totalProfit: 0,
          revenue: 0,
          projectClose: 0,
          totalProjects: 0,
          totalVendorPayments: 0,
          totalExpenses: 0,
          displayMonth: rev.month,
          year
        };
      }
      monthWiseRevenue[monthYearKey].totalProfit += rev.totalProfit;
      monthWiseRevenue[monthYearKey].revenue += rev.revenue;
      monthWiseRevenue[monthYearKey].projectClose += rev.projectClose;

      // Copy metrics from monthWiseTotals if available
      if (monthWiseTotals[standardMonthYearKey]) {
        monthWiseRevenue[monthYearKey].totalProjects = 
          monthWiseTotals[standardMonthYearKey].totalProjects;
        monthWiseRevenue[monthYearKey].totalVendorPayments = 
          monthWiseTotals[standardMonthYearKey].totalVendorPayments;
        monthWiseRevenue[monthYearKey].totalExpenses = 
          monthWiseTotals[standardMonthYearKey].totalExpenses;
      }

      if (!yearWiseRevenue[yearKey]) {
        yearWiseRevenue[yearKey] = {
          totalProfit: 0,
          revenue: 0,
          projectClose: 0,
          totalProjects: 0,
          totalVendorPayments: 0,
          totalExpenses: 0,
        };
      }
      yearWiseRevenue[yearKey].totalProfit += rev.totalProfit;
      yearWiseRevenue[yearKey].revenue += rev.revenue;
      yearWiseRevenue[yearKey].projectClose += rev.projectClose;

      // Copy metrics from yearWiseTotals
      if (yearWiseTotals[yearKey]) {
        yearWiseRevenue[yearKey].totalProjects = 
          yearWiseTotals[yearKey].totalProjects;
        yearWiseRevenue[yearKey].totalVendorPayments = 
          yearWiseTotals[yearKey].totalVendorPayments;
        yearWiseRevenue[yearKey].totalExpenses = 
          yearWiseTotals[yearKey].totalExpenses;
      }

      if (!finYearWiseRevenue[finYear]) {
        finYearWiseRevenue[finYear] = {
          totalProfit: 0,
          revenue: 0,
          projectClose: 0,
          totalProjects: 0,
          totalVendorPayments: 0,
          totalExpenses: 0,
        };
      }
      finYearWiseRevenue[finYear].totalProfit += rev.totalProfit;
      finYearWiseRevenue[finYear].revenue += rev.revenue;
      finYearWiseRevenue[finYear].projectClose += rev.projectClose;

      // Copy metrics from finYearWiseTotals
      if (finYearWiseTotals[finYear]) {
        finYearWiseRevenue[finYear].totalProjects = 
          finYearWiseTotals[finYear].totalProjects;
        finYearWiseRevenue[finYear].totalVendorPayments = 
          finYearWiseTotals[finYear].totalVendorPayments;
        finYearWiseRevenue[finYear].totalExpenses = 
          finYearWiseTotals[finYear].totalExpenses;
      }

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

      // Update store-specific total metrics
      storeWiseTotals[store].totalProfit += rev.totalProfit;
      storeWiseTotals[store].revenue += rev.revenue;
      storeWiseTotals[store].projectClose += rev.projectClose;

      // New store-specific aggregations
      const monthName = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(
        new Date(`${year}-${month}-01`)
      );
      const displayMonthYearKey = `${monthName}-${year}`;
      
      // 1. Store Monthly Revenue
      if (!storeMonthlyRevenue[store][displayMonthYearKey]) {
        storeMonthlyRevenue[store][displayMonthYearKey] = {
          month: monthName,
          year: year.toString(),
          totalProfit: 0,
          revenue: 0,
          projectClose: 0,
          totalProjects: 0,
          totalVendorPayments: 0,
          totalExpenses: 0,
        };
      }
      storeMonthlyRevenue[store][displayMonthYearKey].totalProfit += rev.totalProfit;
      storeMonthlyRevenue[store][displayMonthYearKey].revenue += rev.revenue;
      storeMonthlyRevenue[store][displayMonthYearKey].projectClose += rev.projectClose;

      // 2. Store Quarterly Revenue
      if (!storeQuarterlyRevenue[store][quarterKey]) {
        storeQuarterlyRevenue[store][quarterKey] = {
          quarter,
          year,
          totalProfit: 0,
          revenue: 0,
          projectClose: 0,
          totalProjects: 0,
          totalVendorPayments: 0,
          totalExpenses: 0
        };
      }
      storeQuarterlyRevenue[store][quarterKey].totalProfit += rev.totalProfit;
      storeQuarterlyRevenue[store][quarterKey].revenue += rev.revenue;
      storeQuarterlyRevenue[store][quarterKey].projectClose += rev.projectClose;

      // 3. Store Yearly Revenue
      if (!storeYearlyRevenue[store][yearKey]) {
        storeYearlyRevenue[store][yearKey] = {
          year,
          totalProfit: 0,
          revenue: 0,
          projectClose: 0,
          totalProjects: 0,
          totalVendorPayments: 0,
          totalExpenses: 0
        };
      }
      storeYearlyRevenue[store][yearKey].totalProfit += rev.totalProfit;
      storeYearlyRevenue[store][yearKey].revenue += rev.revenue;
      storeYearlyRevenue[store][yearKey].projectClose += rev.projectClose;

      // 4. Store Financial Year Revenue
      if (!storeFinYearRevenue[store][finYear]) {
        storeFinYearRevenue[store][finYear] = {
          finYear,
          totalProfit: 0,
          revenue: 0,
          projectClose: 0,
          totalProjects: 0,
          totalVendorPayments: 0,
          totalExpenses: 0
        };
      }
      storeFinYearRevenue[store][finYear].totalProfit += rev.totalProfit;
      storeFinYearRevenue[store][finYear].revenue += rev.revenue;
      storeFinYearRevenue[store][finYear].projectClose += rev.projectClose;

      // Total overall profit and revenue
      totalProfit += rev.totalProfit;
      totalRevenue += rev.revenue;
    });

    // Format store data for response with proper metrics for each level
    const formattedStoreData = Object.keys(storeMonthlyRevenue).map((store) => {
      // Get store totals
      const storeTotals = storeWiseTotals[store] || {
        totalProjects: 0,
        totalVendorPayments: 0,
        totalExpenses: 0,
        totalProfit: 0,
        revenue: 0,
        projectClose: 0
      };
      
      // Calculate quarter-wise store metrics
      const storeQuarters = new Map();
      
      // Process monthly data to build quarters
      Object.values(storeMonthlyRevenue[store]).forEach(monthData => {
        const monthNum = getMonthNumber(monthData.month);
        const year = Number(monthData.year);
        const quarter = Math.ceil(monthNum / 3);
        const quarterKey = `Q${quarter}-${year}`;
        
        if (!storeQuarters.has(quarterKey)) {
          storeQuarters.set(quarterKey, {
            quarter,
            year,
            totalProfit: 0,
            revenue: 0,
            projectClose: 0,
            totalProjects: 0,
            totalVendorPayments: 0, 
            totalExpenses: 0
          });
        }
        
        const quarterData = storeQuarters.get(quarterKey);
        quarterData.totalProfit += monthData.totalProfit || 0;
        quarterData.revenue += monthData.revenue || 0;
        quarterData.projectClose += monthData.projectClose || 0;
        quarterData.totalProjects += monthData.totalProjects || 0;
        quarterData.totalVendorPayments += monthData.totalVendorPayments || 0;
        quarterData.totalExpenses += monthData.totalExpenses || 0;
      });
      
      // Format month data
      const monthlyData = Object.values(storeMonthlyRevenue[store]);
      
      // Format quarter data
      const quarterlyData = Array.from(storeQuarters.values());
      
      // Calculate yearly totals
      const storeYears = new Map();
      Object.values(storeMonthlyRevenue[store]).forEach(monthData => {
        const year = Number(monthData.year);
        const yearKey = `${year}`;
        
        if (!storeYears.has(yearKey)) {
          storeYears.set(yearKey, {
            year,
            totalProfit: 0,
            revenue: 0,
            projectClose: 0,
            totalProjects: 0,
            totalVendorPayments: 0,
            totalExpenses: 0
          });
        }
        
        const yearData = storeYears.get(yearKey);
        yearData.totalProfit += monthData.totalProfit || 0;
        yearData.revenue += monthData.revenue || 0;
        yearData.projectClose += monthData.projectClose || 0;
        yearData.totalProjects += monthData.totalProjects || 0;
        yearData.totalVendorPayments += monthData.totalVendorPayments || 0;
        yearData.totalExpenses += monthData.totalExpenses || 0;
      });
      
      // Format yearly data
      const yearlyData = Array.from(storeYears.values());
      
      // Calculate financial year totals
      const storeFinYears = new Map();
      Object.values(storeMonthlyRevenue[store]).forEach(monthData => {
        const monthNum = getMonthNumber(monthData.month);
        const year = Number(monthData.year);
        const finYear = monthNum >= 4 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
        
        if (!storeFinYears.has(finYear)) {
          storeFinYears.set(finYear, {
            finYear,
            totalProfit: 0,
            revenue: 0,
            projectClose: 0,
            totalProjects: 0,
            totalVendorPayments: 0, 
            totalExpenses: 0
          });
        }
        
        const finYearData = storeFinYears.get(finYear);
        finYearData.totalProfit += monthData.totalProfit || 0;
        finYearData.revenue += monthData.revenue || 0;
        finYearData.projectClose += monthData.projectClose || 0;
        finYearData.totalProjects += monthData.totalProjects || 0;
        finYearData.totalVendorPayments += monthData.totalVendorPayments || 0;
        finYearData.totalExpenses += monthData.totalExpenses || 0;
      });
      
      // Format financial year data
      const finYearData = Array.from(storeFinYears.values());
      
      return {
        store,
        monthly: monthlyData,
        quarterly: quarterlyData,
        yearly: yearlyData,
        financialYear: finYearData,
        ...storeTotals
      };
    });

    // Calculate total vendor payments and expenses if not already done
    if (totalVendorPayments === 0) {
      totalVendorPayments = vendorPayments.reduce((sum, payment) => sum + payment.amount, 0);
    }
    
    if (totalExpenses === 0) {
      totalExpenses = storeExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    }
    
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