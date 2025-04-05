import { db } from "@/utils/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ vendorId: string }> }
) {
  try {
    const vendorId = await parseInt((await params).vendorId, 10);

    if (isNaN(vendorId) || vendorId <= 0) {
      return NextResponse.json(
        { message: "Invalid vendor ID" },
        { status: 400 }
      );
    }

    const vendor = await db.vendor.findUnique({
      where: { id: vendorId },
      include: {
        leads: {
          include: {
            transactions: {
              where: {
                vendorId: vendorId,
              },
            },
          },
        },
      },
    });

    const breakDown = await db.vendorBreakdown.findMany({
      where: {
        vendorId: vendorId,
      },
    });

    if (!vendor) {
      return NextResponse.json(
        { message: "Vendor not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { vendor, breakDown, message: "Vendor found" },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error fetching vendor:", error?.message || error);

    return NextResponse.json(
      {
        message: "Internal server error",
        error: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
