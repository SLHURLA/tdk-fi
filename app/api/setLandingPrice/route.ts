import { db } from "@/utils/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { landingPrice, itemId, leadId } = body;

    if (!landingPrice || !itemId || !leadId) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    // Ensure item exists
    const item = await db.additionalItems.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      return NextResponse.json({ message: "Item not found" }, { status: 404 });
    }

    // Update item with landing price
    const updateData = await db.additionalItems.update({
      where: { id: itemId },
      data: { landingPrice },
    });

    // Update lead's total expenses
    await db.lead.update({
      where: { id: leadId },
      data: { totalExp: { increment: landingPrice } },
    });

    return NextResponse.json({ updateData, success: true }, { status: 200 });
  } catch (error) {
    console.error("Error updating price:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { itemId, leadId } = body;

    if (!itemId || !leadId) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    // Ensure item exists
    const item = await db.additionalItems.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      return NextResponse.json({ message: "Item not found" }, { status: 404 });
    }

    // Get the current landing price before deleting
    const landingPrice = item.landingPrice || 0;

    // Set landing price to null
    const updatedItem = await db.additionalItems.update({
      where: { id: itemId },
      data: { landingPrice: 0 },
    });

    // Only decrement if landingPrice was not null
    if (landingPrice > 0) {
      await db.lead.update({
        where: { id: leadId },
        data: { totalExp: { decrement: landingPrice } },
      });
    }

    return NextResponse.json({ updatedItem, success: true }, { status: 200 });
  } catch (error) {
    console.error("Error deleting price:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
