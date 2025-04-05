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

    let addedCount = 0;
    let errorCount = 0;
    const errors: any = [];

    // Normalize sheet data
    const formattedData = sheetData.map((lead: any) => ({
      store: String(lead["store"] || "").trim(),
      customerName: String(lead["customerName"] || "").trim(),
      phoneNo: String(lead["phoneNo"] || "").trim(),
      contactInfo: String(lead["contactInfo"] || "").trim(),
      status: String(lead["status"] || "").trim(),
      userId: Number(lead["userId"]) || 1,
      lead_id: String(lead["lead_id"] || "").trim(),
    }));

    // Process in batches to avoid timeouts
    const BATCH_SIZE = 10;
    for (let i = 0; i < formattedData.length; i += BATCH_SIZE) {
      const batch = formattedData.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(async (lead) => {
          try {
            if (!lead.lead_id) {
              console.warn("Skipping lead with missing lead_id");
              return;
            }

            // Check for existing lead using a direct string comparison
            const existingLead = await db.lead.findFirst({
              where: { lead_id: { equals: lead.lead_id } },
            });

            if (!existingLead) {
              let userId = 1; // Default fallback

              try {
                const fetchUser = await db.user.findFirst({
                  where: {
                    store: lead.store,
                    role: "STORE_MANAGER",
                  },
                });

                userId = fetchUser?.id ?? 1;
              } catch (userError) {
                console.error("Error finding user:", userError);
                // Continue with default userId
              }

              // Create the lead
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

              // Add notification
              try {
                const user = await db.user.findUnique({
                  where: { id: userId },
                });

                await db.notification.create({
                  data: {
                    message: `New Customer Added! Lead No:${lead.lead_id}`,
                    type: "Infoℹ️",
                    userId: user?.empNo,
                  },
                });
              } catch (notifError) {
                console.error("Failed to create notification:", notifError);
                // Continue processing other leads
              }
            } else {
              console.log(`Lead ${lead.lead_id} already exists, skipping`);
            }
          } catch (leadError) {
            console.error(`Error processing lead ${lead.lead_id}:`, leadError);
            errorCount++;
            errors.push({
              lead_id: lead.lead_id,
            });
          }
        })
      );
    }

    // Clean up old notifications
    try {
      const fiveDaysAgo = new Date();
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

      const deletedNotifications = await db.notification.deleteMany({
        where: {
          createdAt: {
            lt: fiveDaysAgo,
          },
        },
      });

      console.log(`Deleted ${deletedNotifications.count} old notifications`);
    } catch (cleanupError) {
      console.error("Error cleaning up old notifications:", cleanupError);
    }

    // Include any errors in the response for debugging
    return NextResponse.json(
      {
        message: `✅ Added ${addedCount} new leads successfully. ${
          errorCount > 0 ? `Failed to add ${errorCount} leads.` : ""
        }`,
        errors: errors.length > 0 ? errors : undefined,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Cron job failed:", error);
    return NextResponse.json(
      {
        message: "🔴 Cron job failed!",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
// export async function GET(request: Request) {
//   try {
//     const deleteData = await db.lead.deleteMany();
//     return NextResponse.json(
//       {
//         deleteData,
//         message: `✅ Added new leads successfully.`,
//       },
//       { status: 200 }
//     );
//   } catch (error) {
//     console.error("Cron job failed:", error);
//     return NextResponse.json(
//       { message: "🔴 Cron job failed!" },
//       { status: 500 }
//     );
//   }
// }
