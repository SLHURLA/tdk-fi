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
    // Get all leads with related data
    const leads = await db.lead.findMany({
      where: {
        user: {
          role: "STORE_MANAGER",
        },
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

    // Get all store expenses
    const storeExpenses = await db.storeExpNotes.findMany();

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

    // Process leads data
    for (const lead of leads) {
      const {
        createdAt,
        totalProjectCost,
        additionalItemsCost,
        totalGST,
        store,
        userId,
        payInCash,
        payInOnline,
        receiveCash,
        receiveOnline,
        totalExp,
        status,
        vendors,
      } = lead;

      // Calculate vendor payments
      const vendorPayments = vendors.reduce((sum, vendor) => sum + vendor.GivenCharge, 0);
      
      // Calculate revenue and profit
      const revenue = totalProjectCost + additionalItemsCost + totalGST;
      const profit = revenue - totalExp - vendorPayments;

      // Cash and online combined values (kept for backward compatibility)
      const cash = receiveCash + payInCash;
      const online = receiveOnline + payInOnline;

      // Keys for grouping data
      const monthYearKey = format(createdAt, "MMMM-yyyy");
      const yearKey = format(createdAt, "yyyy");
      const finYearKey = getFinYear(createdAt);
      const quarter = getQuarter(createdAt);

      // Update group function with enhanced metrics
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
        group[key].projectClose += status === "CLOSED" ? 1 : 0;
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

      // Update monthly, yearly, and financial year data
      updateGroup(groupedData.monthWiseRevenue, monthYearKey, {
        revenue,
        profit,
        cash,
        online,
        receiveCash,
        receiveOnline,
        payInCash,
        payInOnline,
        vendorPayments,
        expenses: 0, // Will add expenses separately
      });

      updateGroup(groupedData.yearWiseRevenue, yearKey, {
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
      });

      updateGroup(groupedData.finYearWiseRevenue, finYearKey, {
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
      });

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
      usrStore.projectClose += status === "CLOSED" ? 1 : 0;
      usrStore.cash += cash;
      usrStore.online += online;
      usrStore.receiveCash += receiveCash;
      usrStore.receiveOnline += receiveOnline;
      usrStore.payInCash += payInCash;
      usrStore.payInOnline += payInOnline;

      // Update store-specific data
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

      const storeRef = groupedData.storeData[store];
      storeRef.totalProjects += 1;
      storeRef.totalVendorPayments += vendorPayments;
      storeRef.receiveCash += receiveCash;
      storeRef.receiveOnline += receiveOnline;
      storeRef.payInCash += payInCash;
      storeRef.payInOnline += payInOnline;

      // Update store monthly, quarterly, yearly and financial year data
      updateGroup(storeRef.monthly, `${format(createdAt, "MMMM")}-${yearKey}`, {
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
      });

      updateGroup(storeRef.quarterly, `Q${quarter}-${yearKey}`, {
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
      });

      updateGroup(storeRef.yearly, yearKey, {
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
      });

      updateGroup(storeRef.financialYear, finYearKey, {
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
      });

      // Update totals
      groupedData.totalProfit += profit;
      groupedData.totalRevenue += revenue;
      groupedData.totalVendorPayments += vendorPayments;
      groupedData.receiveCash += receiveCash;
      groupedData.receiveOnline += receiveOnline;
      groupedData.payInCash += payInCash;
      groupedData.payInOnline += payInOnline;
      
      if (status === "CLOSED") {
        groupedData.totalProjectClose += 1;
      }
    }

    // Process store expenses
    for (const expense of storeExpenses) {
      const { amount, transactionDate, userId } = expense;
      const store = await getUserStore(userId);
      
      if (!store) continue;
      
      // Get keys for data grouping
      const monthYearKey = format(transactionDate, "MMMM-yyyy");
      const yearKey = format(transactionDate, "yyyy");
      const finYearKey = getFinYear(transactionDate);
      const quarter = getQuarter(transactionDate);
      
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
        if (storeRef.monthly[`${format(transactionDate, "MMMM")}-${yearKey}`]) {
          storeRef.monthly[`${format(transactionDate, "MMMM")}-${yearKey}`].totalExpenses += amount;
        }
        
        if (storeRef.quarterly[`Q${quarter}-${yearKey}`]) {
          storeRef.quarterly[`Q${quarter}-${yearKey}`].totalExpenses += amount;
        }
        
        if (storeRef.yearly[yearKey]) {
          storeRef.yearly[yearKey].totalExpenses += amount;
        }
        
        if (storeRef.financialYear[finYearKey]) {
          storeRef.financialYear[finYearKey].totalExpenses += amount;
        }
      }
      
      // Update user store expenses
      const userStoreKeys = Object.keys(groupedData.userStoreWiseRevenue).filter(key => key.endsWith(`-${store}`));
      for (const userStoreKey of userStoreKeys) {
        // We don't track expenses at user level in the sample data, so this is a placeholder
        // If needed, we could add a totalExpenses field to UserStoreRevenue type and update it here
      }
    }

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

// Helper function to get a user's store
async function getUserStore(userId: number): Promise<string | null> {
  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { store: true },
    });
    
    return user?.store || null;
  } catch (error) {
    console.error("Error getting user store:", error);
    return null;
  }
}