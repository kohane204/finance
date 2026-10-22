import { db, activities } from "@/schema"

export type ActivityAction = "CREATE" | "UPDATE" | "DELETE" | "LOGIN" | "LOGOUT"
export type EntityType = "TRANSACTION" | "BUDGET" | "GOAL" | "CARD" | "USER" | "FRIEND" | "LOAN" | "BILL"

export async function logActivity({
  userId,
  action,
  entityType,
  entityId,
  description,
  metadata
}: {
  userId: string
  action: ActivityAction
  entityType: EntityType
  entityId?: string
  description: string
  metadata?: Record<string, unknown>
}) {
  try {
    await db.insert(activities).values({
      userId,
      action,
      entityType,
      entityId,
      description,
      metadata: metadata ? JSON.stringify(metadata) : null,
    })
  } catch (error) {
    console.error("Failed to log activity:", error)
  }
}
