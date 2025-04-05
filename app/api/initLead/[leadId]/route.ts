import { db } from "@/utils/db";
import { NextRequest, NextResponse } from "next/server";

type Params = {
  params: {
    leadId: string;
  };
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ leadId: string }> }
) {
  try {
    const { leadId } = await params;
    const {
      status,
      userId,
      expectedHandoverDate,
      additionalItems = {},
      providedItems = {},
    } = await request.json();
    console.log("additionalItems")
    console.log([status, userId, expectedHandoverDate]);

    // ✅ Check if lead exists
    let lead = await db.lead.findFirst({
      where: { lead_id: leadId },
    });

    if (!lead) {
      return NextResponse.json(
        { success: false, error: "Lead not found" },
        { status: 404 }
      );
    }

    if (lead.init) {
      return NextResponse.json(
        { success: false, error: "Lead is already initialized" },
        { status: 400 }
      );
    }

    console.log(
      "ADDITIONAL ITEMS AND PROVIDED ITEMS",
      additionalItems,
      providedItems
    );

    // ✅ Ensure additionalItems and providedItems are arrays
    const additionalItemsArray = Array.isArray(additionalItems)
      ? additionalItems
      : [];
    const providedItemsArray = Array.isArray(providedItems)
      ? providedItems
      : [];

    // ✅ Compute additionalItemsCost
    const additionalItemsCost = additionalItemsArray.reduce(
      (sum: number, item: any) => sum + (item.custPrice || 0),
      0
    );

    // ✅ Compute totalProjectCost
    const providedItemsCost = providedItemsArray.reduce(
      (sum: number, item: any) =>
        sum + (item.payInCash || 0) + (item.payInOnline || 0),
      0
    );

    const totalProjectCost = providedItemsCost + additionalItemsCost;

    // ✅ Compute totalGST
    const totalGST =
      providedItemsArray.reduce(
        (sum: number, item: any) => sum + (item.gst || 0),
        0
      ) +
      additionalItemsArray.reduce(
        (sum: number, item: any) => sum + (item.gst || 0),
        0
      );

    console.log({ totalProjectCost, totalGST, additionalItemsCost });

    // ✅ Update lead
    lead = await db.lead.update({
      where: { id: lead.id },
      data: {
        status,
        userId,
        totalProjectCost,
        payInCash: providedItemsArray.reduce(
          (sum: number, item: any) => sum + (item.payInCash || 0),
          0
        ),
        payInOnline: providedItemsArray.reduce(
          (sum: number, item: any) => sum + (item.payInOnline || 0),
          0
        ),
        expectedHandoverDate,
        totalGST,
        init: true,
        additionalItems: {
          create: additionalItemsArray.map((item: any) => ({
            category: item.category,
            prodName: item.prodName,
            custPrice: item.custPrice,
            model: item.model,
            make: item.make,
            gst: item.gst,
          })),
        },
        additionalItemsCost,
        ProvidedItems: {
          create: providedItemsArray.map((item: any) => ({
            area: item.area,
            brand: item.brand,
            model: item.model,
            remark: item.remark,
            payInCash: item.payInCash,
            payInOnline: item.payInOnline,
            gst: item.gst,
          })),
        },
      },
      include: {
        additionalItems: true,
        ProvidedItems: true,
      },
    });

    console.log("INIT LEAD", lead);

    return NextResponse.json({ success: true, lead });
  } catch (error) {
    console.error("Error initializing lead:", error);
    return NextResponse.json(
      { success: false, error: "Failed to initialize lead" },
      { status: 500 }
    );
  }
}
