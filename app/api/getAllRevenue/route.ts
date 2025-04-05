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

    let totalProfit = 0;
    let totalRevenue = 0;

    revenues.forEach((rev) => {
      // Ensure month is parsed as a number and in a valid range (1-12)
      const monthRaw = rev.month; // This could be a string like "March" or "3" or 3

      // Convert text month names to numbers if needed
      let monthNum: number;
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
        monthNum = monthMap[monthRaw.toLowerCase()] || 1; // Default to 1 if not found
      } else {
        monthNum = Number(monthRaw) || 1; // Default to 1 if parsing fails
      }

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

    // Format store data for response
    const formattedStoreData = Object.keys(storeMonthlyRevenue).map((store) => {
      return {
        store,
        monthly: Object.values(storeMonthlyRevenue[store]),
        quarterly: Object.values(storeQuarterlyRevenue[store]),
        yearly: Object.values(storeYearlyRevenue[store]),
        financialYear: Object.values(storeFinYearRevenue[store]),
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
