import { db } from "@/utils/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const vendors = await db.vendor.findMany({
      select: {
        id: true,
        name: true,
        mobileNo: true,
        city: true,
        TotalCharge: true,
        GivenCharge: true,
        transNotes: true,
      },
    });

    console.log("vendors", vendors);
    return NextResponse.json({ vendors, message: "success" }, { status: 201 });
  } catch (error) {
    console.error("Error fetching leads:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
