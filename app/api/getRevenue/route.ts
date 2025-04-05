import { db } from "@/utils/db";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const revenue = await db.revenue.findMany({
      include: {
        User: true,
      },
    });

    return NextResponse.json(
      { revenue, message: "data fetched successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching stores:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
