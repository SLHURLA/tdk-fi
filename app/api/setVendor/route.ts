import { db } from "@/utils/db";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { vendorId, leadId, newAmount } = body;

    if (!vendorId) {
      return NextResponse.json(
        { message: "Vendor ID is required" },
        { status: 400 }
      );
    }

    const lead = await db.lead.findUnique({
      where: {
        id: leadId,
      },
    });

    if (!lead) {
      return NextResponse.json({ message: "No lead found" }, { status: 404 });
    }

    const vendor = await db.vendor.findUnique({
      where: { id: vendorId },
      include: { vendorsBreakdown: true },
    });

    if (!vendor) {
      return NextResponse.json({ message: "No Vendor found" }, { status: 404 });
    }

    const findData = await db.vendorBreakdown.findFirst({
      where: {
        leadId,
        vendorId,
      },
    });
    if (!findData) {
      return NextResponse.json({ message: "No Vendor found" }, { status: 404 });
    }

    if (newAmount >= findData?.totalAmt) {
      const updateData = await db.vendorBreakdown.update({
        where: {
          id: findData?.id,
        },
        data: {
          totalAmt: newAmount,
        },
      });
      //update vendor dashboard
      const updVendor = await db.vendor.update({
        where: {
          id: findData.vendorId,
        },
        data: {
          TotalCharge: vendor.TotalCharge - findData.totalAmt + newAmount,
        },
      });
    } else {
      if (newAmount >= findData?.totalGiven) {
        const updateData = await db.vendorBreakdown.update({
          where: {
            id: findData?.id,
          },
          data: {
            totalAmt: newAmount,
          },
        });

        const updVendor = await db.vendor.update({
          where: {
            id: findData.vendorId,
          },
          data: {
            TotalCharge: {
              increment: newAmount - findData.totalAmt,
            },
          },
        });
      }
      if (newAmount < findData?.totalGiven) {
        const updateData = await db.vendorBreakdown.update({
          where: {
            id: findData?.id,
          },
          data: {
            totalAmt: newAmount,
            totalGiven: newAmount,
          },
        });

        const updVendor = await db.vendor.update({
          where: {
            id: findData.vendorId,
          },
          data: {
            TotalCharge: {
              decrement: findData.totalGiven - newAmount,
            },
            GivenCharge: {
              decrement: findData.totalGiven - newAmount,
            },
          },
        });
      }
    }

    if (newAmount < findData?.totalGiven) {
      const createNotesLead = await db.transactionNote.create({
        data: {
          amount: findData.totalGiven - newAmount,
          paymentMethod: "ONLINE",
          transactionName: "VENDOR_PAYMENT",
          transactionType: "CASH_IN",
          leadId: findData.leadId,
          remark: `Return : Payment from vendor ${vendor.name}, CustomerId ${lead?.lead_id}`,
          vendorId: findData.vendorId,
        },
      });
    }

    // const GivenCharge =
    //   newAmount > findData.totalGiven
    //     ? vendor.GivenCharge
    //     : vendor.GivenCharge - (newAmount - findData.totalGiven);

    // //update vendor dashboard
    // const updVendor = await db.vendor.update({
    //   where: {
    //     id: findData.vendorId,
    //   },
    //   data: {
    //     TotalCharge: vendor.TotalCharge - findData.totalAmt + newAmount,
    //     GivenCharge: GivenCharge,
    //   },
    // });

    // Return success response
    return NextResponse.json(
      { message: "Vendor breakdown updated successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting vendor:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { vendorId, leadId } = body;

    if (!vendorId) {
      return NextResponse.json(
        { message: "Vendor ID is required" },
        { status: 400 }
      );
    }

    const lead = await db.lead.findUnique({
      where: {
        id: leadId,
      },
    });

    const vendor = await db.vendor.findUnique({
      where: { id: vendorId },
      include: { vendorsBreakdown: true },
    });

    if (!vendor) {
      return NextResponse.json({ message: "No Vendor found" }, { status: 404 });
    }

    const findData = await db.vendorBreakdown.findFirst({
      where: {
        leadId,
        vendorId,
      },
    });

    const deleteData = await db.vendorBreakdown.delete({
      where: {
        id: findData?.id,
      },
    });

    if (deleteData.totalGiven > 0) {
      const createNotesLead = await db.transactionNote.create({
        data: {
          amount: deleteData.totalGiven,
          paymentMethod: "ONLINE",
          transactionName: "VENDOR_PAYMENT",
          transactionType: "CASH_IN",
          leadId: deleteData.leadId,
          remark: `Return : Payment from vendor ${vendor.name}, CustomerId ${lead?.lead_id}`,
          vendorId: deleteData.vendorId,
        },
      });

      const leadUpd = await db.lead.update({
        where: {
          id: lead?.id,
        },
        data: {
          totalExp: {
            decrement: deleteData.totalGiven,
          },
        },
      });
    }
    // const createNotesVendor = await db.transactionNote.create({
    //   data: {
    //     amount: deleteData.totalGiven,
    //     paymentMethod: "ONLINE",
    //     transactionName: "VENDOR_PAYMENT",
    //     transactionType: "CASH_OUT",
    //     // leadId: deleteData.leadId,
    //     vendorId
    //     remark: `Return : Payment from vendor ${vendor.name}`,
    //   },
    // });

    //decrease the price
    await db.vendor.update({
      where: {
        id: vendorId,
      },
      data: {
        TotalCharge: {
          decrement: deleteData.totalAmt,
        },
        GivenCharge: {
          decrement: deleteData.totalGiven,
        },
      },
    });

    //remove the link
    await db.lead.update({
      where: {
        id: leadId,
      },
      data: {
        vendors: {
          disconnect: { id: vendorId },
        },
      },
    });

    // remaining logic for if we want to delete that related transaction notes and decrease the expences value form lead

    return NextResponse.json(
      {
        message: "Vendor disconnected successfully",
        success: true,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting vendor:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
