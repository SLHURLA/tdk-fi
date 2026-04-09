import { db } from "@/utils/db";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { leadId, customerName } = await req.json();

    if (!customerName || !customerName.trim()) {
      return NextResponse.json(
        { message: "Invalid name" },
        { status: 400 }
      );
    }

    await db.lead.update({
      where: {
        id: Number(leadId),
      },
      data: {
        customerName,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Customer update error:", error);
    return NextResponse.json(
      { message: "Update failed" },
      { status: 500 }
    );
  }
}