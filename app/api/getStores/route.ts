import { db } from "@/utils/db";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const users = await db.user.findMany({
      where: {
        role: "STORE_MANAGER",
      },
      select: {
        id: true,
        store: true,
      },
    });

    const stores = users.map((user) => ({
      userId: user.id,
      store: user.store,
    }));

    return NextResponse.json(
      { stores, message: "Data fetched successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching stores:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
