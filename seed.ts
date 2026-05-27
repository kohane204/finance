import { config } from "dotenv"
config({ path: ".env.local" })

import { db } from "./schema"
import { users } from "./schema"
import bcrypt from "bcryptjs"
import { eq } from "drizzle-orm"

async function runSeed() {
  console.log("Checking for admin user...");
  const existing = await db.select().from(users).where(eq(users.email, "admin@finova.com")).limit(1);
  
  if (existing.length === 0) {
    console.log("Seeding admin user...");
    const hashed = await bcrypt.hash("admin", 10);
    
    await db.insert(users).values({
      email: "admin@finova.com",
      name: "Finova Administrator",
      password: hashed,
      role: "admin"
    });
    console.log("Admin seeded successfully.");
  } else {
    console.log("Admin already exists.");
  }
  process.exit();
}

runSeed().catch(console.error);
