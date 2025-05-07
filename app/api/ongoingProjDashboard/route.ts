import { db } from "@/utils/db";
import { startOfMonth, endOfMonth, format, getQuarter } from "date-fns";
import { NextResponse } from "next/server";

type RevenueGroup = {
  revenue: number;
  totalProfit: number;
  projectClose: number;
  totalProjects: number;
  totalVendorPayments: number;
  totalExpenses: number;
  cash: number;
  online: number;
  receiveCash: number;
  receiveOnline: number;
  payInCash: number;
  payInOnline: number;
};

type UserStoreRevenue = {
  userId: number;
  store: string;
  totalProfit: number;
  revenue: number;
  projectClose: number;
  cash: number;
  online: number;
  receiveCash: number;
  receiveOnline: number;
  payInCash: number;
  payInOnline: number;
};

type StoreData = {
  store: string;
  monthly: Record<string, RevenueGroup>;
  quarterly: Record<string, RevenueGroup>;
  yearly: Record<string, RevenueGroup>;
  financialYear: Record<string, RevenueGroup>;
  totalProjects: number;
  totalVendorPayments: number;
  totalExpenses: number;
  receiveCash: number;
  receiveOnline: number;
  payInCash: number;
  payInOnline: number;
};

type GroupedData = {
  monthWiseRevenue: Record<string, RevenueGroup>;
  yearWiseRevenue: Record<string, RevenueGroup>;
  finYearWiseRevenue: Record<string, RevenueGroup>;
  userStoreWiseRevenue: Record<string, UserStoreRevenue>;
  storeData: Record<string, StoreData>;
  totalProfit: number;
  totalRevenue: number;
  totalProjects: number;
  totalVendorPayments: number;
  totalExpenses: number;
  totalProjectClose: number;
  receiveCash: number;
  receiveOnline: number;
  payInCash: number;
  payInOnline: number;
};

