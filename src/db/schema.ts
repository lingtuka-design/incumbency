import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core"

export const departments = sqliteTable("departments", {
  code: text("code").primaryKey(), // e.g. "AGRI", "A&C", "DAT"
  name: text("name").notNull(), // Full name e.g. "Agriculture Department"
  category: text("category").default("Government Department"),
  sortOrder: integer("sort_order").default(0),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
})

export const advanceTypes = sqliteTable("advance_types", {
  code: text("code").primaryKey(), // "HBA", "CAR", "COM", "SA", "SCL"
  name: text("name").notNull(), // "House Building Advance", "Motor Car Advance", etc.
  description: text("description"),
  sortOrder: integer("sort_order").default(0),
})

export const incumbencies = sqliteTable(
  "incumbencies",
  {
    id: text("id").primaryKey(), // UUID
    departmentCode: text("department_code")
      .notNull()
      .references(() => departments.code, { onDelete: "cascade" }),
    advanceType: text("advance_type")
      .notNull()
      .references(() => advanceTypes.code, { onDelete: "cascade" }),
    code: text("code").notNull(), // e.g. "001", "002"
    name: text("name").notNull(), // Employee Name
    designation: text("designation"), // e.g. "JD", "DD", "Assistant"
    fatherName: text("father_name"),
    remarks: text("remarks"),
    status: text("status", { enum: ["ACTIVE", "CLOSED"] }).default("ACTIVE"),
    createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  },
  (table) => [
    index("idx_incumbencies_dept").on(table.departmentCode),
    index("idx_incumbencies_type").on(table.advanceType),
    index("idx_incumbencies_code").on(table.code),
    index("idx_incumbencies_name").on(table.name),
    index("idx_incumbencies_status").on(table.status),
  ]
)

export type Department = typeof departments.$inferSelect
export type NewDepartment = typeof departments.$inferInsert

export type AdvanceType = typeof advanceTypes.$inferSelect
export type NewAdvanceType = typeof advanceTypes.$inferInsert

export type Incumbency = typeof incumbencies.$inferSelect
export type NewIncumbency = typeof incumbencies.$inferInsert
