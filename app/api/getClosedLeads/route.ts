import { authOptions } from "@/lib/auth";
import { db } from "@/utils/db";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    console.log(`${session?.user?.username} is fetching closed leads ✅`);

    const leads = await db.lead.findMany({
      where: {
        // Change this key to match your schema's "closed" logic
        // If you use a status string: status: "CLOSED" 
        // If you use a boolean: isClosed: true
        status: "CLOSED", 
      },
      orderBy: {
        updatedAt: "desc", // Shows the most recently closed leads first
      },
    });

    return NextResponse.json({ leads, message: "success" }, { status: 200 });
    
  } catch (error) {
    console.error("Error fetching closed leads:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}