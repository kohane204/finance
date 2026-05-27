import NextAuth from "next-auth";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/schema";
import { users } from "@/schema";
import { authConfig } from "./auth.config";
import Google from "next-auth/providers/google";
import Github from "next-auth/providers/github";
export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  adapter: DrizzleAdapter(db),
  providers: [
    Google,
    Github,
    Credentials({
      name: "Sign in",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "you@example.com" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        
        const userArray = await db.select().from(users).where(eq(users.email, credentials.email as string));
        const user = userArray[0];

        if (!user || !user.password) return null;

        // Compare password
        let passwordsMatch = false;
        try {
          passwordsMatch = await bcrypt.compare(credentials.password as string, user.password);
        } catch { }

        if (!passwordsMatch) {
            return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role, // Assuming you add this to the JWT
        };
      }
    })
  ]
});
