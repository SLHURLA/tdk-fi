import { db } from "@/utils/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { userId, totalProjectCost, totalCashIn, totalExp } = body;

  //find month year
  const today = new Date();

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

  const month = monthNames[today.getMonth()];
  const year = today.getFullYear().toString();

  try {
    //check rev of that month is present or not
    const rev = await db.revenue.findFirst({
      where: {
        userId,
        month,
        year,
      },
    });

    //if not present - then create the new one
    //calculate the profit,revenue and increase the project count
    const newProfit = totalCashIn - totalExp;
    const revenue = totalProjectCost;
    if (!rev) {
      const newRev = await db.revenue.create({
        data: {
          userId,
          month,
          year,
          totalProfit: newProfit,
          projectClose: 1,
          revenue,
        },
      });

      return NextResponse.json(
        { newRev, message: "revenue create successfully" },
        { status: 201 }
      );
    }
    //if present - update that one with the new count and profit
    const updRev = await db.revenue.update({
      where: {
        id: rev.id,
      },
      data: {
        projectClose: {
          increment: 1,
        },
        revenue: {
          increment: revenue,
        },
        totalProfit: {
          increment: newProfit,
        },
      },
    });
    return NextResponse.json(
      { updRev, message: "revenue create successfully" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error fetching leads:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
