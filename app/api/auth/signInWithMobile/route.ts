import { db } from "@/utils/db";
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"; // Replace with env variable in production

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mobileNo, otp } = body;

    if (!mobileNo || !otp) {
      return NextResponse.json(
        { message: "Mobile number and OTP are required" },
        { status: 400 }
      );
    }

    const user = await db.user.findFirst({
      where: { mobileNo },
    });

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    if (user.otp !== otp) {
      return NextResponse.json({ message: "Invalid OTP" }, { status: 401 });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, mobileNo: user.mobileNo },
      JWT_SECRET,
      { expiresIn: "1d" }
    );

    // Clear OTP after successful login
    await db.user.update({
      where: { id: user.id },
      data: { otp: null },
    });

    return NextResponse.json(
      { message: "Login successful", token },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error during login:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
