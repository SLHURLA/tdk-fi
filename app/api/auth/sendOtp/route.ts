import { db } from "@/utils/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mobileNo } = body;
    
    if (!mobileNo) {
      return NextResponse.json(
        { message: "Mobile number is required" },
        { status: 400 }
      );
    }

    const user = await db.user.findFirst({
      where: { mobileNo },
    });

    console.log("Send Otp", user);

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Save OTP in the database
    await db.user.update({
      where: { id: user.id },
      data: { otp: "123456" },
    });

    return NextResponse.json(
      { message: "OTP sent successfully", otp },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error generating OTP:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
