import { db } from "@/utils/db";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Define Zod validation schema
const transactionSchema = z.object({
  amount: z.number().positive(),
  transactionName: z.enum([
    "SALARY",
    "BANK_DDN",
    "CASH_DDN",
    "LABOUR",
    "PANTRY",
    "TRAVEL",
    "FOOD",
    "GIFT",
    "FINISHING",
    "MAINTENANCE",
    "STATIONERY",
    "RENT",
    "ELECTRICITY",
    "MISCELLANEOUS",
    "VENDOR_PAYMENT",
    "CLIENT_PAYMENT",
    "ROUNDOFF",
  ]),
  transactionType: z.enum(["CASH_IN", "CASH_OUT"]),
  paymentMethod: z.enum(["ONLINE", "CASH"]),
  remark: z.string().optional(),
  vendorId: z.number().optional(),
  actualDate: z
    .string()
    .transform((str) => new Date(str))
    .optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ leadId: string }> }
) {
  try {
    console.log("API Called: Creating Lead Transaction");

    // Validate request body using Zod
    const body = await request.json();
    const parsedData = transactionSchema.safeParse(body);
    console.log(parsedData);

    if (!parsedData.success) {
      return NextResponse.json(
        { message: "Invalid input data", errors: parsedData.error.errors },
        { status: 400 }
      );
    }

    const {
      amount,
      transactionName,
      transactionType,
      paymentMethod,
      remark,
      vendorId,
      actualDate,
    } = parsedData.data;
    const { leadId } = await params;

    console.log("actualDate", actualDate);

    // Check if the lead exists
    const lead = await db.lead.findFirst({
      where: { lead_id: leadId },
    });

    if (!lead) {
      return NextResponse.json({ message: "Invalid Lead ID" }, { status: 404 });
    }

    // Create transaction note
    const newTransaction = await db.transactionNote.create({
      data: {
        amount,
        transactionName,
        transactionType,
        paymentMethod,
        leadId: lead.id,
        vendorId,
        remark,
        actualDate,
      },
    });

    const updatedLead = await db.lead.update({
      where: { id: lead.id },
      data: {
        receiveCash:
          transactionType === "CASH_IN" &&
          paymentMethod === "CASH" &&
          transactionName !== "VENDOR_PAYMENT"
            ? lead.receiveCash + amount
            : transactionType === "CASH_OUT" &&
              paymentMethod === "CASH" &&
              transactionName !== "VENDOR_PAYMENT"
            ? lead.receiveCash - amount
            : lead.receiveCash,

        receiveOnline:
          transactionType === "CASH_IN" &&
          paymentMethod === "ONLINE" &&
          transactionName !== "VENDOR_PAYMENT"
            ? lead.receiveOnline + amount
            : transactionType === "CASH_OUT" &&
              paymentMethod === "ONLINE" &&
              transactionName !== "VENDOR_PAYMENT"
            ? lead.receiveOnline - amount
            : lead.receiveOnline,

        totalExp:
          transactionType === "CASH_OUT" && transactionName !== "CLIENT_PAYMENT"
            ? lead.totalExp + amount
            : transactionType === "CASH_IN" &&
              transactionName === "VENDOR_PAYMENT"
            ? lead.totalExp - amount
            : lead.totalExp,
      },
    });

    // If vendorId is provided, update the vendor's payment
    let updatedVendor = null;
    if (vendorId && transactionName === "VENDOR_PAYMENT") {
      //check the vendor existance
      const vendor = await db.vendor.findFirst({ where: { id: vendorId } });

      if (!vendor) {
        return NextResponse.json(
          { message: "Invalid Vendor ID" },
          { status: 404 }
        );
      }

      //check the vendor is present in the lead
      const checkVendor = await db.lead.findFirst({
        where: {
          vendors: {
            some: {
              id: vendorId,
            },
          },
        },
      });

      if (!checkVendor) {
        return NextResponse.json(
          { message: "Vendor is not related with your lead" },
          { status: 401 }
        );
      }

      updatedVendor = await db.vendor.update({
        where: { id: vendor.id },
        data: {
          GivenCharge:
            transactionType === "CASH_OUT"
              ? vendor.GivenCharge + amount
              : vendor.GivenCharge - amount,
        },
      });

      const getBreak = await db.vendorBreakdown.findFirst({
        where: {
          vendorId: vendor.id,
          leadId: lead.id,
        },
      });
      const updateVendorBreakDown = await db.vendorBreakdown.update({
        where: {
          id: getBreak?.id,
        },
        data: {
          totalGiven: {
            increment: transactionType === "CASH_OUT" ? amount : -amount,
          },
        },
      });
      console.log(
        `Updated Vendor Payment: total remaining=${
          updatedVendor.TotalCharge - updatedVendor.GivenCharge
        }`
      );
    }

    console.log(
      `Updated Lead Transactions: receiveCash=${updatedLead.receiveCash}, receiveOnline=${updatedLead.receiveOnline}, totalExp=${updatedLead.totalExp}`
    );

    return NextResponse.json(
      {
        newTransaction,
        updatedLead,
        updatedVendor,
        message: "Transaction recorded successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error processing lead transaction:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
