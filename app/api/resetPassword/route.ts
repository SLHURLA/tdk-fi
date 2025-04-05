import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/utils/db";

export async function POST(request: NextRequest) {
  const { id } = await request.json();
  try {
    const session = await getServerSession(authOptions);
    if (session?.user.role !== "ADMIN") {
      return NextResponse.json(
        { message: "You are not able to reset the password" },
        { status: 401 }
      );
    }

    const user = await db.user.findUnique({
      where: {
        id,
      },
    });
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 402 });
    }

    const updUser = await db.user.update({
      where: {
        id,
      },
      data: {
        passwordHash: "1234",
      },
    });
    return NextResponse.json(
      { updUser, message: "password updated successfully" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error fetching leads:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
