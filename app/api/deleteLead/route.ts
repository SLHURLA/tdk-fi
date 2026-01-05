import { authOptions } from "@/lib/auth";
import { db } from "@/utils/db"; // Changed from @/lib/db to @/utils/db
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Security check: Ensure the user is logged in
    if (!session || !session.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await req.json();

    if (!id) {
      return NextResponse.json({ message: "Missing Lead ID" }, { status: 400 });
    }

    // Fetch the lead to verify its initialization status
    const lead = await db.lead.findUnique({
      where: { id: Number(id) },
    });

    if (!lead) {
      return NextResponse.json({ message: "Lead not found" }, { status: 404 });
    }

    // Restriction: Only delete leads that are NOT initialized (init: false)
    if (lead.init) {
      return NextResponse.json(
        { message: "Initialized leads cannot be deleted" }, 
        { status: 400 }
      );
    }

    // Perform the soft delete by updating the deletedAt field
    await db.lead.update({
      where: { id: Number(id) },
      data: { deletedAt: new Date() },
    });

    console.log(`Lead ${id} soft-deleted by ${session.user.username}`);

    return NextResponse.json({ message: "Lead soft-deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("[DELETE_LEAD_ERROR]", error);
    return NextResponse.json(
      { message: "Internal Server Error" }, 
      { status: 500 }
    );
  }
}