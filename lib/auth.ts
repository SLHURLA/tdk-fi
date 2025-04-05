import { NextAuthOptions, Session } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { db } from "@/utils/db";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"; // Replace with env variable in production

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db),
  session: {
    strategy: "jwt", // Using JSON Web Tokens for session management
  },
  pages: {
    signIn: "/sign-in", // Custom sign-in page
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: {
          label: "Email",
          type: "text",
          placeholder: "mail@example.com",
        },
        password: { label: "Password", type: "password" },
        mobileNo: { label: "Mobile Number", type: "text" },
        otp: { label: "OTP", type: "text" },
      },
      async authorize(credentials) {
        // Validate that credentials exist
        if (!credentials) return null;

        // Handle email/password login
        if (credentials.email && credentials.password) {
          const existingUser = await db.user.findUnique({
            where: { email: credentials.email },
          });

          if (!existingUser) return null;

          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            existingUser.passwordHash
          );

          if (!isPasswordValid) return null;

          return {
            id: existingUser.id.toString(),
            email: existingUser.email,
            username: existingUser.username,
            empNo: existingUser.empNo,
            mobileNo: existingUser.mobileNo,
            role: existingUser.role,
            store: existingUser.store ?? undefined,
          };
        }

        // Handle mobile/OTP login
        if (credentials.mobileNo && credentials.otp) {
          const user = await db.user.findFirst({
            where: { mobileNo: credentials.mobileNo },
          });

          if (!user) return null;

          if (user.otp !== credentials.otp) return null;

          // Clear OTP after successful login
          await db.user.update({
            where: { id: user.id },
            data: { otp: null },
          });

          return {
            id: user.id.toString(),
            email: user.email,
            username: user.username,
            empNo: user.empNo,
            mobileNo: user.mobileNo,
            role: user.role,
            store: user.store ?? undefined,
          };
        }

        return null;
      },
    }),
  ],
  callbacks: {
    // Control how JWT token is created and updated
    async jwt({ token, user }) {
      // console.log("JWT TOKEN", token);
      if (user) {
        return {
          ...token,
          username: user.username,
          role: user.role,
          store: user.store || "",
          mobileNo: user.mobileNo,
          id: user.id.toString(),
        };
      }
      return token;
    },
    // Control how session data is mapped
    async session({ session, token }) {
      // console.log("1SESSION", session, "\nTOKEN", token);

      // Ensure custom fields are added to the session
      session.user = {
        ...session.user, // Preserve existing fields like `name`, `email`, etc.
        username: token.username as string, // Add `username` from the token
        role: token.role as Role, // Add `role` from the token
        store: (token.store as string) || "",
        mobileNo: token.mobileNo as string,
        id: token.sub as string,
      };

      // console.log("2SESSION", session, "\nTOKEN", token);

      return session; // Return the modified session object
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  jwt: {
    secret: process.env.NEXTAUTH_SECRET,
  },
};
