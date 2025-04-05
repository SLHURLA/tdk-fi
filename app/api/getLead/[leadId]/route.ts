import { db } from "@/utils/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ leadId: string }> }
) {
  try {
    const lead = await db.lead.findFirst({
      where: {
        lead_id: (await params).leadId,
      },
    });
    const data = await db.lead.findFirst({
      where: {
        lead_id: (await params).leadId,
      },
      include: {
        additionalItems: true,
        ProvidedItems: true,
        transactions: true,
        user: true,
        vendors: {
          include: {
            transNotes: true,
            vendorsBreakdown: {
              where: {
                leadId: lead?.id,
              },
            },
          },
        },
      },
    });

    if (!data) {
      return NextResponse.json(
        {
          message: "Wrong lead id",
        },
        { status: 401 }
      );
    }
    return NextResponse.json(
      {
        data,
        message: "Lead Fetched Successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching leads:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
