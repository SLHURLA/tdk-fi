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

    // Fetch leads for the user's store.
    // We select the scalar GST / vendor-exp fields AND include the scoped
    // VENDOR_PAYMENT transactions (kept for backward compatibility / display).
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

    // Time-based aggregation buckets
    const monthWiseTotals: Record<string, any> = {};
    const yearWiseTotals: Record<string, any> = {};
    const finYearWiseTotals: Record<string, any> = {};

    let totalRevenue = 0;
    let totalProjectClose = 0;
    let totalProjects = leads.length;
    let totalVendorPayments = 0; // actual VENDOR_PAYMENT transaction amounts
    let totalVendorExp = 0; // budgeted vendor cost (lead.totalExp)
    let totalGST = 0; // lead.totalGST
    let totalExpenses = 0; // store expense notes

    // Empty bucket helper — every metric pre-populated to avoid undefined
    const emptyBucket = () => ({
      totalProjects: 0,
      totalVendorPayments: 0,
      totalVendorExp: 0,
      totalGST: 0,
      totalExpenses: 0,
    });

    // ── Global vendor-payment / vendor-exp / GST grand totals ────────────────
    leads.forEach((lead) => {
      totalVendorPayments += lead.transactions.reduce(
        (sum, tx) => sum + (tx.amount || 0),
        0
      );
      totalVendorExp += lead.totalExp || 0;
      totalGST += lead.totalGST || 0;
    });

    // Total expenses
    totalExpenses = storeExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);

    // ── Leads loop: time-based aggregations ──────────────────────────────────
    leads.forEach((lead) => {
      const createdDate = new Date(lead.createdAt);
      const month = createdDate.getMonth() + 1; // JS months are 0-indexed
      const year = createdDate.getFullYear();
      const monthName = getMonthName(month);
      const yearString = year.toString();
      const monthYearKey = `${monthName}-${yearString}`;

      // Per-lead values
      const leadVendorPayments = lead.transactions.reduce(
        (sum, tx) => sum + (tx.amount || 0),
        0
      );
      const leadVendorExp = lead.totalExp || 0;
      const leadGST = lead.totalGST || 0;

      // Financial year (April–March)
      const finYear =
        month >= 4 ? `${year}-${year + 1}` : `${year - 1}-${year}`;

      // Monthly totals
      if (!monthWiseTotals[monthYearKey])
        monthWiseTotals[monthYearKey] = emptyBucket();
      monthWiseTotals[monthYearKey].totalProjects += 1;
      monthWiseTotals[monthYearKey].totalVendorPayments += leadVendorPayments;
      monthWiseTotals[monthYearKey].totalVendorExp += leadVendorExp;
      monthWiseTotals[monthYearKey].totalGST += leadGST;

      // Yearly totals
      if (!yearWiseTotals[yearString])
        yearWiseTotals[yearString] = emptyBucket();
      yearWiseTotals[yearString].totalProjects += 1;
      yearWiseTotals[yearString].totalVendorPayments += leadVendorPayments;
      yearWiseTotals[yearString].totalVendorExp += leadVendorExp;
      yearWiseTotals[yearString].totalGST += leadGST;

      // Financial year totals
      if (!finYearWiseTotals[finYear])
        finYearWiseTotals[finYear] = emptyBucket();
      finYearWiseTotals[finYear].totalProjects += 1;
      finYearWiseTotals[finYear].totalVendorPayments += leadVendorPayments;
      finYearWiseTotals[finYear].totalVendorExp += leadVendorExp;
      finYearWiseTotals[finYear].totalGST += leadGST;
    });

    // ── Expenses loop: time-based aggregations ───────────────────────────────
    storeExpenses.forEach((expense) => {
      const expenseDate = new Date(expense.date);
      const month = expenseDate.getMonth() + 1;
      const year = expenseDate.getFullYear();
      const monthName = getMonthName(month);
      const yearString = year.toString();
      const monthYearKey = `${monthName}-${yearString}`;
      const amount = expense.amount || 0;

      const finYear =
        month >= 4 ? `${year}-${year + 1}` : `${year - 1}-${year}`;

      if (!monthWiseTotals[monthYearKey])
        monthWiseTotals[monthYearKey] = emptyBucket();
      monthWiseTotals[monthYearKey].totalExpenses += amount;

      if (!yearWiseTotals[yearString])
        yearWiseTotals[yearString] = emptyBucket();
      yearWiseTotals[yearString].totalExpenses += amount;

      if (!finYearWiseTotals[finYear])
        finYearWiseTotals[finYear] = emptyBucket();
      finYearWiseTotals[finYear].totalExpenses += amount;
    });

    // ── Revenue loop ─────────────────────────────────────────────────────────
    revenues.forEach((rev) => {
      const createdDate = new Date(rev.createdAt);
      const monthName = rev.month; // e.g., 'April'
      const yearString = rev.year; // e.g., '2025'

      const monthNum = createdDate.getMonth() + 1;
      const yearNum = createdDate.getFullYear();

      const monthYearKey = `${monthName}-${yearString}`;
      const store = rev.User?.store || "Unknown Store";
      const userStoreKey = `${rev.userId}-${store}`;

      const finYear =
        monthNum >= 4
          ? `${yearNum}-${yearNum + 1}`
          : `${yearNum - 1}-${yearNum}`;

      // Month-wise revenue
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

      // Year-wise revenue
      if (!yearWiseRevenue[yearString]) {
        yearWiseRevenue[yearString] = { revenue: 0, projectClose: 0 };
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

      // Financial Year-wise revenue
      if (!finYearWiseRevenue[finYear]) {
        finYearWiseRevenue[finYear] = { totalRevenue: 0, projectClose: 0 };
      }
      finYearWiseRevenue[finYear].totalRevenue += rev.revenue;
      finYearWiseRevenue[finYear].projectClose += rev.projectClose;

      totalRevenue += rev.revenue;
      totalProjectClose += rev.projectClose;
    });

    // ── Global net profit ────────────────────────────────────────────────────
    // Gross Profit = Revenue − Vendor Exp − GST
    // Net Profit   = Gross Profit − Store Expenses
    const totalProfit =
      totalRevenue - totalVendorExp - totalGST - totalExpenses;

    // ── Merge metrics + per-bucket profit (Revenue − VendorExp − GST − Exp) ──
    Object.keys(monthWiseRevenue).forEach((key) => {
      const t = monthWiseTotals[key] || emptyBucket();
      const revenue = monthWiseRevenue[key].revenue;
      monthWiseRevenue[key] = {
        ...monthWiseRevenue[key],
        ...t,
        totalProfit:
          revenue - t.totalVendorExp - t.totalGST - t.totalExpenses,
      };
    });

    Object.keys(yearWiseRevenue).forEach((key) => {
      const t = yearWiseTotals[key] || emptyBucket();
      const revenue = yearWiseRevenue[key].revenue;
      yearWiseRevenue[key] = {
        ...yearWiseRevenue[key],
        ...t,
        totalProfit:
          revenue - t.totalVendorExp - t.totalGST - t.totalExpenses,
      };
    });

    Object.keys(finYearWiseRevenue).forEach((key) => {
      const t = finYearWiseTotals[key] || emptyBucket();
      const revenue = finYearWiseRevenue[key].totalRevenue;
      finYearWiseRevenue[key] = {
        ...finYearWiseRevenue[key],
        ...t,
        totalProfit:
          revenue - t.totalVendorExp - t.totalGST - t.totalExpenses,
      };
    });

    // ── User-store revenue (single store for a store manager) ────────────────
    // Use this store's OWN totals, not the grand totals.
    Object.keys(userStoreWiseRevenue).forEach((key) => {
      const storeRevenue = userStoreWiseRevenue[key].revenue;
      const storeProfit =
        storeRevenue - totalVendorExp - totalGST - totalExpenses;

      userStoreWiseRevenue[key] = {
        ...userStoreWiseRevenue[key],
        totalProjects,
        totalVendorPayments,
        totalVendorExp,
        totalGST,
        totalExpenses,
        totalProfit: storeProfit,
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
          ([finYear, data]) => ({ finYear, ...data })
        ),
        totalProfit,
        totalRevenue,
        totalProjectClose,
        totalProjects,
        totalVendorPayments,
        totalVendorExp,
        totalGST,
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