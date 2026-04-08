// import { db } from "@/utils/db";
// import { NextResponse } from "next/server";

import { db } from "@/utils/db";
import { NextResponse } from "next/server";

// export async function POST(req: Request) {
//   try {
//     const { leadId } = await req.json();

//     const id = Number(leadId);

//     // 🔥 DELETE ALL RELATED DATA FIRST

//     await db.transactionNote.deleteMany({
//       where: { leadId: id },
//     });

//     await db.additionalItems.deleteMany({
//       where: { leadId: id },
//     });

//     await db.providedItems.deleteMany({
//       where: { leadId: id },
//     });

//     // 🔥 VERY IMPORTANT (you missed this)
//     await db.vendorBreakdown.deleteMany({
//       where: { leadId: id },
//     });

//     // 🔥 Finally delete lead
//     await db.lead.delete({
//       where: { id },
//     });

//     return NextResponse.json({ success: true });
//   } catch (error) {
//     console.log("DELETE ERROR:", error);
//     return NextResponse.json(
//       { success: false, message: "Delete failed" },
//       { status: 500 },
//     );
//   }
// }
export async function POST(req: Request) {
  try {
    const { leadId } = await req.json();
    const id = Number(leadId);

    const lead = await db.lead.findUnique({
      where: { id },
    });

    if (!lead) {
      return NextResponse.json(
        { success: false, message: "Lead not found" },
        { status: 404 },
      );
    }

    // ❌ Prevent deleting active leads
    if (lead.init) {
      return NextResponse.json(
        { success: false, message: "Cannot delete active lead" },
        { status: 400 },
      );
    }

    // 🔥 Safe cleanup (future-proof)
    await db.transactionNote.deleteMany({ where: { leadId: id } });
    await db.additionalItems.deleteMany({ where: { leadId: id } });
    await db.providedItems.deleteMany({ where: { leadId: id } });
    await db.vendorBreakdown.deleteMany({ where: { leadId: id } });

    await db.lead.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.log("DELETE ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Delete failed" },
      { status: 500 },
    );
  }
}
