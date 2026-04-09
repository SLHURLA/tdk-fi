import { db } from "@/utils/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
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

    const leads = await db.lead.findMany({
      where: {
        status: "CLOSED",
      },
    });

    const vendorPayments = await db.transactionNote.findMany({
      where: {
        transactionName: "VENDOR_PAYMENT",
        lead: {
          status: "CLOSED",
        },
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

    if (!revenues || revenues.length === 0) {
      return NextResponse.json(
        { message: "No revenue data found" },
        { status: 404 }
      );
    }

    const monthWiseRevenue: Record<string, any> = {};
    const yearWiseRevenue: Record<string, any> = {};
    const finYearWiseRevenue: Record<string, any> = {};
    const userStoreWiseRevenue: Record<string, any> = {};
    const storeMonthlyRevenue: Record<string, Record<string, any>> = {};
    const storeQuarterlyRevenue: Record<string, Record<string, any>> = {};
    const storeYearlyRevenue: Record<string, Record<string, any>> = {};
    const storeFinYearRevenue: Record<string, Record<string, any>> = {};

    const monthWiseTotals: Record<string, any> = {};
    const yearWiseTotals: Record<string, any> = {};
    const finYearWiseTotals: Record<string, any> = {};
    const storeWiseTotals: Record<string, any> = {};

    let totalProfit = 0;
    let revenue = 0;
    let totalProjects = leads.length;
    let totalVendorPayments = 0;
    let totalExpenses = 0;
    let totalReceiveCash = 0;    // ✅ ADDED
    let totalReceiveOnline = 0;  // ✅ ADDED

    const getMonthNumber = (monthRaw: string | number): number => {
      if (typeof monthRaw === "string" && isNaN(Number(monthRaw))) {
        const monthMap: Record<string, number> = {
          january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
          july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
          jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
        };
        return monthMap[monthRaw.toLowerCase()] || 1;
      }
      return Number(monthRaw) || 1;
    };

    const getStandardMonthKey = (month: string | number, year: string | number) => `${month}-${year}`;
    const getStandardizedMonthYearKey = (month: number, year: number) => `${month}-${year}`;

    const stores = new Set<string>();
    revenues.forEach((rev) => { if (rev.User?.store) stores.add(rev.User.store); });
    leads.forEach((lead) => { if (lead.store) stores.add(lead.store); });
    vendorPayments.forEach((payment) => { if (payment.lead?.store) stores.add(payment.lead.store); });
    storeExpenses.forEach((expense) => { if (expense.user?.store) stores.add(expense.user.store); });

    stores.forEach((store) => {
      storeWiseTotals[store] = {
        totalProjects: 0,
        totalVendorPayments: 0,
        totalExpenses: 0,
        revenue: 0,
        totalProfit: 0,
        projectClose: 0,
        receiveCash: 0,     // ✅ ADDED
        receiveOnline: 0,   // ✅ ADDED
      };
      storeMonthlyRevenue[store] = {};
      storeQuarterlyRevenue[store] = {};
      storeYearlyRevenue[store] = {};
      storeFinYearRevenue[store] = {};
    });

    // ==================== LEADS LOOP ====================
    leads.forEach((lead) => {
      const createdDate = new Date(lead.createdAt);
      const month = createdDate.getMonth() + 1;
      const year = createdDate.getFullYear();
      const monthYearKey = getStandardizedMonthYearKey(month, year);
      const yearKey = `${year}`;
      const finYear = month >= 4 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
      const store = lead.store || "Unknown Store";

      // ✅ ACCUMULATE GLOBAL TOTALS
      totalReceiveCash += (lead.receiveCash || 0);
      totalReceiveOnline += (lead.receiveOnline || 0);

      if (!monthWiseTotals[monthYearKey]) {
        monthWiseTotals[monthYearKey] = {
          totalProjects: 0,
          totalVendorPayments: 0,
          totalExpenses: 0,
          revenue: 0,
          receiveCash: 0,      // ✅ ADDED
          receiveOnline: 0,    // ✅ ADDED
        };
      }

      // ✅ ACCUMULATE MONTHLY TOTALS
      monthWiseTotals[monthYearKey].receiveCash += (lead.receiveCash || 0);
      monthWiseTotals[monthYearKey].receiveOnline += (lead.receiveOnline || 0);
      monthWiseTotals[monthYearKey].totalProjects += 1;

      if (!yearWiseTotals[yearKey]) {
        yearWiseTotals[yearKey] = {
          totalProjects: 0,
          totalVendorPayments: 0,
          totalExpenses: 0,
          revenue: 0,
          receiveCash: 0,    // ✅ ADD THIS
    receiveOnline: 0,  // ✅ ADD THIS
        };
      }
      yearWiseTotals[yearKey].totalProjects += 1;
yearWiseTotals[yearKey].receiveCash += (lead.receiveCash || 0);
yearWiseTotals[yearKey].receiveOnline += (lead.receiveOnline || 0);

      if (!finYearWiseTotals[finYear]) {
        finYearWiseTotals[finYear] = {
          totalProjects: 0,
          totalVendorPayments: 0,
          totalExpenses: 0,
          revenue: 0,   receiveCash: 0,    // ✅ ADD
    receiveOnline: 0,  // ✅ ADD
        };
      }
      finYearWiseTotals[finYear].totalProjects += 1;
finYearWiseTotals[finYear].receiveCash += (lead.receiveCash || 0);
finYearWiseTotals[finYear].receiveOnline += (lead.receiveOnline || 0);

      storeWiseTotals[store].totalProjects += 1;
      storeWiseTotals[store].receiveCash = (storeWiseTotals[store].receiveCash || 0) + (lead.receiveCash || 0);
      storeWiseTotals[store].receiveOnline = (storeWiseTotals[store].receiveOnline || 0) + (lead.receiveOnline || 0);

      const monthName = new Intl.DateTimeFormat("en-US", { month: "long" }).format(createdDate);
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
          totalExpenses: 0,
          receiveCash: 0,      // ✅ ADDED
          receiveOnline: 0,    // ✅ ADDED
        };
      }

      storeMonthlyRevenue[store][displayMonthYearKey].receiveCash += (lead.receiveCash || 0);
      storeMonthlyRevenue[store][displayMonthYearKey].receiveOnline += (lead.receiveOnline || 0);
      storeMonthlyRevenue[store][displayMonthYearKey].totalProjects += 1;
    });

    // ==================== VENDOR PAYMENTS ====================
    vendorPayments.forEach((payment) => {
      const transactionDate = new Date(payment.transactionDate);
      const month = transactionDate.getMonth() + 1;
      const year = transactionDate.getFullYear();
      const standardMonthYearKey = getStandardizedMonthYearKey(month, year);
      const monthName = new Intl.DateTimeFormat("en-US", { month: "long" }).format(transactionDate);
      const displayMonthYearKey = `${monthName}-${year}`;
      const yearKey = `${year}`;
      const finYear = month >= 4 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
      const store = payment.lead?.store || "Unknown Store";

      totalVendorPayments += payment.amount;

      if (!monthWiseTotals[standardMonthYearKey]) {
        monthWiseTotals[standardMonthYearKey] = {
          totalProjects: 0,
          totalVendorPayments: 0,
          totalExpenses: 0,
          revenue: 0,
          receiveCash: 0,
          receiveOnline: 0,
        };
      }
      monthWiseTotals[standardMonthYearKey].totalVendorPayments += payment.amount;

      if (!monthWiseRevenue[displayMonthYearKey]) {
        monthWiseRevenue[displayMonthYearKey] = {
          totalProfit: 0,
          revenue: 0,
          projectClose: 0,
          totalProjects: 0,
          totalVendorPayments: 0,
          totalExpenses: 0,
          displayMonth: monthName,
          year,
          receiveCash: 0,      // ✅ ADDED
          receiveOnline: 0,    // ✅ ADDED
        };
      }
      monthWiseRevenue[displayMonthYearKey].totalVendorPayments += payment.amount;

      if (!yearWiseTotals[yearKey]) {
        yearWiseTotals[yearKey] = {
          totalProjects: 0,
          totalVendorPayments: 0,
          totalExpenses: 0,
          revenue: 0,
        };
      }
      yearWiseTotals[yearKey].totalVendorPayments += payment.amount;

      if (!finYearWiseTotals[finYear]) {
        finYearWiseTotals[finYear] = {
          totalProjects: 0,
          totalVendorPayments: 0,
          totalExpenses: 0,
          revenue: 0,
        };
      }
      finYearWiseTotals[finYear].totalVendorPayments += payment.amount;

      storeWiseTotals[store].totalVendorPayments += payment.amount;

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
          receiveCash: 0,
          receiveOnline: 0,
        };
      }
      storeMonthlyRevenue[store][displayMonthYearKey].totalVendorPayments += payment.amount;
    });

    // ==================== STORE EXPENSES ====================
    storeExpenses.forEach((expense) => {
      const expenseDate = new Date(expense.date);
      const month = expenseDate.getMonth() + 1;
      const year = expenseDate.getFullYear();
      const standardMonthYearKey = getStandardizedMonthYearKey(month, year);
      const monthName = new Intl.DateTimeFormat("en-US", { month: "long" }).format(expenseDate);
      const displayMonthYearKey = `${monthName}-${year}`;
      const yearKey = `${year}`;
      const finYear = month >= 4 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
      const store = expense.user?.store || "Unknown Store";

      totalExpenses += expense.amount;

      if (!monthWiseTotals[standardMonthYearKey]) {
        monthWiseTotals[standardMonthYearKey] = {
          totalProjects: 0,
          totalVendorPayments: 0,
          totalExpenses: 0,
          revenue: 0,
          receiveCash: 0,
          receiveOnline: 0,
        };
      }
      monthWiseTotals[standardMonthYearKey].totalExpenses += expense.amount;

      if (!monthWiseRevenue[displayMonthYearKey]) {
        monthWiseRevenue[displayMonthYearKey] = {
          totalProfit: 0,
          revenue: 0,
          projectClose: 0,
          totalProjects: 0,
          totalVendorPayments: 0,
          totalExpenses: 0,
          displayMonth: monthName,
          year,
          receiveCash: 0,
          receiveOnline: 0,
        };
      }
      monthWiseRevenue[displayMonthYearKey].totalExpenses += expense.amount;

      if (!yearWiseTotals[yearKey]) {
        yearWiseTotals[yearKey] = {
          totalProjects: 0,
          totalVendorPayments: 0,
          totalExpenses: 0,
          revenue: 0,
        };
      }
      yearWiseTotals[yearKey].totalExpenses += expense.amount;

      if (!finYearWiseTotals[finYear]) {
        finYearWiseTotals[finYear] = {
          totalProjects: 0,
          totalVendorPayments: 0,
          totalExpenses: 0,
          revenue: 0,
        };
      }
      finYearWiseTotals[finYear].totalExpenses += expense.amount;

      storeWiseTotals[store].totalExpenses += expense.amount;

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
          receiveCash: 0,
          receiveOnline: 0,
        };
      }
      storeMonthlyRevenue[store][displayMonthYearKey].totalExpenses += expense.amount;
    });

    // ==================== REVENUE LOOP ====================
    revenues.forEach((rev) => {
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

      if (!monthWiseRevenue[monthYearKey]) {
        monthWiseRevenue[monthYearKey] = {
          totalProfit: 0,
          revenue: 0,
          projectClose: 0,
          totalProjects: 0,
          totalVendorPayments: 0,
          totalExpenses: 0,
          displayMonth: rev.month,
          year,
          receiveCash: 0,      // ✅ ADDED
          receiveOnline: 0,    // ✅ ADDED
        };
      }

      monthWiseRevenue[monthYearKey].revenue += rev.revenue;
      monthWiseRevenue[monthYearKey].projectClose += rev.projectClose;

      // ✅ COPY FROM monthWiseTotals (SAFE WITH OPTIONAL CHAINING)
      monthWiseRevenue[monthYearKey].receiveCash = (monthWiseTotals[standardMonthYearKey]?.receiveCash || 0);
      monthWiseRevenue[monthYearKey].receiveOnline = (monthWiseTotals[standardMonthYearKey]?.receiveOnline || 0);

      if (monthWiseTotals[standardMonthYearKey]) {
        monthWiseRevenue[monthYearKey].totalProjects = monthWiseTotals[standardMonthYearKey].totalProjects;
        monthWiseRevenue[monthYearKey].totalVendorPayments = monthWiseTotals[standardMonthYearKey].totalVendorPayments;
        monthWiseRevenue[monthYearKey].totalExpenses = monthWiseTotals[standardMonthYearKey].totalExpenses;
      }

      monthWiseRevenue[monthYearKey].totalProfit =
        monthWiseRevenue[monthYearKey].revenue -
        (monthWiseRevenue[monthYearKey].totalVendorPayments || 0) -
        (monthWiseRevenue[monthYearKey].totalExpenses || 0);

      if (!yearWiseRevenue[yearKey]) {
        yearWiseRevenue[yearKey] = {
          totalProfit: 0,
          revenue: 0,
          projectClose: 0,
          totalProjects: 0,
          totalVendorPayments: 0,
          totalExpenses: 0,receiveCash: 0,    // ✅ ADD
    receiveOnline: 0,  // ✅ ADD
        };
      }
      yearWiseRevenue[yearKey].revenue += rev.revenue;
      yearWiseRevenue[yearKey].projectClose += rev.projectClose;

      if (yearWiseTotals[yearKey]) {
        yearWiseRevenue[yearKey].totalProjects = yearWiseTotals[yearKey].totalProjects;
        yearWiseRevenue[yearKey].totalVendorPayments = yearWiseTotals[yearKey].totalVendorPayments;
        yearWiseRevenue[yearKey].totalExpenses = yearWiseTotals[yearKey].totalExpenses;
         yearWiseRevenue[yearKey].receiveCash = yearWiseTotals[yearKey].receiveCash || 0;    // ✅ ADD
  yearWiseRevenue[yearKey].receiveOnline = yearWiseTotals[yearKey].receiveOnline || 0; // ✅ ADD
      }

      yearWiseRevenue[yearKey].totalProfit =
        yearWiseRevenue[yearKey].revenue -
        (yearWiseRevenue[yearKey].totalVendorPayments || 0) -
        (yearWiseRevenue[yearKey].totalExpenses || 0);

      if (!finYearWiseRevenue[finYear]) {
        finYearWiseRevenue[finYear] = {
          totalProfit: 0,
          revenue: 0,
          projectClose: 0,
          totalProjects: 0,
          totalVendorPayments: 0,
          totalExpenses: 0,
          receiveCash: 0,    // ✅ ADD
    receiveOnline: 0,  // ✅ ADD
        };
      }
      finYearWiseRevenue[finYear].revenue += rev.revenue;
      finYearWiseRevenue[finYear].projectClose += rev.projectClose;

      if (finYearWiseTotals[finYear]) {
        finYearWiseRevenue[finYear].totalProjects = finYearWiseTotals[finYear].totalProjects;
        finYearWiseRevenue[finYear].totalVendorPayments = finYearWiseTotals[finYear].totalVendorPayments;
        finYearWiseRevenue[finYear].totalExpenses = finYearWiseTotals[finYear].totalExpenses;
        finYearWiseRevenue[finYear].receiveCash = finYearWiseTotals[finYear].receiveCash || 0;    // ✅ ADD
  finYearWiseRevenue[finYear].receiveOnline = finYearWiseTotals[finYear].receiveOnline || 0;
      }

      finYearWiseRevenue[finYear].totalProfit =
        finYearWiseRevenue[finYear].revenue -
        (finYearWiseRevenue[finYear].totalVendorPayments || 0) -
        (finYearWiseRevenue[finYear].totalExpenses || 0);

      if (!userStoreWiseRevenue[userStoreKey]) {
        userStoreWiseRevenue[userStoreKey] = {
          userId,
          store,
          totalProfit: 0,
          revenue: 0,
          projectClose: 0,
          totalVendorPayments: 0,
          totalExpenses: 0,
        };
      }
      userStoreWiseRevenue[userStoreKey].revenue += rev.revenue;
      userStoreWiseRevenue[userStoreKey].projectClose += rev.projectClose;

      storeWiseTotals[store].revenue += rev.revenue;
      storeWiseTotals[store].projectClose += rev.projectClose;

      userStoreWiseRevenue[userStoreKey].totalProfit =
        userStoreWiseRevenue[userStoreKey].revenue -
        (userStoreWiseRevenue[userStoreKey].totalVendorPayments || 0) -
        (userStoreWiseRevenue[userStoreKey].totalExpenses || 0);

      const monthName = new Intl.DateTimeFormat("en-US", { month: "long" }).format(new Date(`${year}-${month}-01`));
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
          totalExpenses: 0,
          receiveCash: 0,
          receiveOnline: 0,
        };
      }
      storeMonthlyRevenue[store][displayMonthYearKey].revenue += rev.revenue;
      storeMonthlyRevenue[store][displayMonthYearKey].projectClose += rev.projectClose;

      storeMonthlyRevenue[store][displayMonthYearKey].totalProfit =
        storeMonthlyRevenue[store][displayMonthYearKey].revenue -
        (storeMonthlyRevenue[store][displayMonthYearKey].totalVendorPayments || 0) -
        (storeMonthlyRevenue[store][displayMonthYearKey].totalExpenses || 0);

      if (!storeQuarterlyRevenue[store][quarterKey]) {
        storeQuarterlyRevenue[store][quarterKey] = {
          quarter,
          year,
          totalProfit: 0,
          revenue: 0,
          projectClose: 0,
          totalProjects: 0,
          totalVendorPayments: 0,
          totalExpenses: 0,
          receiveCash: 0,    // ✅ ADD
    receiveOnline: 0,  // ✅ ADD
        };
      }

      storeQuarterlyRevenue[store][quarterKey].receiveCash += (monthWiseTotals[standardMonthYearKey]?.receiveCash || 0);
