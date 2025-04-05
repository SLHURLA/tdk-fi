import { db } from "@/utils/db";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const BUCKET_NAME = "WonLeads";
const FILE_NAME = "won_leads.xlsx";

export async function GET(request: Request) {
  try {
    // Fetch the Excel file from Supabase
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .download(FILE_NAME);

    if (error || !data) {
      console.error("Error fetching Excel file:", error);
      return NextResponse.json(
        { message: "Error fetching Excel file" },
        { status: 500 }
      );
    }

    // Read the Excel file
    const workbook = XLSX.read(await data.arrayBuffer(), { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    console.log("Parsed Data:", sheetData);

    let addedCount = 0;

    // Normalize sheet data
    const formattedData = sheetData.map((lead: any) => ({
      store: lead["store"]?.trim(),
      customerName: lead["customerName"]?.trim(),
      phoneNo: lead["phoneNo"]?.toString().trim(),
      contactInfo: lead["contactInfo"]?.trim(),
      status: lead["status"]?.trim(),
      userId: Number(lead["userId"]) || 1,
      lead_id: lead["lead_id"]?.trim(),
    }));

    for (const lead of formattedData) {
      console.log("Checking lead_id:", lead.lead_id);

      const existingLead = await db.lead.findFirst({
        where: { lead_id: lead.lead_id },
      });

      if (!existingLead) {
        const fetchUser = await db.user.findFirst({
          where: { store: lead.store },
        });

        const userId = fetchUser?.id ?? 1;

        await db.lead.create({
          data: {
            store: lead.store,
            customerName: lead.customerName,
            phoneNo: lead.phoneNo,
            contactInfo: lead.contactInfo,
            status: "WON",
            userId: userId,
            lead_id: lead.lead_id,
          },
        });

        addedCount++;

        // Add notification only if userId is valid
        // if (userId !== 1) {
        //   await db.notification.create({
        //     data: {
        //       message: `We won the lead! Lead No:${lead.lead_id}`,
        //       type: "SUCCESS🎉",
        //       userId: 100, // Ensure userId is an integer
        //     },
        //   });
        // }
      }
    }

    return NextResponse.json(
      {
        message: `✅ Added ${addedCount} new leads successfully.`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Cron job failed:", error);
    return NextResponse.json(
      { message: "🔴 Cron job failed!" },
      { status: 500 }
    );
  }
}
