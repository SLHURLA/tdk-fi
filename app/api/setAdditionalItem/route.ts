import { db } from "@/utils/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { leadId, category, custPrice, prodName, make, model, gst } =
    await request.json();
  console.log(leadId, category, custPrice, prodName, make, model, gst);
  try {
    const upd = await db.lead.update({
      where: {
        id: Number(leadId),
      },
      data: {
        additionalItems: {
          create: {
            category,
            custPrice,
            prodName,
            make,
            model,
            gst,
          },
        },
        totalProjectCost: {
          increment: custPrice,
        },
        additionalItemsCost: {
          increment: custPrice,
        },
        totalGST: {
          increment: gst,
        },
      },
    });

    const lead = await db.lead.findFirst({
      where: {
        id: Number(leadId),
      },
      include: {
        additionalItems: true,
      },
    });

    return NextResponse.json({
      success: true,
      additionalItems: lead?.additionalItems,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to initialize lead" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const { leadId, id } = await request.json();
  console.log(leadId, id);
  try {
    const del = await db.additionalItems.delete({
      where: {
        id: id,
      },
    });

    const updLead = await db.lead.update({
      where: {
        id: Number(leadId),
      },
      data: {
        additionalItemsCost: {
          decrement: del.custPrice,
        },
        totalProjectCost: {
          decrement: del.custPrice,
        },
        totalGST: {
          decrement: del.gst,
        },
      },
    });
    return NextResponse.json({ success: true, del, updLead });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to initialize lead" },
      { status: 500 }
    );
  }
}