storeQuarterlyRevenue[store][quarterKey].receiveOnline += (monthWiseTotals[standardMonthYearKey]?.receiveOnline || 0);


      storeQuarterlyRevenue[store][quarterKey].revenue += rev.revenue;
      storeQuarterlyRevenue[store][quarterKey].projectClose += rev.projectClose;

      storeQuarterlyRevenue[store][quarterKey].totalProfit =
        storeQuarterlyRevenue[store][quarterKey].revenue -
        (storeQuarterlyRevenue[store][quarterKey].totalVendorPayments || 0) -
        (storeQuarterlyRevenue[store][quarterKey].totalExpenses || 0);

      if (!storeYearlyRevenue[store][yearKey]) {
        storeYearlyRevenue[store][yearKey] = {
          year,
          totalProfit: 0,
          revenue: 0,
          projectClose: 0,
          totalProjects: 0,
          totalVendorPayments: 0,
          totalExpenses: 0,
          receiveCash: 0,    // ✅ ADD
    receiveOnline: 0,  // ✅ ADD
        };
      }

      storeYearlyRevenue[store][yearKey].receiveCash = (yearWiseTotals[yearKey]?.receiveCash || 0); // ✅ ADD
storeYearlyRevenue[store][yearKey].receiveOnline = (yearWiseTotals[yearKey]?.receiveOnline || 0); // ✅ ADD

      storeYearlyRevenue[store][yearKey].revenue += rev.revenue;
      storeYearlyRevenue[store][yearKey].projectClose += rev.projectClose;

      storeYearlyRevenue[store][yearKey].totalProfit =
        storeYearlyRevenue[store][yearKey].revenue -
        (storeYearlyRevenue[store][yearKey].totalVendorPayments || 0) -
        (storeYearlyRevenue[store][yearKey].totalExpenses || 0);

      if (!storeFinYearRevenue[store][finYear]) {
        storeFinYearRevenue[store][finYear] = {
          finYear,
          totalProfit: 0,
          revenue: 0,
          projectClose: 0,
          totalProjects: 0,
          totalVendorPayments: 0,
          totalExpenses: 0,
          receiveCash: 0,    // ✅ ADD
    receiveOnline: 0,  // ✅ ADD
        };
      }
      storeFinYearRevenue[store][finYear].receiveCash = (finYearWiseTotals[finYear]?.receiveCash || 0); // ✅ ADD
