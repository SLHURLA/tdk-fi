import { authOptions } from "@/lib/auth";
import { db } from "@/utils/db";
import { Session } from "inspector/promises";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request:NextRequest){
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        console.log(`${session?.user?.username} is fetching new leads 🧑‍💻`);

        const leads = await db.lead.findMany({
            where:{
                init:false
            }
        });

        return NextResponse.json({ leads, message: "success" }, { status: 201 });
        
    } catch (error) {
        console.error("Error fetching leads:", error);
        return NextResponse.json(
            { message: "Internal Server Error" },
            { status: 500 }
        );
    }
}