import { db } from "@/utils/db";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const item = searchParams.get("item");
    const brand = searchParams.get("brand");

    console.log("Searching for item:", item, "brand:", brand);

    // Define our check lists with proper categorization
    const furnitureItems = [
      "Kitchen",
      "Utility",
      "Store",
      "Pantry",
      "Vanity",
      "TV_Panel",
      "Wardrobe",
      "Dressing",
      "Other",
    ];

    const furnitureVendors = [
      "Factory Alea",
      "Installation Partner",
      "Architect Commission",
      "Staff Incentive",
    ];

    const sinkBrands = [
      "Anupam Sink",
      "Morzze Sink",
      "Hafele Water Solution",
      "Carysil Sink",
    ];

    const applianceBrands = [
      "Hafele Appliances",
      "Bosch Appliances",
      "Electrolux",
    ];

    // Helper function to extract main brand name
    const extractMainBrand = (
      brandName: string,
      suffixToRemove: string
    ): string => {
      // Create a case-insensitive regex to remove the suffix (if present)
      const suffixRegex = new RegExp(`\\s*${suffixToRemove}\\s*`, "i");
      return brandName.replace(suffixRegex, "").trim();
    };

    let whereCondition: any = {};

    if (item) {
      const normalizedItem = item.trim().toLowerCase();

      if (furnitureItems.some((fi) => fi.toLowerCase() === normalizedItem)) {
        whereCondition.OR = furnitureVendors.map((vendor) => ({
          name: {
            contains: vendor,
            mode: "insensitive" as const,
          },
        }));
      } else if (normalizedItem === "counter_top") {
        whereCondition.name = {
          contains: "Stone Vendor",
          mode: "insensitive" as const,
        };
      } else if (normalizedItem === "sink") {
        if (brand) {
          // Extract the main brand name by removing "sink" if it exists
          const mainBrandName = extractMainBrand(brand, "sink");

          // Search for vendors with the main brand name
          whereCondition.name = {
            contains: mainBrandName,
            mode: "insensitive" as const,
          };
        } else {
          // If no brand specified, search for vendors with any sink brand's main name
          whereCondition.OR = sinkBrands.map((sinkBrand) => {
            // Extract the main part of the brand name (without "Sink")
            const mainBrandName = extractMainBrand(sinkBrand, "sink");

            return {
              name: {
                contains: mainBrandName,
                mode: "insensitive" as const,
              },
            };
          });
        }
      } else if (normalizedItem === "appliances") {
        if (brand) {
          // Extract the main brand name by removing "appliances" if it exists
          const mainBrandName = extractMainBrand(brand, "appliances");

          // Search for vendors with the main brand name
          whereCondition.name = {
            contains: mainBrandName,
            mode: "insensitive" as const,
          };
        } else {
          // If no brand specified, search for vendors with any appliance brand's main name
          whereCondition.OR = applianceBrands.map((applianceBrand) => {
            // Extract the main part of the brand name (without "Appliances")
            const mainBrandName = extractMainBrand(
              applianceBrand,
              "appliances"
            );

            return {
              name: {
                contains: mainBrandName,
                mode: "insensitive" as const,
              },
            };
          });
        }
      } else {
        whereCondition.items = {
          some: {
            name: {
              contains: item,
              mode: "insensitive" as const,
            },
          },
        };
      }
    } else if (brand) {
      // When only brand is provided (no item), try to match the main brand name
      // This handles both sink brands and appliance brands
      const mainBrandName = brand
        .replace(/\s*sink\s*/i, "")
        .replace(/\s*appliances\s*/i, "")
        .trim();

      whereCondition.name = {
        contains: mainBrandName,
        mode: "insensitive" as const,
      };
    }

    console.log("whereCondition:", JSON.stringify(whereCondition, null, 2));

    const data = await db.vendor.findMany({
      where: whereCondition,
      select: {
        id: true,
        name: true,
        city: true,
      },
    });
    console.log("data received:", data);

    console.log(`Found ${data.length} matching vendors`);

    return new Response(
      JSON.stringify({
        success: true,
        count: data.length,
        data,
      }),
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error processing vendor request:", error);
    return new Response(
      JSON.stringify({ success: false, message: "Something went wrong" }),
      {
        status: 500,
      }
    );
  }
}