storeFinYearRevenue[store][finYear].receiveOnline = (finYearWiseTotals[finYear]?.receiveOnline || 0); // ✅ ADD

      storeFinYearRevenue[store][finYear].revenue += rev.revenue;
      storeFinYearRevenue[store][finYear].projectClose += rev.projectClose;

      storeFinYearRevenue[store][finYear].totalProfit =
        storeFinYearRevenue[store][finYear].revenue -
        (storeFinYearRevenue[store][finYear].totalVendorPayments || 0) -
        (storeFinYearRevenue[store][finYear].totalExpenses || 0);

      revenue += rev.revenue;
    });

    Object.keys(storeWiseTotals).forEach((store) => {
      storeWiseTotals[store].totalProfit =
        storeWiseTotals[store].revenue -
        (storeWiseTotals[store].totalVendorPayments || 0) -
        (storeWiseTotals[store].totalExpenses || 0);
    });

    totalProfit = revenue - totalVendorPayments - totalExpenses;

    const formattedStoreData = Object.keys(storeMonthlyRevenue).map((store) => {
      const storeTotals = storeWiseTotals[store] || {
        totalProjects: 0,
        totalVendorPayments: 0,
        totalExpenses: 0,
        totalProfit: 0,
        revenue: 0,
        projectClose: 0,
        receiveCash: 0,
        receiveOnline: 0,
      };

      const storeQuarters = new Map();
      Object.values(storeMonthlyRevenue[store]).forEach((monthData: any) => {
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
            totalExpenses: 0,
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

      const monthlyData = Object.values(storeMonthlyRevenue[store]);
      const quarterlyData = Array.from(storeQuarters.values());

      const storeYears = new Map();
      Object.values(storeMonthlyRevenue[store]).forEach((monthData: any) => {
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
            totalExpenses: 0,
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

      const yearlyData = Array.from(storeYears.values());

      const storeFinYears = new Map();
      Object.values(storeMonthlyRevenue[store]).forEach((monthData: any) => {
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
            totalExpenses: 0,
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

      const finYearData = Array.from(storeFinYears.values());

      return {
        store,
        monthly: monthlyData,
        quarterly: quarterlyData,
        yearly: yearlyData,
        financialYear: finYearData,
        ...storeTotals,
      };
    });

    // ✅ RETURN WITH totalReceiveCash AND totalReceiveOnline
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
        revenue,
        totalProjects,
        totalVendorPayments,
        totalExpenses,
        totalReceiveCash,        // ✅ CRITICAL - MUST HAVE THIS
        totalReceiveOnline,      // ✅ CRITICAL - MUST HAVE THIS
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