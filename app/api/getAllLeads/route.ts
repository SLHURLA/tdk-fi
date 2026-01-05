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

    console.log(`${session?.user?.username} is fetching all leads 🧑‍💻`);

    const leads = await db.lead.findMany({
      // ADDED: Filter out leads where deletedAt is NOT null
      where: {
        deletedAt: null,
      },
      include: {
        user: true,
        _count: true,
      },
    });

    return NextResponse.json({ leads, message: "success" }, { status: 200 }); // Changed status to 200 for GET success
  } catch (error) {
    console.error("Error fetching leads:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}