import { db } from "@/utils/db";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const { id } = await request.json();

  try {
    const transaction = await db.storeExpNotes.findUnique({
      where: { id },
    });

    if (!transaction || !transaction.transactionDate) {
      return new Response(
        JSON.stringify({ error: "Transaction not found or missing date." }),
        { status: 404 }
      );
    }

    //delete transaction
    const delData = await db.storeExpNotes.delete({
      where: { id },
    });

    const transactionDate = new Date(transaction.transactionDate);
    const transactionMonth = transactionDate.getMonth() + 1; // Months are 0-indexed
    const transactionYear = transactionDate.getFullYear();

    const revenues = await db.revenue.findFirst({
      where: {
        userId: transaction.userId,
        AND: [
          {
            createdAt: {
              gte: new Date(`${transactionYear}-${transactionMonth}-01`),
              lt: new Date(`${transactionYear}-${transactionMonth + 1}-01`),
            },
          },
        ],
      },
    });

    // remove profit
    const remProfit = await db.revenue.update({
      where: {
        id: revenues?.id,
      },
      data: {
        totalProfit: {
          decrement: delData.amount,
        },
      },
    });

    return new Response(JSON.stringify({ revenues, transaction }), {
      status: 200,
    });
  } catch (error) {
    console.error("Error fetching revenue:", error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
    });
  }
}
