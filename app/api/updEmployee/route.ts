import { NextResponse } from "next/server";
import * as z from "zod";
import { db } from "@/utils/db";

const updateUserSchema = z.object({
  fullName: z.string().min(1, "Full name is required").max(100),
  username: z.string().min(1, "Username is required").max(100),
  email: z.string().min(1, "Email is required").email("Invalid email"),
  mobileNo: z
    .string()
    .regex(/^\d{10}$/, "Contact must contain exactly 10 digits"),
  store: z.enum([
    "Dehradun",
    "Haridwar",
    "Patiala",
    "Haldwani",
    "Jaipur",
    "Lucknow",
  ]),
  role: z.enum(["ADMIN", "SUPER_HEAD", "STORE_MANAGER"]),
});

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { fullName, username, email, mobileNo, role, store } =
      updateUserSchema.parse(body);

    if (!body.id) {
      return NextResponse.json(
        { message: "User ID is required" },
        { status: 400 }
      );
    }

    const existingUser = await db.user.findUnique({ where: { id: body.id } });
    if (!existingUser) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    if (email !== existingUser.email) {
      const existingUserByEmail = await db.user.findUnique({
        where: { email },
      });
      if (existingUserByEmail) {
        return NextResponse.json(
          { message: "Email is already in use" },
          { status: 409 }
        );
      }
    }

    const updatedUser = await db.user.update({
      where: { id: body.id },
      data: { fullName, username, email, mobileNo, role, store },
    });

    return NextResponse.json(
      { updatedUser, message: "User updated successfully" },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Something went wrong!!",
      },
      { status: 500 }
    );
  }
}
