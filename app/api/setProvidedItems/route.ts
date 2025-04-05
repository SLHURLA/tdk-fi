import { db } from "@/utils/db";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(request: NextRequest) {
  const body = await request.json();
  const { itemId, leadId } = body;
  console.log(itemId, "deleting this ");
  try {
    const items = await db.providedItems.findUnique({
      where: {
        id: itemId,
      },
    });

    if (!items) {
      return NextResponse.json(
        { message: "No Item Found with this id" },
        { status: 401 }
      );
    }

    const lead = await db.lead.findUnique({
      where: {
        id: leadId,
      },
    });

    if (!lead) {
      return NextResponse.json(
        { message: "No lead Found with this id" },
        { status: 401 }
      );
    }

    const updLead = await db.lead.update({
      where: {
        id: leadId,
      },
      data: {
        totalProjectCost: {
          decrement: items.payInCash + items.payInOnline,
        },
        totalGST: {
          decrement: items.gst,
        },
        payInCash: { decrement: items.payInCash },
        payInOnline: { decrement: items.payInOnline },
      },
    });
    const deleteData = await db.providedItems.delete({
      where: {
        id: itemId,
      },
    });
    return NextResponse.json(
      { deleteData, updLead, success: true },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error fetching leads:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
