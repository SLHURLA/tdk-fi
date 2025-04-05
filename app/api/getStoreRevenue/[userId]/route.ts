import { db } from "@/utils/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const userId = parseInt((await params).userId);
    const parsedUserId = userId ? Number(userId) : undefined;

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

    const monthWiseRevenue: Record<string, any> = {};
    const userStoreWiseRevenue: Record<string, any> = {};
    const yearWiseRevenue: Record<string, any> = {};
    const finYearWiseRevenue: Record<string, any> = {};
    const finYearWiseProjectClose: Record<string, any> = {};
    let totalProfit = 0;
    let totalRevenue = 0;
    let totalProjectClose = 0;

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
        monthNum >= 4 ? `${yearNum}-${yearNum + 1}` : `${yearNum - 1}-${yearNum}`;

      // Month-wise revenue (using original month/year strings)
      if (!monthWiseRevenue[monthYearKey]) {
        monthWiseRevenue[monthYearKey] = {
          totalProfit: 0,
          revenue: 0,
          projectClose: 0,
          month: monthName,
          year: yearString,
        };
      }
      monthWiseRevenue[monthYearKey].totalProfit += rev.totalProfit;
      monthWiseRevenue[monthYearKey].revenue += rev.revenue;
      monthWiseRevenue[monthYearKey].projectClose += rev.projectClose;

      // Year-wise revenue (using original year string)
      if (!yearWiseRevenue[yearString]) {
        yearWiseRevenue[yearString] = {
          totalProfit: 0,
          revenue: 0,
          projectClose: 0,
        };
      }
      yearWiseRevenue[yearString].totalProfit += rev.totalProfit;
      yearWiseRevenue[yearString].revenue += rev.revenue;
      yearWiseRevenue[yearString].projectClose += rev.projectClose;

      // User-Store-wise revenue
      if (!userStoreWiseRevenue[userStoreKey]) {
        userStoreWiseRevenue[userStoreKey] = {
          userId: rev.userId,
          store,
          totalProfit: 0,
          revenue: 0,
          projectClose: 0,
        };
      }
      userStoreWiseRevenue[userStoreKey].totalProfit += rev.totalProfit;
      userStoreWiseRevenue[userStoreKey].revenue += rev.revenue;
      userStoreWiseRevenue[userStoreKey].projectClose += rev.projectClose;
 
      // Financial Year-wise revenue and project close calculation
      if (!finYearWiseRevenue[finYear]) {
        finYearWiseRevenue[finYear] = { 
          totalRevenue: 0,
          totalProfit: 0,
          projectClose: 0
        };
      }
      finYearWiseRevenue[finYear].totalRevenue += rev.revenue;
      finYearWiseRevenue[finYear].totalProfit += rev.totalProfit;
      finYearWiseRevenue[finYear].projectClose += rev.projectClose;

      // Total overall profit, revenue, and project close
      totalProfit += rev.totalProfit;
      totalRevenue += rev.revenue;
      totalProjectClose += rev.projectClose;
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