import { db } from "@/utils/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  //   const body = await request.json();
  const { leadId, area, brand, remark, model, gst, payInCash, payInOnline } =
    await request.json();
  console.log(leadId, area, brand, remark);
  try {
    const upd = await db.lead.update({
      where: {
        id: Number(leadId),
      },
      data: {
        ProvidedItems: {
          create: {
            area,
            brand,
            model,
            remark,
            payInCash,
            payInOnline,
            gst,
          },
        },
      },
    });

    const lead = await db.lead.findFirst({
      where: {
        id: Number(leadId),
      },
      include: {
        ProvidedItems: true,
      },
    });

    const updateData = await db.lead.update({
      where: {
        id: Number(leadId),
      },
      data: {
        totalProjectCost: {
          increment: payInCash + payInOnline,
        },
        totalGST: {
          increment: gst,
        },
        payInCash: { increment: payInCash },
        payInOnline: { increment: payInOnline },
      },
    });

    const newItem = lead?.ProvidedItems?.[lead.ProvidedItems.length - 1]; // Get the last added item
    return NextResponse.json({ success: true, newItem, updateData });
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { success: false, error: "Failed to initialize lead" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const {
    leadId,
    itemId,
    area,
    brand,
    remark,
    model,
    gst,
    payInCash,
    payInOnline,
  } = await request.json();
  try {
    // Fetch the existing item details
    const oldItem = await db.providedItems.findFirst({
      where: {
        id: Number(itemId),
        leadId: Number(leadId),
      },
    });

    if (!oldItem) {
      return NextResponse.json(
        { success: false, error: "Item not found" },
        { status: 404 }
      );
    }

    // Calculate the difference between new and old values
    const cashDifference = payInCash - oldItem.payInCash;
    const onlineDifference = payInOnline - oldItem.payInOnline;
    const gstDifference = gst - oldItem.gst;

    // Update the Provided Item
    const updatedItem = await db.providedItems.update({
      where: { id: Number(itemId) },
      data: {
        area,
        brand,
        model,
        remark,
        payInCash,
        payInOnline,
        gst,
      },
    });

    // Update the lead with correct increments/decrements
    const updatedLead = await db.lead.update({
      where: { id: Number(leadId) },
      data: {
        totalProjectCost: { increment: cashDifference + onlineDifference },
        totalGST: { increment: gstDifference },
        payInCash: { increment: cashDifference },
        payInOnline: { increment: onlineDifference },
      },
    });

    return NextResponse.json({ success: true, updatedItem, updatedLead });
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { success: false, error: "Failed to update lead" },
      { status: 500 }
    );
  }
}
