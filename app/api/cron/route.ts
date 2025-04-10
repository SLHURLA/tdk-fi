import { db } from "@/utils/db";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";
import { Prisma } from "@prisma/client";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const BUCKET_NAME = "WonLeads";
const FILE_NAME = "won_leads.xlsx";
const BATCH_SIZE = 50; // Increased batch size for better performance

// Define an enum for lead status to match your Prisma schema
enum LeadStatus {
  WON = "WON",
  LOST = "LOST",
  PENDING = "PENDING",
}

// Define types for our data structures
interface LeadData {
  store: string;
  customerName: string;
  phoneNo: string;
  contactInfo: string;
  status: string;
  userId: number;
  lead_id: string;
}

interface StoreManager {
  id: number;
  empNo: string | null;
}

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
    let skippedCount = 0;
    let errorCount = 0;
    const errors: Array<{ lead_id: string }> = [];

    // Normalize sheet data
    const formattedData: LeadData[] = (sheetData as Record<string, unknown>[])
      .map((lead) => ({
        store: String(lead["store"] || "").trim(),
        customerName: String(lead["customerName"] || "").trim(),
        phoneNo: String(lead["phoneNo"] || "").trim(),
        contactInfo: String(lead["contactInfo"] || "").trim(),
        status: String(lead["status"] || "").trim(),
        userId: Number(lead["userId"]) || 1,
        lead_id: String(lead["lead_id"] || "").trim(),
      }))
      .filter((lead) => lead.lead_id); // Filter out leads with missing lead_id

    // Pre-fetch all store managers to avoid repeated queries
    const storeManagers = await db.user.findMany({
      where: {
        role: "STORE_MANAGER",
      },
      select: {
        id: true,
        store: true,
        empNo: true,
      },
    });

    // Create a map for quick lookup
    const storeManagerMap = new Map<
      string,
      { id: number; empNo: string | null }
    >();
    storeManagers.forEach((manager) => {
      // Handle potential null store values
      if (manager.store) {
        storeManagerMap.set(manager.store, {
          id: manager.id,
          empNo: manager.empNo,
        });
      }
    });

    // Fetch existing lead IDs in a single query to avoid checking one by one
    const existingLeadRecords = await db.lead.findMany({
      where: {
        lead_id: {
          in: formattedData.map((lead) => lead.lead_id),
        },
      },
      select: { lead_id: true },
    });

    const existingLeadIds = new Set(
      existingLeadRecords.map((lead) => lead.lead_id)
    );

    console.log(
      `Found ${existingLeadIds.size} existing leads out of ${formattedData.length} total`
    );

    // Prepare new leads for batch insertion
    const newLeads = formattedData.filter(
      (lead) => !existingLeadIds.has(lead.lead_id)
    );
    console.log(`Processing ${newLeads.length} new leads`);

    // Process in batches
    for (let i = 0; i < newLeads.length; i += BATCH_SIZE) {
      const batch = newLeads.slice(i, i + BATCH_SIZE);
      const leadsToCreate: Prisma.LeadCreateManyInput[] = [];

      const notifications: Prisma.NotificationCreateManyInput[] = [];

      // Prepare data for batch operations
      for (const lead of batch) {
        try {
          // Get store manager or use default
          const storeManager = storeManagerMap.get(lead.store) || {
            id: 1,
            empNo: null,
          };
          const userId = storeManager.id;

          leadsToCreate.push({
            store: lead.store,
            customerName: lead.customerName,
            phoneNo: lead.phoneNo,
            contactInfo: lead.contactInfo,
            status: "WON", // Explicit casting to enum
            userId: userId,
            lead_id: lead.lead_id,
          });

          if (storeManager.empNo) {
            notifications.push({
              message: `New Customer Added! Lead No:${lead.lead_id}`,
              type: "Infoℹ️",
              userId: storeManager.empNo,
            });
          }
        } catch (leadError) {
          console.error(`Error processing lead ${lead.lead_id}:`, leadError);
          errorCount++;
          errors.push({ lead_id: lead.lead_id });
        }
      }

      // Execute batch operations
      try {
        if (leadsToCreate.length > 0) {
          // Insert leads in a transaction
          await db.$transaction(async (tx) => {
            // Using createMany to insert multiple records at once
            await tx.lead.createMany({
              data: leadsToCreate,
              skipDuplicates: true,
            });

            if (notifications.length > 0) {
              await tx.notification.createMany({
                data: notifications,
                skipDuplicates: true,
              });
            }
          });

          addedCount += leadsToCreate.length;
        }
      } catch (batchError) {
        console.error("Error in batch processing:", batchError);
        errorCount += batch.length;
        // Continue with the next batch despite errors
      }
    }

    skippedCount = formattedData.length - newLeads.length;

    // Clean up old notifications in a separate operation
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

    return NextResponse.json(
      {
        message: `✅ Added ${addedCount} new leads successfully. Skipped ${skippedCount} existing leads. ${
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
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
