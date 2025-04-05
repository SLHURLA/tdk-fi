import { db } from "@/utils/db";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId: userIdString } = await params;
  const userId = Number.parseInt(userIdString, 10);

  if (isNaN(userId)) {
    return NextResponse.json({ message: "Invalid user ID" }, { status: 400 });
  }

  try {
    const data = await db.lead.findMany({
      where: {
        userId: userId,
      },
      include: {
        user: true,
        _count: true,
      },
    });
    return NextResponse.json(
      {
        data,
        message: "Leads Fetched Successfully",
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
