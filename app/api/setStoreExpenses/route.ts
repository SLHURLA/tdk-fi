import { db } from "@/utils/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { userId, amount, transactionName, paymentMethod, date, remark } = body;
  console.log(body);
  try {
    //check item present
    const item = await db.storeExpNotes.create({
      data: {
        amount,
        transactionName,
        userId,
        paymentMethod,
        date,
        transactionDate: date,
        remark,
      },
    });

    // less with the that month profit
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
    console.log("adding rev");
    //check rev of that month is present or not
    const rev = await db.revenue.findFirst({
      where: {
        userId,
        month,
        year,
      },
    });
    if (!rev) {
      const newRev = await db.revenue.create({
        data: {
          userId,
          month,
          year,
          totalProfit: -amount,
          projectClose: 0,
          revenue: 0,
        },
      });

      return NextResponse.json(
        { newRev, message: "revenue create successfully" },
        { status: 201 }
      );
    }

    const updRev = await db.revenue.update({
      where: {
        id: rev.id,
      },
      data: {
        totalProfit: {
          decrement: amount,
        },
      },
    });
    return NextResponse.json({ item, updRev, success: true }, { status: 201 });
  } catch (error: any) {
    console.error("Error fetching leads:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
