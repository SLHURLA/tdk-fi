import { db } from "@/utils/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  // Extract userId from query parameters
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json(
      { message: "User ID is required" },
      { status: 400 }
    );
  }

  console.log("GET STORE EXPENSES for userId:", userId);

  try {
    // Check if item exists
    const item = await db.storeExpNotes.findMany({
      where: {
        userId: Number(userId),
      },
    });

    if (!item) {
      return NextResponse.json(
        { message: "No expenses found" },
        { status: 404 }
      );
    }

    console.log("item", item);

    return NextResponse.json({ item, success: true }, { status: 200 });
  } catch (error: any) {
    console.error("Error fetching expenses:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
