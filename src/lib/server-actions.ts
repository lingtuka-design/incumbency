import { createServerFn } from "@tanstack/react-start"
import { db } from "../db"
import { departments, advanceTypes, incumbencies, type Incumbency } from "../db/schema"
import { eq, and, or, like, sql, desc, asc } from "drizzle-orm"

export interface DepartmentWithStats {
  code: string
  name: string
  category: string | null
  sortOrder: number | null
  totalCount: number
  activeCount: number
  closedCount: number
}

export interface SummaryStats {
  totalIncumbencies: number
  activeIncumbencies: number
  closedIncumbencies: number
  totalDepartments: number
  typeCounts: Record<string, number>
}

// ─────────────────────────────────────────────────────────────────────────────
// In-Memory Worker Cache (0ms response for static / metadata across clicks)
// ─────────────────────────────────────────────────────────────────────────────
let cachedDepartments: DepartmentWithStats[] | null = null
let cachedDepartmentsTime = 0

let cachedAdvanceTypes: { code: string; name: string; description: string | null; sortOrder: number | null }[] | null = null

let cachedSummaryStats: SummaryStats | null = null
let cachedSummaryStatsTime = 0

const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes cache

export function invalidateMetadataCache() {
  cachedDepartments = null
  cachedDepartmentsTime = 0
  cachedAdvanceTypes = null
  cachedSummaryStats = null
  cachedSummaryStatsTime = 0
}

async function fetchCachedDepartments(): Promise<DepartmentWithStats[]> {
  const now = Date.now()
  if (cachedDepartments && (now - cachedDepartmentsTime < CACHE_TTL_MS)) {
    return cachedDepartments
  }

  const depts = await db
    .select({
      code: departments.code,
      name: departments.name,
      category: departments.category,
      sortOrder: departments.sortOrder,
    })
    .from(departments)
    .orderBy(asc(departments.name))

  // Get count aggregates per department
  const counts = await db
    .select({
      dept: incumbencies.departmentCode,
      total: sql<number>`count(*)`.as("total"),
      active: sql<number>`sum(case when status = 'ACTIVE' then 1 else 0 end)`.as("active"),
      closed: sql<number>`sum(case when status = 'CLOSED' then 1 else 0 end)`.as("closed"),
    })
    .from(incumbencies)
    .groupBy(incumbencies.departmentCode)

  const countMap = new Map<string, { total: number; active: number; closed: number }>()
  for (const row of counts) {
    countMap.set(row.dept, {
      total: Number(row.total) || 0,
      active: Number(row.active) || 0,
      closed: Number(row.closed) || 0,
    })
  }

  const result = depts.map((d) => {
    const c = countMap.get(d.code) || { total: 0, active: 0, closed: 0 }
    return {
      code: d.code,
      name: d.name,
      category: d.category,
      sortOrder: d.sortOrder,
      totalCount: c.total,
      activeCount: c.active,
      closedCount: c.closed,
    }
  })

  cachedDepartments = result
  cachedDepartmentsTime = now
  return result
}

async function fetchCachedAdvanceTypes() {
  if (cachedAdvanceTypes) {
    return cachedAdvanceTypes
  }
  const types = await db
    .select()
    .from(advanceTypes)
    .orderBy(asc(advanceTypes.sortOrder))

  cachedAdvanceTypes = types
  return types
}

