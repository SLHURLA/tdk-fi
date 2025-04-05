import { NextRequest, NextResponse } from "next/server";
import * as z from "zod";
import { db } from "@/utils/db";
import { getServerSession } from "next-auth";

const userSchema = z.object({
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
    "Global",
  ]),
  role: z.enum(["ADMIN", "SUPER_HEAD", "STORE_MANAGER"]),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { username, email, mobileNo, role, store } = userSchema.parse(body);
    console.log(body);
    // Check if email already exists
    const existingUserByEmail = await db.user.findUnique({ where: { email } });
    if (existingUserByEmail) {
      return NextResponse.json(
        { message: "User with this email already exists" },
        { status: 409 }
      );
    }

    const count = await db.user.count();
    const empNo = `EMP${String(count + 1).padStart(3, "0")}`;

    // Hash the password before storing it
    // const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await db.user.create({
      data: {
        mobileNo,
        empNo,
        username,
        email,
        passwordHash: "1234",
        role,
        store,
      },
    });

    return NextResponse.json(
      { newUser, message: "User Created Successfully" },
      { status: 201 }
    );
  } catch (error) {
    console.log(error);
    
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Something went wrong!!",
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { userId } = body;

  const session = await getServerSession();
  if (session?.user?.role === "STORE_MANAGER") {
    NextResponse.json(
      { message: "Your are not authenticated to do this" },
      { status: 401 }
    );
  }

  try {
    const user = await db.user.update({
      where: {
        id: userId,
      },
      data: {
        passwordHash: "1234",
      },
    });
    return NextResponse.json(
      { user, message: "Password Reset Successfully" },
      { status: 201 }
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
