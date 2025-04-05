import { db } from "@/utils/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  
  try {
    const user = await db.user.findUnique({
      where: {
        id: parseInt((await params).userId), // ✅ Fix: No need to await params
      },
    });

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 401 });
    }

    const notification = await db.notification.findMany({
      where: {
        userId: user.empNo,
      },
    });

    return NextResponse.json(
      { notification, message: "Notification fetched successfully" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error in fetching notification:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
