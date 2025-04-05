import { db } from "@/utils/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ leadId: string }> }
) {
  try {
    const { leadId } = await params;

    // Check if the lead exists
    const lead = await db.lead.findFirst({
      where: { lead_id: leadId },
      include: { transactions: true },
    });

    if (!lead) {
      console.error("Lead does not exist");
      return NextResponse.json(
        { success: false, transactions: [], message: "Lead does not exist" },
        { status: 404 }
      );
    }

    // Retrieve revenue details for the lead
    const notes = await db.transactionNote.findMany({
      where: { leadId: lead.id },
    });

    return NextResponse.json({ success: true, notes });
  } catch (error) {
    console.error("Error initializing lead:", error);
    return NextResponse.json(
      { success: false, error: "Failed to initialize lead" },
      { status: 500 }
    );
  }
}
