import { db } from "@/utils/db";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { leadId, expectedHandoverDate } = await req.json();

    await db.lead.update({
      where: {
        id: Number(leadId), // ✅ USE THIS
      },
      data: {
        expectedHandoverDate: new Date(expectedHandoverDate),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { success: false, message: "Update failed" },
      { status: 500 },
    );
  }
}