async function fetchCachedSummaryStats(): Promise<SummaryStats> {
  const now = Date.now()
  if (cachedSummaryStats && (now - cachedSummaryStatsTime < CACHE_TTL_MS)) {
    return cachedSummaryStats
  }

  const [totals] = await db
    .select({
      total: sql<number>`count(*)`,
      active: sql<number>`sum(case when status = 'ACTIVE' then 1 else 0 end)`,
      closed: sql<number>`sum(case when status = 'CLOSED' then 1 else 0 end)`,
    })
    .from(incumbencies)

  const [deptCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(departments)

  const typeRows = await db
    .select({
      type: incumbencies.advanceType,
      count: sql<number>`count(*)`,
    })
    .from(incumbencies)
    .groupBy(incumbencies.advanceType)

  const typeCounts: Record<string, number> = {}
  for (const row of typeRows) {
    typeCounts[row.type] = Number(row.count) || 0
  }

  const result: SummaryStats = {
    totalIncumbencies: Number(totals?.total) || 0,
    activeIncumbencies: Number(totals?.active) || 0,
    closedIncumbencies: Number(totals?.closed) || 0,
    totalDepartments: Number(deptCount?.count) || 0,
    typeCounts,
  }

  cachedSummaryStats = result
  cachedSummaryStatsTime = now
  return result
}

export interface IncumbencyFilter {
  departmentCode?: string
  advanceType?: string
  search?: string
  status?: string // 'ALL' | 'ACTIVE' | 'CLOSED'
  limit?: number
  offset?: number
}

async function fetchIncumbenciesList(data: IncumbencyFilter = {}) {
  const conditions = []

  if (data.departmentCode && data.departmentCode !== "ALL") {
    conditions.push(eq(incumbencies.departmentCode, data.departmentCode))
  }

  if (data.advanceType && data.advanceType !== "ALL") {
    conditions.push(eq(incumbencies.advanceType, data.advanceType))
  }

  if (data.status && data.status !== "ALL") {
    conditions.push(eq(incumbencies.status, data.status as "ACTIVE" | "CLOSED"))
  }

  if (data.search && data.search.trim()) {
    const query = `%${data.search.trim()}%`
    conditions.push(
      or(
        like(incumbencies.code, query),
        like(incumbencies.name, query),
        like(incumbencies.designation, query),
        like(incumbencies.fatherName, query),
        like(incumbencies.rgNumber, query),
        like(incumbencies.superannuation, query),
        like(incumbencies.remarks, query)
      )
    )
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined
  const limit = data.limit || 500
  const offset = data.offset || 0

  return await db
    .select({
      id: incumbencies.id,
      departmentCode: incumbencies.departmentCode,
      advanceType: incumbencies.advanceType,
      code: incumbencies.code,
      name: incumbencies.name,
      designation: incumbencies.designation,
      fatherName: incumbencies.fatherName,
      superannuation: incumbencies.superannuation,
      rgNumber: incumbencies.rgNumber,
      remarks: incumbencies.remarks,
      status: incumbencies.status,
      createdAt: incumbencies.createdAt,
      updatedAt: incumbencies.updatedAt,
    })
    .from(incumbencies)
    .where(whereClause)
    .orderBy(asc(incumbencies.code), asc(incumbencies.name))
    .limit(limit)
    .offset(offset)
}

// ─────────────────────────────────────────────────────────────────────────────
// Unified Fast Dashboard Loader Action (1 single fast HTTP request)
// ─────────────────────────────────────────────────────────────────────────────
export const getDashboardData = createServerFn({ method: "GET" })
  .validator((filters?: IncumbencyFilter) => filters || {})
  .handler(async ({ data }) => {
    try {
      const [departments, advanceTypes, stats, incumbencies] = await Promise.all([
        fetchCachedDepartments(),
        fetchCachedAdvanceTypes(),
        fetchCachedSummaryStats(),
        fetchIncumbenciesList(data),
      ])

      return {
        departments,
        advanceTypes,
        stats,
        incumbencies,
      }
    } catch (e: any) {
      console.error("Error in getDashboardData:", e)
      return {
        departments: [],
        advanceTypes: [],
        stats: {
          totalIncumbencies: 0,
          activeIncumbencies: 0,
          closedIncumbencies: 0,
          totalDepartments: 0,
          typeCounts: {},
        },
        incumbencies: [],
      }
    }
  })

// 1. Fetch departments with their counts (cached)
export const getDepartments = createServerFn({ method: "GET" })
  .handler(async (): Promise<DepartmentWithStats[]> => {
    try {
      return await fetchCachedDepartments()
    } catch (e: any) {
      console.error("Error fetching departments:", e)
      return []
    }
  })

// 2. Fetch Advance Types (cached)
export const getAdvanceTypes = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      return await fetchCachedAdvanceTypes()
    } catch (e) {
      console.error("Error fetching advance types:", e)
      return []
    }
  })

// 3. Fetch Incumbencies with search & filters
export const getIncumbencies = createServerFn({ method: "GET" })
  .validator((filters?: IncumbencyFilter) => filters || {})
  .handler(async ({ data }) => {
    try {
      return await fetchIncumbenciesList(data)
    } catch (e: any) {
      console.error("Error fetching incumbencies:", e)
      return []
    }
  })

// 4. Overall Summary stats (cached)
export const getSummaryStats = createServerFn({ method: "GET" })
  .handler(async (): Promise<SummaryStats> => {
    try {
      return await fetchCachedSummaryStats()
    } catch (e) {
      console.error("Error calculating summary stats:", e)
      return {
        totalIncumbencies: 0,
        activeIncumbencies: 0,
        closedIncumbencies: 0,
        totalDepartments: 0,
        typeCounts: {},
      }
    }
  })

export interface CreateIncumbencyInput {
  departmentCode: string
  advanceType: string
  code: string
  name: string
  designation?: string
  fatherName?: string
  superannuation?: string | null
  rgNumber?: string | null
  remarks?: string
  status?: "ACTIVE" | "CLOSED"
}