export async function GET() {
  try {
    // OPTIMIZATION 1: Fetch store manager users first to get their IDs and stores
    const storeManagers = await db.user.findMany({
      where: { role: "STORE_MANAGER" },
      select: { id: true, store: true },
    });

    const storeManagerIds = storeManagers.map((manager) => manager.id);
    const userStoreMap = new Map(
      storeManagers.map((user) => [user.id, user.store])
    );

    // OPTIMIZATION 2: Use single efficient query with proper filters
    const leads = await db.lead.findMany({
      where: {
        userId: { in: storeManagerIds },
        user: {
          role: "STORE_MANAGER",
        },
        status: "INPROGRESS",
      },
      include: {
        transactions: true,
        vendors: {
          include: {
            transNotes: true,
          },
        },
      },
    });

    // OPTIMIZATION 3: Fetch all expenses in a single query
    const storeExpenses = await db.storeExpNotes.findMany({
      where: {
        userId: { in: storeManagerIds },
      },
    });

    const groupedData: GroupedData = {
      monthWiseRevenue: {},
      yearWiseRevenue: {},
      finYearWiseRevenue: {},
      userStoreWiseRevenue: {},
      storeData: {},
      totalProfit: 0,
      totalRevenue: 0,
      totalProjects: leads.length,
      totalVendorPayments: 0,
      totalExpenses: 0,
      totalProjectClose: 0,
      receiveCash: 0,
      receiveOnline: 0,
      payInCash: 0,
      payInOnline: 0,
    };

    // OPTIMIZATION 4: Create a reusable function for updating data groups
    const updateGroup = (
      group: Record<string, RevenueGroup>,
      key: string,
      values: {
        revenue: number;
        profit: number;
        cash: number;
        online: number;
        receiveCash: number;
        receiveOnline: number;
        payInCash: number;
        payInOnline: number;
        vendorPayments: number;
        expenses: number;
        isProjectClosed: boolean;
      }
    ) => {
      if (!group[key]) {
        group[key] = {
          revenue: 0,
          totalProfit: 0,
          projectClose: 0,
          totalProjects: 0,
          totalVendorPayments: 0,
          totalExpenses: 0,
          cash: 0,
          online: 0,
          receiveCash: 0,
          receiveOnline: 0,
          payInCash: 0,
          payInOnline: 0,
        };
      }

      group[key].revenue += values.revenue;
      group[key].totalProfit += values.profit;
      group[key].projectClose += values.isProjectClosed ? 1 : 0;
      group[key].totalProjects += 1;
      group[key].cash += values.cash;
      group[key].online += values.online;
      group[key].receiveCash += values.receiveCash;
      group[key].receiveOnline += values.receiveOnline;
      group[key].payInCash += values.payInCash;
      group[key].payInOnline += values.payInOnline;
      group[key].totalVendorPayments += values.vendorPayments;
      group[key].totalExpenses += values.expenses;
    };

    // Process leads data
    for (const lead of leads) {
      const {
        createdAt,
        totalProjectCost,
        additionalItemsCost,
        totalGST,
        userId,
        payInCash,
        payInOnline,
        receiveCash,
        receiveOnline,
        totalExp,
        status,
        vendors,
      } = lead;

      // OPTIMIZATION 5: Get store from pre-loaded map instead of database query
      const store = userStoreMap.get(userId) || "";
      if (!store) continue; // Skip if store not found

      // Calculate vendor payments
      const vendorPayments = vendors.reduce(
        (sum, vendor) => sum + vendor.GivenCharge,
        0
      );

      // Calculate revenue and profit
      const revenue = totalProjectCost;
      const profit = revenue - totalExp - vendorPayments;

      // Cash and online combined values
      const cash = receiveCash + payInCash;
      const online = receiveOnline + payInOnline;
      const isProjectClosed = status === "CLOSED";

      // OPTIMIZATION 6: Pre-calculate all keys at once to avoid redundant date operations
      const date = new Date(createdAt);
      const yearKey = format(date, "yyyy");
      const monthName = format(date, "MMMM");
      const monthYearKey = `${monthName}-${yearKey}`;
      const finYearKey = getFinYear(date);
      const quarter = getQuarter(date);
      const quarterKey = `Q${quarter}-${yearKey}`;

      // Common values object to avoid redundancy
      const values = {
        revenue,
        profit,
        cash,
        online,
        receiveCash,
        receiveOnline,
        payInCash,
        payInOnline,
        vendorPayments,
        expenses: 0,
        isProjectClosed,
      };

      // Update monthly, yearly, and financial year data
      updateGroup(groupedData.monthWiseRevenue, monthYearKey, values);
      updateGroup(groupedData.yearWiseRevenue, yearKey, values);
      updateGroup(groupedData.finYearWiseRevenue, finYearKey, values);

      // Update user store revenue
      const userStoreKey = `${userId}-${store}`;
      if (!groupedData.userStoreWiseRevenue[userStoreKey]) {
        groupedData.userStoreWiseRevenue[userStoreKey] = {
          userId,
          store,
          totalProfit: 0,
          revenue: 0,
          projectClose: 0,
          cash: 0,
          online: 0,
          receiveCash: 0,
          receiveOnline: 0,
          payInCash: 0,
          payInOnline: 0,
        };
      }

      const usrStore = groupedData.userStoreWiseRevenue[userStoreKey];
      usrStore.revenue += revenue;
      usrStore.totalProfit += profit;
      usrStore.projectClose += isProjectClosed ? 1 : 0;
      usrStore.cash += cash;
      usrStore.online += online;
      usrStore.receiveCash += receiveCash;
      usrStore.receiveOnline += receiveOnline;
      usrStore.payInCash += payInCash;
      usrStore.payInOnline += payInOnline;

      // Initialize store data if not exists
      if (!groupedData.storeData[store]) {
        groupedData.storeData[store] = {
          store,
          monthly: {},
          quarterly: {},
          yearly: {},
          financialYear: {},
          totalProjects: 0,
          totalVendorPayments: 0,
          totalExpenses: 0,
          receiveCash: 0,
          receiveOnline: 0,
          payInCash: 0,
          payInOnline: 0,
        };
      }

      // Update store-specific data
      const storeRef = groupedData.storeData[store];
      storeRef.totalProjects += 1;
      storeRef.totalVendorPayments += vendorPayments;
      storeRef.receiveCash += receiveCash;
      storeRef.receiveOnline += receiveOnline;
      storeRef.payInCash += payInCash;
      storeRef.payInOnline += payInOnline;

      // Update store monthly, quarterly, yearly and financial year data
      updateGroup(storeRef.monthly, `${monthName}-${yearKey}`, values);
      updateGroup(storeRef.quarterly, quarterKey, values);
      updateGroup(storeRef.yearly, yearKey, values);
      updateGroup(storeRef.financialYear, finYearKey, values);

      // Update totals
      groupedData.totalProfit += profit;
      groupedData.totalRevenue += revenue;
      groupedData.totalVendorPayments += vendorPayments;
      groupedData.receiveCash += receiveCash;
      groupedData.receiveOnline += receiveOnline;
      groupedData.payInCash += payInCash;
      groupedData.payInOnline += payInOnline;

      if (isProjectClosed) {
        groupedData.totalProjectClose += 1;
      }
    }

    // OPTIMIZATION 7: Use userStoreMap for expenses processing instead of queries
    for (const expense of storeExpenses) {
      const { amount, transactionDate, userId } = expense;
      const store = userStoreMap.get(userId);

      if (!store) continue;

      // Get keys for data grouping
      const date = new Date(transactionDate);
      const yearKey = format(date, "yyyy");
      const monthName = format(date, "MMMM");
      const monthYearKey = `${monthName}-${yearKey}`;
      const finYearKey = getFinYear(date);
      const quarter = getQuarter(date);
      const quarterKey = `Q${quarter}-${yearKey}`;

      // Update total expenses
      groupedData.totalExpenses += amount;

      // Update expenses in monthly, yearly, and financial year data
      if (groupedData.monthWiseRevenue[monthYearKey]) {
        groupedData.monthWiseRevenue[monthYearKey].totalExpenses += amount;
      }

      if (groupedData.yearWiseRevenue[yearKey]) {
        groupedData.yearWiseRevenue[yearKey].totalExpenses += amount;
      }

      if (groupedData.finYearWiseRevenue[finYearKey]) {
        groupedData.finYearWiseRevenue[finYearKey].totalExpenses += amount;
      }

      // Update store expenses
      if (groupedData.storeData[store]) {
        const storeRef = groupedData.storeData[store];
        storeRef.totalExpenses += amount;

        // Update store monthly, quarterly, yearly and financial year expenses
        if (storeRef.monthly[`${monthName}-${yearKey}`]) {
          storeRef.monthly[`${monthName}-${yearKey}`].totalExpenses += amount;
        }

        if (storeRef.quarterly[quarterKey]) {
          storeRef.quarterly[quarterKey].totalExpenses += amount;
        }

        if (storeRef.yearly[yearKey]) {
          storeRef.yearly[yearKey].totalExpenses += amount;
        }

        if (storeRef.financialYear[finYearKey]) {
          storeRef.financialYear[finYearKey].totalExpenses += amount;
        }
      }
    }

    // OPTIMIZATION 8: Use a more efficient approach for converting objects to arrays
    return NextResponse.json({
      monthWiseRevenue: mapToArray(groupedData.monthWiseRevenue, "monthYear"),
      yearWiseRevenue: mapToArray(groupedData.yearWiseRevenue, "year"),
      finYearWiseRevenue: mapToArray(groupedData.finYearWiseRevenue, "finYear"),
      userStoreWiseRevenue: Object.values(groupedData.userStoreWiseRevenue),
      storeData: Object.values(groupedData.storeData).map((store) => ({
        ...store,
        monthly: mapToArray(store.monthly, "month"),
        quarterly: mapToArray(store.quarterly, "quarter"),
        yearly: mapToArray(store.yearly, "year"),
        financialYear: mapToArray(store.financialYear, "finYear"),
      })),
      totalProfit: groupedData.totalProfit,
      totalRevenue: groupedData.totalRevenue,
      totalProjects: groupedData.totalProjects,
      totalVendorPayments: groupedData.totalVendorPayments,
      totalExpenses: groupedData.totalExpenses,
      totalProjectClose: groupedData.totalProjectClose,
      receiveCash: groupedData.receiveCash,
      receiveOnline: groupedData.receiveOnline,
      payInCash: groupedData.payInCash,
      payInOnline: groupedData.payInOnline,
      message: "Revenue data fetched successfully",
    });
  } catch (error) {
    console.error("Error fetching revenue data:", error);
    return NextResponse.json(
      { error: "Failed to fetch revenue data", details: error },
      { status: 500 }
    );
  }
}

// Helper function to get financial year
function getFinYear(date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth();
  return month < 3 ? `${year - 1}-${year}` : `${year}-${year + 1}`;
}

// Helper function to convert record objects to arrays with named keys
function mapToArray<T>(
  mapObj: Record<string, T>,
  keyName: string
): Array<T & { [key: string]: string }> {
  return Object.entries(mapObj).map(([key, value]) => ({
    [keyName]: key,
    ...value,
  }));
}
