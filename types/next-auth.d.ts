import NextAuth from "next-auth";
import { Role } from "@prisma/client";

declare module "next-auth" {
  interface User {
    id: string;
    username: string;
    email: string;
    // empNo: string;
    mobileNo: string;
    role: Role;
    store?: string;
  }

  interface Session {
    user: User;
  }

  interface JWT {
    id: string;
    username: string;
    email: string;
    // empNo: string;
    mobileNo: string;
    role: Role;
    store?: string;
  }
}