// Helper to ensure standard Loan Code format: ADVANCE_TYPE/DEPARTMENT_CODE/NUMBER (e.g. HBA/DAT/001)
export function formatLoanCode(advanceType: string, departmentCode: string, codeInput: string): string {
  const clean = codeInput.trim().toUpperCase()
  if (clean.includes("/")) {
    return clean
  }
  const num = parseInt(clean, 10)
  const padded = isNaN(num) ? clean : String(num).padStart(3, "0")
  return `${advanceType.trim().toUpperCase()}/${departmentCode.trim().toUpperCase()}/${padded}`
}

// 5. Create new Incumbency
export const createIncumbency = createServerFn({ method: "POST" })
  .validator((input: CreateIncumbencyInput) => {
    if (!input.departmentCode?.trim()) throw new Error("Department is required")
    if (!input.advanceType?.trim()) throw new Error("Advance Type is required")
    if (!input.code?.trim()) throw new Error("Code number is required")
    if (!input.name?.trim()) throw new Error("Employee name is required")
    return input
  })
  .handler(async ({ data }) => {
    const id = crypto.randomUUID()
    const now = new Date()

    const standardCode = formatLoanCode(data.advanceType, data.departmentCode, data.code)

    const newRecord = {
      id,
      departmentCode: data.departmentCode.trim(),
      advanceType: data.advanceType.trim().toUpperCase(),
      code: standardCode,
      name: data.name.trim(),
      designation: data.designation?.trim() || null,
      fatherName: data.fatherName?.trim() || null,
      superannuation: data.superannuation?.trim() || null,
      rgNumber: data.rgNumber?.trim() || null,
      remarks: data.remarks?.trim() || null,
      status: (data.status || "ACTIVE") as "ACTIVE" | "CLOSED",
      createdAt: now,
      updatedAt: now,
    }

    await db.insert(incumbencies).values(newRecord)
    invalidateMetadataCache()
    return newRecord
  })

export interface UpdateIncumbencyInput extends CreateIncumbencyInput {
  id: string
}

// 6. Update Incumbency
export const updateIncumbency = createServerFn({ method: "POST" })
  .validator((input: UpdateIncumbencyInput) => {
    if (!input.id) throw new Error("Record ID is required")
    if (!input.code?.trim()) throw new Error("Code is required")
    if (!input.name?.trim()) throw new Error("Name is required")
    return input
  })
  .handler(async ({ data }) => {
    const now = new Date()
    const standardCode = formatLoanCode(data.advanceType, data.departmentCode, data.code)

    await db
      .update(incumbencies)
      .set({
        departmentCode: data.departmentCode.trim(),
        advanceType: data.advanceType.trim().toUpperCase(),
        code: standardCode,
        name: data.name.trim(),
        designation: data.designation?.trim() || null,
        fatherName: data.fatherName?.trim() || null,
        superannuation: data.superannuation?.trim() || null,
        rgNumber: data.rgNumber?.trim() || null,
        remarks: data.remarks?.trim() || null,
        status: (data.status || "ACTIVE") as "ACTIVE" | "CLOSED",
        updatedAt: now,
      })
      .where(eq(incumbencies.id, data.id))

    invalidateMetadataCache()
    return { success: true }
  })

// 7. Delete Incumbency
export const deleteIncumbency = createServerFn({ method: "POST" })
  .validator((id: string) => {
    if (!id) throw new Error("Record ID is required")
    return id
  })
  .handler(async ({ data: id }) => {
    await db.delete(incumbencies).where(eq(incumbencies.id, id))
    invalidateMetadataCache()
    return { success: true }
  })

export interface PatchIncumbencyInlineInput {
  id: string
  superannuation?: string | null
  rgNumber?: string | null
}

// 8. Fast patch for inline table editing (Superannuation & RG Number)
export const patchIncumbencyInline = createServerFn({ method: "POST" })
  .validator((input: PatchIncumbencyInlineInput) => {
    if (!input?.id) throw new Error("Record ID is required")
    return input
  })
  .handler(async ({ data }) => {
    const updateValues: Record<string, any> = {
      updatedAt: new Date(),
    }
    if (data.superannuation !== undefined) {
      updateValues.superannuation = data.superannuation?.trim() || null
    }
    if (data.rgNumber !== undefined) {
      updateValues.rgNumber = data.rgNumber?.trim() || null
    }

    await db
      .update(incumbencies)
      .set(updateValues)
      .where(eq(incumbencies.id, data.id))

    return {
      success: true,
      id: data.id,
      superannuation: updateValues.superannuation ?? undefined,
      rgNumber: updateValues.rgNumber ?? undefined,
    }
  })
