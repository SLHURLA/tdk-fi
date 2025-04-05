import { db } from "@/utils/db";
import { NextRequest, NextResponse } from "next/server";

// route for read the notification
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ notiId: string }> }
) {
  console.log("SET NOTIFICATION");
  try {
    const noti = await db.notification.findUnique({
      where: {
        notiId: parseInt((await params).notiId),
      },
    });

    if (!noti) {
      return NextResponse.json(
        { message: "notification not found" },
        { status: 401 }
      );
    }

    const updateNoti = await db.notification.update({
      where: {
        notiId: parseInt((await params).notiId),
      },
      data: {
        read: true,
      },
    });

    return NextResponse.json(
      { updateNoti, message: "notification updated successfully" },
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
