import { db } from "@/utils/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const leads = await db.lead.findMany({
      where: { status: "CLOSED" },
      select: {
        totalGST:     true,
        totalExp:     true,
        receiveCash:  true,
        receiveOnline: true,
        store:        true,
        createdAt:    true,
      },
    });

    // Aggregate by month, year, finYear
    const monthWise: Record<string, any>  = {};
    const yearWise: Record<string, any>   = {};
    const finYearWise: Record<string, any> = {};
    const storeWise: Record<string, any>  = {};

    leads.forEach((lead) => {
      const date      = new Date(lead.createdAt);
      const month     = date.getMonth() + 1;
      const year      = date.getFullYear();
      const monthName = new Intl.DateTimeFormat("en-US", { month: "long" }).format(date);
      const monthKey  = `${monthName}-${year}`;
      const yearKey   = `${year}`;
      const finYear   = month >= 4 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
      const store     = lead.store || "Unknown";

      const gst        = Number(lead.totalGST)      || 0;
      const vendorExp  = Number(lead.totalExp)       || 0;
      const rCash      = Number(lead.receiveCash)    || 0;
      const rOnline    = Number(lead.receiveOnline)  || 0;

      // monthWise
      if (!monthWise[monthKey]) monthWise[monthKey] = { totalGST: 0, totalVendorExp: 0, receiveCash: 0, receiveOnline: 0 };
      monthWise[monthKey].totalGST      += gst;
      monthWise[monthKey].totalVendorExp += vendorExp;
      monthWise[monthKey].receiveCash   += rCash;
      monthWise[monthKey].receiveOnline += rOnline;

      // yearWise
      if (!yearWise[yearKey]) yearWise[yearKey] = { totalGST: 0, totalVendorExp: 0, receiveCash: 0, receiveOnline: 0 };
      yearWise[yearKey].totalGST      += gst;
      yearWise[yearKey].totalVendorExp += vendorExp;
      yearWise[yearKey].receiveCash   += rCash;
      yearWise[yearKey].receiveOnline += rOnline;

      // finYearWise
      if (!finYearWise[finYear]) finYearWise[finYear] = { totalGST: 0, totalVendorExp: 0, receiveCash: 0, receiveOnline: 0 };
      finYearWise[finYear].totalGST      += gst;
      finYearWise[finYear].totalVendorExp += vendorExp;
      finYearWise[finYear].receiveCash   += rCash;
      finYearWise[finYear].receiveOnline += rOnline;

      // storeWise
      if (!storeWise[store]) storeWise[store] = { totalGST: 0, totalVendorExp: 0, receiveCash: 0, receiveOnline: 0 };
      storeWise[store].totalGST      += gst;
      storeWise[store].totalVendorExp += vendorExp;
      storeWise[store].receiveCash   += rCash;
      storeWise[store].receiveOnline += rOnline;
    });

    // Grand totals
    const grandTotalGST       = leads.reduce((s, l) => s + (Number(l.totalGST)  || 0), 0);
    const grandTotalVendorExp = leads.reduce((s, l) => s + (Number(l.totalExp)   || 0), 0);
    const grandReceiveCash    = leads.reduce((s, l) => s + (Number(l.receiveCash) || 0), 0);
    const grandReceiveOnline  = leads.reduce((s, l) => s + (Number(l.receiveOnline) || 0), 0);

    return NextResponse.json({
      totalGST:       grandTotalGST,
      totalVendorExp: grandTotalVendorExp,
      totalReceiveCash:   grandReceiveCash,
      totalReceiveOnline: grandReceiveOnline,
      monthWise:  Object.entries(monthWise).map(([month, d])   => ({ month,   ...d })),
      yearWise:   Object.entries(yearWise).map(([year, d])     => ({ year,    ...d })),
      finYearWise: Object.entries(finYearWise).map(([finYear, d]) => ({ finYear, ...d })),
      storeWise:  Object.entries(storeWise).map(([store, d])   => ({ store,   ...d })),
    }, { status: 200 });

  } catch (error) {
    console.error("Error fetching GST summary:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}