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
      "Craysin Sink",
    ];

    const applianceBrands = [
      "Hafele Appliances",
      "Bosch Appliances",
      "Electrolux",
    ];

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
      }
      else if (normalizedItem === "counter_top") {
        whereCondition.name = {
          contains: "Stone Vendor",
          mode: "insensitive" as const,
        };

        if (brand) {
          const normalizedBrand = brand.trim().toLowerCase();

          const matchedSinkBrand = sinkBrands.find((sb) =>
            normalizedBrand.includes(sb.toLowerCase())
          );

          if (matchedSinkBrand) {
            whereCondition.brand = {
              contains: matchedSinkBrand,
              mode: "insensitive" as const,
            };
          }
        }
      }
      else if (normalizedItem === "appliances") {
        if (brand) {
          const normalizedBrand = brand.trim().toLowerCase();

          const matchedApplianceBrand = applianceBrands.find((ab) =>
            normalizedBrand.includes(ab.toLowerCase())
          );

          if (matchedApplianceBrand) {
            whereCondition.brand = {
              contains: matchedApplianceBrand,
              mode: "insensitive" as const,
            };
          } else {
            whereCondition.OR = applianceBrands.map((brand) => ({
              brand: {
                contains: brand,
                mode: "insensitive" as const,
              },
            }));
          }
        } else {
          whereCondition.OR = applianceBrands.map((brand) => ({
            brand: {
              contains: brand,
              mode: "insensitive" as const,
            },
          }));
        }
      }
      else {
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
      whereCondition.brand = {
        contains: brand,
        mode: "insensitive" as const,
      };
    }

    const data = await db.vendor.findMany({
      where: whereCondition,
      select: {
        id: true,
        name: true,
        city: true,
      },
    });

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
