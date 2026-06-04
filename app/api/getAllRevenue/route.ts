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
      where: { status: "CLOSED" },
    });

    const vendorPayments = await db.transactionNote.findMany({
      where: {
        transactionName: "VENDOR_PAYMENT",
        lead: { status: "CLOSED" },
      },
      include: {
        lead: {
          select: { id: true, store: true },
        },
      },
    });

    const storeExpenses = await db.storeExpNotes.findMany({
      include: {
        user: {
          select: { id: true, store: true },
        },
      },
    });

    if (!revenues || revenues.length === 0) {
      return NextResponse.json(
        { message: "No revenue data found" },
        { status: 404 }
      );
    }

    // ── Aggregation buckets ──────────────────────────────────────────────────

    const monthWiseRevenue: Record<string, any>                    = {};
    const yearWiseRevenue: Record<string, any>                     = {};
    const finYearWiseRevenue: Record<string, any>                  = {};
    const userStoreWiseRevenue: Record<string, any>                = {};
    const storeMonthlyRevenue: Record<string, Record<string, any>> = {};
    const storeQuarterlyRevenue: Record<string, Record<string, any>> = {};
    const storeYearlyRevenue: Record<string, Record<string, any>>  = {};
    const storeFinYearRevenue: Record<string, Record<string, any>> = {};

    // Intermediate totals keyed by numeric month-year / year / finYear
    const monthWiseTotals: Record<string, any>  = {};
    const yearWiseTotals: Record<string, any>   = {};
    const finYearWiseTotals: Record<string, any> = {};
    const storeWiseTotals: Record<string, any>  = {};

    // Global grand-total accumulators
    let totalProfit        = 0;
    let revenue            = 0;
    let totalProjects      = leads.length;
    let totalVendorPayments = 0;  // actual transaction payments to vendors
    let totalExpenses      = 0;   // store expense notes
    let totalReceiveCash   = 0;
    let totalReceiveOnline = 0;
    let totalGST           = 0;   // lead.totalGST
    let totalVendorExp     = 0;   // lead.totalExp (budgeted vendor cost)

    // ── Helpers ──────────────────────────────────────────────────────────────

    const getMonthNumber = (monthRaw: string | number): number => {
      if (typeof monthRaw === "string" && isNaN(Number(monthRaw))) {
        const monthMap: Record<string, number> = {
          january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
          july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
          jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, aug: 8,
          sep: 9, oct: 10, nov: 11, dec: 12,
        };
        return monthMap[monthRaw.toLowerCase()] || 1;
      }
      return Number(monthRaw) || 1;
    };

    // Key used by Revenue DB rows: "January-2025"
    const getStandardMonthKey = (month: string | number, year: string | number) =>
      `${month}-${year}`;

    // Key used by leads/vendor-payments/expenses: "1-2025"
    const getNumericMonthYearKey = (month: number, year: number) =>
      `${month}-${year}`;

    // Empty bucket with every field pre-populated to avoid undefined
    const emptyMonthBucket = () => ({
      totalProjects:       0,
      totalVendorPayments: 0,
      totalExpenses:       0,
      revenue:             0,
      receiveCash:         0,
      receiveOnline:       0,
      totalGST:            0,
      totalVendorExp:      0,
    });

    const emptyYearBucket = () => ({
      totalProjects:       0,
      totalVendorPayments: 0,
      totalExpenses:       0,
      revenue:             0,
      receiveCash:         0,
      receiveOnline:       0,
      totalGST:            0,
      totalVendorExp:      0,
    });

    const emptyFinYearBucket = () => ({
      totalProjects:       0,
      totalVendorPayments: 0,
      totalExpenses:       0,
      revenue:             0,
      receiveCash:         0,
      receiveOnline:       0,
      totalGST:            0,
      totalVendorExp:      0,
    });

    const emptyStoreMonthBucket = (monthName: string, year: number) => ({
      month:               monthName,
      year:                year.toString(),
      totalProfit:         0,
      revenue:             0,
      projectClose:        0,
      totalProjects:       0,
      totalVendorPayments: 0,
      totalExpenses:       0,
      receiveCash:         0,
      receiveOnline:       0,
      totalGST:            0,
      totalVendorExp:      0,
    });

    // ── Collect all stores ────────────────────────────────────────────────────

    const stores = new Set<string>();
    revenues.forEach((r)       => { if (r.User?.store)          stores.add(r.User.store); });
    leads.forEach((l)          => { if (l.store)                stores.add(l.store); });
    vendorPayments.forEach((p) => { if (p.lead?.store)          stores.add(p.lead.store); });
    storeExpenses.forEach((e)  => { if (e.user?.store)          stores.add(e.user.store); });

    stores.forEach((store) => {
      storeWiseTotals[store] = {
        totalProjects:       0,
        totalVendorPayments: 0,
        totalExpenses:       0,
        revenue:             0,
        totalProfit:         0,
        projectClose:        0,
        receiveCash:         0,
        receiveOnline:       0,
        totalGST:            0,
        totalVendorExp:      0,
      };
      storeMonthlyRevenue[store]   = {};
      storeQuarterlyRevenue[store] = {};
      storeYearlyRevenue[store]    = {};
      storeFinYearRevenue[store]   = {};
    });

    // ==================== LEADS LOOP =========================================
    // Tracks: receiveCash, receiveOnline, totalGST (lead.totalGST),
    //         totalVendorExp (lead.totalExp), totalProjects
    // Date key = lead.createdAt (numeric key e.g. "4-2025")

    leads.forEach((lead) => {
      const createdDate  = new Date(lead.createdAt);
      const month        = createdDate.getMonth() + 1;
      const year         = createdDate.getFullYear();
      const numKey       = getNumericMonthYearKey(month, year);
      const yearKey      = `${year}`;
      const finYear      = month >= 4 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
      const store        = lead.store || "Unknown Store";
      const monthName    = new Intl.DateTimeFormat("en-US", { month: "long" }).format(createdDate);
      const displayKey   = `${monthName}-${year}`;

      const gst          = lead.totalGST  || 0;
      const vendorExp    = lead.totalExp   || 0;
      const rCash        = lead.receiveCash  || 0;
      const rOnline      = lead.receiveOnline || 0;

      // Global
      totalReceiveCash   += rCash;
      totalReceiveOnline += rOnline;
      totalGST           += gst;
      totalVendorExp     += vendorExp;

      // monthWiseTotals (numeric key)
      if (!monthWiseTotals[numKey]) monthWiseTotals[numKey] = emptyMonthBucket();
      monthWiseTotals[numKey].totalProjects  += 1;
      monthWiseTotals[numKey].receiveCash    += rCash;
      monthWiseTotals[numKey].receiveOnline  += rOnline;
      monthWiseTotals[numKey].totalGST       += gst;
      monthWiseTotals[numKey].totalVendorExp += vendorExp;

      // yearWiseTotals
      if (!yearWiseTotals[yearKey]) yearWiseTotals[yearKey] = emptyYearBucket();
      yearWiseTotals[yearKey].totalProjects  += 1;
      yearWiseTotals[yearKey].receiveCash    += rCash;
      yearWiseTotals[yearKey].receiveOnline  += rOnline;
      yearWiseTotals[yearKey].totalGST       += gst;
      yearWiseTotals[yearKey].totalVendorExp += vendorExp;

      // finYearWiseTotals
      if (!finYearWiseTotals[finYear]) finYearWiseTotals[finYear] = emptyFinYearBucket();
      finYearWiseTotals[finYear].totalProjects  += 1;
      finYearWiseTotals[finYear].receiveCash    += rCash;
      finYearWiseTotals[finYear].receiveOnline  += rOnline;
      finYearWiseTotals[finYear].totalGST       += gst;
      finYearWiseTotals[finYear].totalVendorExp += vendorExp;

      // storeWiseTotals
      if (!storeWiseTotals[store]) storeWiseTotals[store] = {
        totalProjects: 0, totalVendorPayments: 0, totalExpenses: 0,
        revenue: 0, totalProfit: 0, projectClose: 0,
        receiveCash: 0, receiveOnline: 0, totalGST: 0, totalVendorExp: 0,
      };
      storeWiseTotals[store].totalProjects  += 1;
      storeWiseTotals[store].receiveCash    += rCash;
      storeWiseTotals[store].receiveOnline  += rOnline;
      storeWiseTotals[store].totalGST       += gst;
      storeWiseTotals[store].totalVendorExp += vendorExp;

      // storeMonthlyRevenue
      if (!storeMonthlyRevenue[store]) storeMonthlyRevenue[store] = {};
      if (!storeMonthlyRevenue[store][displayKey])
        storeMonthlyRevenue[store][displayKey] = emptyStoreMonthBucket(monthName, year);
      storeMonthlyRevenue[store][displayKey].totalProjects  += 1;
      storeMonthlyRevenue[store][displayKey].receiveCash    += rCash;
      storeMonthlyRevenue[store][displayKey].receiveOnline  += rOnline;
      storeMonthlyRevenue[store][displayKey].totalGST       += gst;
      storeMonthlyRevenue[store][displayKey].totalVendorExp += vendorExp;
    });

    // ==================== VENDOR PAYMENTS LOOP ===============================
    // Tracks: totalVendorPayments (actual transaction amounts)
    // Date key = payment.transactionDate

    vendorPayments.forEach((payment) => {
      const txDate     = new Date(payment.transactionDate);
      const month      = txDate.getMonth() + 1;
      const year       = txDate.getFullYear();
      const numKey     = getNumericMonthYearKey(month, year);
      const yearKey    = `${year}`;
      const finYear    = month >= 4 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
      const monthName  = new Intl.DateTimeFormat("en-US", { month: "long" }).format(txDate);
      const displayKey = `${monthName}-${year}`;
      const store      = payment.lead?.store || "Unknown Store";
      const amount     = payment.amount || 0;

      totalVendorPayments += amount;

      if (!monthWiseTotals[numKey])   monthWiseTotals[numKey]   = emptyMonthBucket();
      monthWiseTotals[numKey].totalVendorPayments += amount;

      if (!yearWiseTotals[yearKey])   yearWiseTotals[yearKey]   = emptyYearBucket();
      yearWiseTotals[yearKey].totalVendorPayments += amount;

      if (!finYearWiseTotals[finYear]) finYearWiseTotals[finYear] = emptyFinYearBucket();
      finYearWiseTotals[finYear].totalVendorPayments += amount;

      storeWiseTotals[store].totalVendorPayments += amount;

      // monthWiseRevenue (display key)
      if (!monthWiseRevenue[displayKey]) {
        monthWiseRevenue[displayKey] = {
          totalProfit: 0, revenue: 0, projectClose: 0, totalProjects: 0,
          totalVendorPayments: 0, totalExpenses: 0,
          receiveCash: 0, receiveOnline: 0, totalGST: 0, totalVendorExp: 0,
          displayMonth: monthName, year,
        };
      }
      monthWiseRevenue[displayKey].totalVendorPayments += amount;

      if (!storeMonthlyRevenue[store]) storeMonthlyRevenue[store] = {};
      if (!storeMonthlyRevenue[store][displayKey])
        storeMonthlyRevenue[store][displayKey] = emptyStoreMonthBucket(monthName, year);
      storeMonthlyRevenue[store][displayKey].totalVendorPayments += amount;
    });

    // ==================== STORE EXPENSES LOOP ================================
    // Tracks: totalExpenses (storeExpNotes amounts)
    // Date key = expense.date

    storeExpenses.forEach((expense) => {
      const expDate    = new Date(expense.date);
      const month      = expDate.getMonth() + 1;
      const year       = expDate.getFullYear();
      const numKey     = getNumericMonthYearKey(month, year);
      const yearKey    = `${year}`;
      const finYear    = month >= 4 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
      const monthName  = new Intl.DateTimeFormat("en-US", { month: "long" }).format(expDate);
      const displayKey = `${monthName}-${year}`;
      const store      = expense.user?.store || "Unknown Store";
      const amount     = expense.amount || 0;

      totalExpenses += amount;

      if (!monthWiseTotals[numKey])    monthWiseTotals[numKey]    = emptyMonthBucket();
      monthWiseTotals[numKey].totalExpenses += amount;

      if (!yearWiseTotals[yearKey])    yearWiseTotals[yearKey]    = emptyYearBucket();
      yearWiseTotals[yearKey].totalExpenses += amount;

      if (!finYearWiseTotals[finYear]) finYearWiseTotals[finYear] = emptyFinYearBucket();
      finYearWiseTotals[finYear].totalExpenses += amount;

      storeWiseTotals[store].totalExpenses += amount;

      if (!monthWiseRevenue[displayKey]) {
        monthWiseRevenue[displayKey] = {
          totalProfit: 0, revenue: 0, projectClose: 0, totalProjects: 0,
          totalVendorPayments: 0, totalExpenses: 0,
          receiveCash: 0, receiveOnline: 0, totalGST: 0, totalVendorExp: 0,
          displayMonth: monthName, year,
        };
      }
      monthWiseRevenue[displayKey].totalExpenses += amount;

      if (!storeMonthlyRevenue[store]) storeMonthlyRevenue[store] = {};
      if (!storeMonthlyRevenue[store][displayKey])
        storeMonthlyRevenue[store][displayKey] = emptyStoreMonthBucket(monthName, year);
      storeMonthlyRevenue[store][displayKey].totalExpenses += amount;
    });

    // ==================== REVENUE LOOP =======================================
    // Revenue DB rows carry: revenue, projectClose, month (name), year
    // Date key = Revenue.month + Revenue.year (display key e.g. "January-2025")

    revenues.forEach((rev) => {
      const monthNum       = getMonthNumber(rev.month);
      const month          = Math.max(1, Math.min(12, monthNum));
      const year           = Number(rev.year);
      const displayKey     = getStandardMonthKey(rev.month, rev.year); // "January-2025"
      const numKey         = getNumericMonthYearKey(month, year);       // "1-2025"
      const yearKey        = `${rev.year}`;
      const finYear        = month >= 4 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
      const userId         = rev.userId;
      const store          = rev.User?.store || "Unknown Store";
      const quarter        = Math.ceil(month / 3);
      const quarterKey     = `Q${quarter}-${year}`;
      const userStoreKey   = `${userId}-${store}`;
      const monthName      = new Intl.DateTimeFormat("en-US", { month: "long" })
                               .format(new Date(`${year}-${String(month).padStart(2,"0")}-01`));
      const storeDisplayKey = `${monthName}-${year}`;

      const mTotals = monthWiseTotals[numKey]   || emptyMonthBucket();
      const yTotals = yearWiseTotals[yearKey]    || emptyYearBucket();
      const fTotals = finYearWiseTotals[finYear] || emptyFinYearBucket();

      // ── monthWiseRevenue ──────────────────────────────────────────────────
      if (!monthWiseRevenue[displayKey]) {
        monthWiseRevenue[displayKey] = {
          totalProfit: 0, revenue: 0, projectClose: 0,
          totalProjects: 0, totalVendorPayments: 0, totalExpenses: 0,
          receiveCash: 0, receiveOnline: 0, totalGST: 0, totalVendorExp: 0,
          displayMonth: rev.month, year,
        };
      }
      monthWiseRevenue[displayKey].revenue       += rev.revenue;
      monthWiseRevenue[displayKey].projectClose  += rev.projectClose;
      // Merge totals (overwrite with latest accumulated values)
      monthWiseRevenue[displayKey].totalProjects       = mTotals.totalProjects;
      monthWiseRevenue[displayKey].totalVendorPayments = mTotals.totalVendorPayments;
      monthWiseRevenue[displayKey].totalExpenses       = mTotals.totalExpenses;
      monthWiseRevenue[displayKey].receiveCash         = mTotals.receiveCash;
      monthWiseRevenue[displayKey].receiveOnline       = mTotals.receiveOnline;
      monthWiseRevenue[displayKey].totalGST            = mTotals.totalGST;
      monthWiseRevenue[displayKey].totalVendorExp      = mTotals.totalVendorExp;
      // Gross Profit = Revenue − Vendor Exp − GST
      // Net Profit   = Gross Profit − Store Expenses
      const mGross = monthWiseRevenue[displayKey].revenue
                   - monthWiseRevenue[displayKey].totalVendorExp
                   - monthWiseRevenue[displayKey].totalGST;
      monthWiseRevenue[displayKey].totalProfit = mGross - monthWiseRevenue[displayKey].totalExpenses;

      // ── yearWiseRevenue ───────────────────────────────────────────────────
      if (!yearWiseRevenue[yearKey]) {
        yearWiseRevenue[yearKey] = {
          totalProfit: 0, revenue: 0, projectClose: 0,
          totalProjects: 0, totalVendorPayments: 0, totalExpenses: 0,
          receiveCash: 0, receiveOnline: 0, totalGST: 0, totalVendorExp: 0,
        };
      }
      yearWiseRevenue[yearKey].revenue      += rev.revenue;
      yearWiseRevenue[yearKey].projectClose += rev.projectClose;
      yearWiseRevenue[yearKey].totalProjects       = yTotals.totalProjects;
      yearWiseRevenue[yearKey].totalVendorPayments = yTotals.totalVendorPayments;
      yearWiseRevenue[yearKey].totalExpenses       = yTotals.totalExpenses;
      yearWiseRevenue[yearKey].receiveCash         = yTotals.receiveCash;
      yearWiseRevenue[yearKey].receiveOnline       = yTotals.receiveOnline;
      yearWiseRevenue[yearKey].totalGST            = yTotals.totalGST;
      yearWiseRevenue[yearKey].totalVendorExp      = yTotals.totalVendorExp;
      const yGross = yearWiseRevenue[yearKey].revenue
                   - yearWiseRevenue[yearKey].totalVendorExp
                   - yearWiseRevenue[yearKey].totalGST;
      yearWiseRevenue[yearKey].totalProfit = yGross - yearWiseRevenue[yearKey].totalExpenses;

      // ── finYearWiseRevenue ────────────────────────────────────────────────
      if (!finYearWiseRevenue[finYear]) {
        finYearWiseRevenue[finYear] = {
          totalProfit: 0, revenue: 0, projectClose: 0,
          totalProjects: 0, totalVendorPayments: 0, totalExpenses: 0,
          receiveCash: 0, receiveOnline: 0, totalGST: 0, totalVendorExp: 0,
        };
      }
      finYearWiseRevenue[finYear].revenue      += rev.revenue;
      finYearWiseRevenue[finYear].projectClose += rev.projectClose;
      finYearWiseRevenue[finYear].totalProjects       = fTotals.totalProjects;
      finYearWiseRevenue[finYear].totalVendorPayments = fTotals.totalVendorPayments;
      finYearWiseRevenue[finYear].totalExpenses       = fTotals.totalExpenses;
      finYearWiseRevenue[finYear].receiveCash         = fTotals.receiveCash;
      finYearWiseRevenue[finYear].receiveOnline       = fTotals.receiveOnline;
      finYearWiseRevenue[finYear].totalGST            = fTotals.totalGST;
      finYearWiseRevenue[finYear].totalVendorExp      = fTotals.totalVendorExp;
      const fGross = finYearWiseRevenue[finYear].revenue
                   - finYearWiseRevenue[finYear].totalVendorExp
                   - finYearWiseRevenue[finYear].totalGST;
      finYearWiseRevenue[finYear].totalProfit = fGross - finYearWiseRevenue[finYear].totalExpenses;

      // ── userStoreWiseRevenue ──────────────────────────────────────────────
      if (!userStoreWiseRevenue[userStoreKey]) {
        userStoreWiseRevenue[userStoreKey] = {
          userId, store,
          totalProfit: 0, revenue: 0, projectClose: 0,
          totalVendorPayments: 0, totalExpenses: 0, totalGST: 0, totalVendorExp: 0,
        };
      }
      userStoreWiseRevenue[userStoreKey].revenue      += rev.revenue;
      userStoreWiseRevenue[userStoreKey].projectClose += rev.projectClose;
      const uGross = userStoreWiseRevenue[userStoreKey].revenue
                   - (userStoreWiseRevenue[userStoreKey].totalVendorExp || 0)
                   - (userStoreWiseRevenue[userStoreKey].totalGST       || 0);
      userStoreWiseRevenue[userStoreKey].totalProfit =
        uGross - (userStoreWiseRevenue[userStoreKey].totalExpenses || 0);

      // ── storeWiseTotals (revenue + projectClose) ──────────────────────────
      storeWiseTotals[store].revenue      += rev.revenue;
      storeWiseTotals[store].projectClose += rev.projectClose;

      // ── storeMonthlyRevenue ───────────────────────────────────────────────
      if (!storeMonthlyRevenue[store]) storeMonthlyRevenue[store] = {};
      if (!storeMonthlyRevenue[store][storeDisplayKey])
        storeMonthlyRevenue[store][storeDisplayKey] = emptyStoreMonthBucket(monthName, year);

      storeMonthlyRevenue[store][storeDisplayKey].revenue      += rev.revenue;
      storeMonthlyRevenue[store][storeDisplayKey].projectClose += rev.projectClose;
      const smGross = storeMonthlyRevenue[store][storeDisplayKey].revenue
                    - storeMonthlyRevenue[store][storeDisplayKey].totalVendorExp
                    - storeMonthlyRevenue[store][storeDisplayKey].totalGST;
      storeMonthlyRevenue[store][storeDisplayKey].totalProfit =
        smGross - storeMonthlyRevenue[store][storeDisplayKey].totalExpenses;

      // ── storeQuarterlyRevenue ─────────────────────────────────────────────
      if (!storeQuarterlyRevenue[store]) storeQuarterlyRevenue[store] = {};
      if (!storeQuarterlyRevenue[store][quarterKey]) {
        storeQuarterlyRevenue[store][quarterKey] = {
          quarter, year, totalProfit: 0, revenue: 0, projectClose: 0,
          totalProjects: mTotals.totalProjects, totalVendorPayments: mTotals.totalVendorPayments,
          totalExpenses: mTotals.totalExpenses, receiveCash: mTotals.receiveCash,
          receiveOnline: mTotals.receiveOnline, totalGST: mTotals.totalGST,
          totalVendorExp: mTotals.totalVendorExp,
        };
      }
      storeQuarterlyRevenue[store][quarterKey].revenue      += rev.revenue;
      storeQuarterlyRevenue[store][quarterKey].projectClose += rev.projectClose;
      const sqGross = storeQuarterlyRevenue[store][quarterKey].revenue
                    - storeQuarterlyRevenue[store][quarterKey].totalVendorExp
                    - storeQuarterlyRevenue[store][quarterKey].totalGST;
      storeQuarterlyRevenue[store][quarterKey].totalProfit =
        sqGross - storeQuarterlyRevenue[store][quarterKey].totalExpenses;

      // ── storeYearlyRevenue ────────────────────────────────────────────────
      if (!storeYearlyRevenue[store]) storeYearlyRevenue[store] = {};
      if (!storeYearlyRevenue[store][yearKey]) {
        storeYearlyRevenue[store][yearKey] = {
          year, totalProfit: 0, revenue: 0, projectClose: 0,
          totalProjects: yTotals.totalProjects, totalVendorPayments: yTotals.totalVendorPayments,
          totalExpenses: yTotals.totalExpenses, receiveCash: yTotals.receiveCash,
          receiveOnline: yTotals.receiveOnline, totalGST: yTotals.totalGST,
          totalVendorExp: yTotals.totalVendorExp,
        };
      }
      storeYearlyRevenue[store][yearKey].revenue      += rev.revenue;
      storeYearlyRevenue[store][yearKey].projectClose += rev.projectClose;
      const syGross = storeYearlyRevenue[store][yearKey].revenue
                    - storeYearlyRevenue[store][yearKey].totalVendorExp
                    - storeYearlyRevenue[store][yearKey].totalGST;
      storeYearlyRevenue[store][yearKey].totalProfit =
        syGross - storeYearlyRevenue[store][yearKey].totalExpenses;

      // ── storeFinYearRevenue ───────────────────────────────────────────────
      if (!storeFinYearRevenue[store]) storeFinYearRevenue[store] = {};
      if (!storeFinYearRevenue[store][finYear]) {
        storeFinYearRevenue[store][finYear] = {
          finYear, totalProfit: 0, revenue: 0, projectClose: 0,
          totalProjects: fTotals.totalProjects, totalVendorPayments: fTotals.totalVendorPayments,
          totalExpenses: fTotals.totalExpenses, receiveCash: fTotals.receiveCash,
          receiveOnline: fTotals.receiveOnline, totalGST: fTotals.totalGST,
          totalVendorExp: fTotals.totalVendorExp,
        };
      }
      storeFinYearRevenue[store][finYear].revenue      += rev.revenue;
      storeFinYearRevenue[store][finYear].projectClose += rev.projectClose;
      const sfGross = storeFinYearRevenue[store][finYear].revenue
                    - storeFinYearRevenue[store][finYear].totalVendorExp
                    - storeFinYearRevenue[store][finYear].totalGST;
      storeFinYearRevenue[store][finYear].totalProfit =
        sfGross - storeFinYearRevenue[store][finYear].totalExpenses;

      revenue += rev.revenue;
    });

    // ── Final store-wide profit calculation ───────────────────────────────────
    Object.keys(storeWiseTotals).forEach((store) => {
      const gross = storeWiseTotals[store].revenue
                  - (storeWiseTotals[store].totalVendorExp      || 0)
                  - (storeWiseTotals[store].totalGST            || 0);
      storeWiseTotals[store].totalProfit = gross - (storeWiseTotals[store].totalExpenses || 0);
    });

    // Global net profit
    const grossProfit = revenue - totalVendorExp - totalGST;
    totalProfit       = grossProfit - totalExpenses;

    // ── Build formatted storeData for the store comparison section ────────────
    const formattedStoreData = Object.keys(storeMonthlyRevenue).map((store) => {
      const storeTotals = storeWiseTotals[store] || {
        totalProjects: 0, totalVendorPayments: 0, totalExpenses: 0,
        totalProfit: 0, revenue: 0, projectClose: 0,
        receiveCash: 0, receiveOnline: 0, totalGST: 0, totalVendorExp: 0,
      };

      const monthlyData = Object.values(storeMonthlyRevenue[store]);

      // Aggregate quarters from monthly data
      const storeQuarters = new Map<string, any>();
      Object.values(storeMonthlyRevenue[store]).forEach((md: any) => {
        const mNum  = getMonthNumber(md.month);
        const yr    = Number(md.year);
        const q     = Math.ceil(mNum / 3);
        const qKey  = `Q${q}-${yr}`;
        if (!storeQuarters.has(qKey)) {
          storeQuarters.set(qKey, {
            quarter: q, year: yr, totalProfit: 0, revenue: 0, projectClose: 0,
            totalProjects: 0, totalVendorPayments: 0, totalExpenses: 0,
            receiveCash: 0, receiveOnline: 0, totalGST: 0, totalVendorExp: 0,
          });
        }
        const qd = storeQuarters.get(qKey);
        qd.revenue             += md.revenue             || 0;
        qd.projectClose        += md.projectClose        || 0;
        qd.totalProjects       += md.totalProjects       || 0;
        qd.totalVendorPayments += md.totalVendorPayments || 0;
        qd.totalExpenses       += md.totalExpenses       || 0;
        qd.receiveCash         += md.receiveCash         || 0;
        qd.receiveOnline       += md.receiveOnline       || 0;
        qd.totalGST            += md.totalGST            || 0;
        qd.totalVendorExp      += md.totalVendorExp      || 0;
        const g = qd.revenue - qd.totalVendorExp - qd.totalGST;
        qd.totalProfit = g - qd.totalExpenses;
      });

      // Aggregate years from monthly data
      const storeYears = new Map<string, any>();
      Object.values(storeMonthlyRevenue[store]).forEach((md: any) => {
        const yr   = Number(md.year);
        const yKey = `${yr}`;
        if (!storeYears.has(yKey)) {
          storeYears.set(yKey, {
            year: yr, totalProfit: 0, revenue: 0, projectClose: 0,
            totalProjects: 0, totalVendorPayments: 0, totalExpenses: 0,
            receiveCash: 0, receiveOnline: 0, totalGST: 0, totalVendorExp: 0,
          });
        }
        const yd = storeYears.get(yKey);
        yd.revenue             += md.revenue             || 0;
        yd.projectClose        += md.projectClose        || 0;
        yd.totalProjects       += md.totalProjects       || 0;
        yd.totalVendorPayments += md.totalVendorPayments || 0;
        yd.totalExpenses       += md.totalExpenses       || 0;
        yd.receiveCash         += md.receiveCash         || 0;
        yd.receiveOnline       += md.receiveOnline       || 0;
        yd.totalGST            += md.totalGST            || 0;
        yd.totalVendorExp      += md.totalVendorExp      || 0;
        const g = yd.revenue - yd.totalVendorExp - yd.totalGST;
        yd.totalProfit = g - yd.totalExpenses;
      });

      // Aggregate financial years from monthly data
      const storeFinYears = new Map<string, any>();
      Object.values(storeMonthlyRevenue[store]).forEach((md: any) => {
        const mNum  = getMonthNumber(md.month);
        const yr    = Number(md.year);
        const fy    = mNum >= 4 ? `${yr}-${yr + 1}` : `${yr - 1}-${yr}`;
        if (!storeFinYears.has(fy)) {
          storeFinYears.set(fy, {
            finYear: fy, totalProfit: 0, revenue: 0, projectClose: 0,
            totalProjects: 0, totalVendorPayments: 0, totalExpenses: 0,
            receiveCash: 0, receiveOnline: 0, totalGST: 0, totalVendorExp: 0,
          });
        }
        const fd = storeFinYears.get(fy);
        fd.revenue             += md.revenue             || 0;
        fd.projectClose        += md.projectClose        || 0;
        fd.totalProjects       += md.totalProjects       || 0;
        fd.totalVendorPayments += md.totalVendorPayments || 0;
        fd.totalExpenses       += md.totalExpenses       || 0;
        fd.receiveCash         += md.receiveCash         || 0;
        fd.receiveOnline       += md.receiveOnline       || 0;
        fd.totalGST            += md.totalGST            || 0;
        fd.totalVendorExp      += md.totalVendorExp      || 0;
        const g = fd.revenue - fd.totalVendorExp - fd.totalGST;
        fd.totalProfit = g - fd.totalExpenses;
      });

      return {
        store,
        monthly:       monthlyData,
        quarterly:     Array.from(storeQuarters.values()),
        yearly:        Array.from(storeYears.values()),
        financialYear: Array.from(storeFinYears.values()),
        ...storeTotals,
      };
    });

    // ── Response ─────────────────────────────────────────────────────────────
    return NextResponse.json(
      {
        monthWiseRevenue: Object.entries(monthWiseRevenue).map(([month, data]) => ({
          month, ...data,
        })),
        yearWiseRevenue: Object.entries(yearWiseRevenue).map(([year, data]) => ({
          year, ...data,
        })),
        finYearWiseRevenue: Object.entries(finYearWiseRevenue).map(([finYear, data]) => ({
          finYear, ...data,
        })),
        userStoreWiseRevenue: Object.values(userStoreWiseRevenue),
        storeData:            formattedStoreData,
        totalProfit,
        revenue,
        totalProjects,
        totalVendorPayments,
        totalExpenses,
        totalReceiveCash,
        totalReceiveOnline,
        totalGST,
        totalVendorExp,
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