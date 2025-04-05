import { db } from "@/utils/db";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const userSchema = z.object({
  name: z.string().min(1, "name is required").max(100),
  address: z.string().min(1, "address is required").max(1000),
  mobileNo: z
    .string()
    .regex(/^\d{10}$/, "Contact must contain exactly 10 digits"),
  city: z.string().min(1, "city is required").max(100),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, mobileNo, address, city } = userSchema.parse(body);

    const newVendor = await db.vendor.create({
      data: { name, mobileNo, address, city,TotalCharge:0,GivenCharge:0 },
    });

    return NextResponse.json(
      { success: true, vendor: newVendor },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof z.ZodError ? error.errors : "Internal Server Error",
      },
      { status: error instanceof z.ZodError ? 400 : 500 }
    );
  }
}
