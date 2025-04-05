import { db } from "@/utils/db";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Define Zod schema
const leadVendorSchema = z.object({
  leadId: z.string(), // Must be a positive integer
  vendorId: z.number().int().positive(), // Must be a positive integer
  price: z.number().min(0), // Must be a non-negative number
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log("Received request body:", body);

    // Validate input using Zod
    const validation = leadVendorSchema.safeParse(body);

    if (!validation.success) {
      console.error("Validation error:", validation.error.errors);
      return NextResponse.json(
        { message: "Invalid input data", errors: validation.error.format() },
        { status: 400 }
      );
    }

    const { leadId, vendorId, price } = validation.data;

    // Check if the vendor exists
    const vendor = await db.vendor.findUnique({
      where: { id: vendorId },
    });

    if (!vendor) {
      console.error("Vendor not found:", vendorId);
      return NextResponse.json(
        { message: "Vendor not found" },
        { status: 404 }
      );
    }

    console.log("Vendor found:", vendor);

    // Check if the lead exists
    const lead = await db.lead.findFirst({
      where: { lead_id: leadId },
    });

    if (!lead) {
      console.error("Lead not found:", leadId);
      return NextResponse.json({ message: "Lead not found" }, { status: 404 });
    }

    console.log("Lead found:", lead);

    // Update vendor: Add the lead and update TotalCharge
    const updatedVendor = await db.vendor.update({
      where: { id: vendorId },
      data: {
        leads: { connect: { id: lead.id } },
        TotalCharge: { increment: price },
      },
    });
    console.log("req data", lead.id, updatedVendor);
    const trackBreakdown = await db.vendorBreakdown.create({
      data: {
        totalAmt: price,
        totalGiven: 0,
        vendorId: vendorId,
        leadId: lead.id,
      },
    });

    const updatedNewVendor = await db.vendor.findUnique({
      where: { id: vendorId },
      include: {
        vendorsBreakdown: {
          where: {
            leadId: lead.id,
          },
        },
        transNotes: true,
      },
    });

    console.log(
      "Vendor updated successfully:",
      updatedVendor,
      trackBreakdown,
      updatedNewVendor
    );

    return NextResponse.json(
      { success: true, data: updatedNewVendor },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error adding lead to vendor:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
