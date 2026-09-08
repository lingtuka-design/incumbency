import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useState, useMemo, useTransition, useEffect } from "react"
import {
  Search,
  Plus,
  Download,
  Building2,
  FileText,
  Filter,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  ChevronRight,
  X,
  Loader2,
  Calendar,
  Check,
  AlertCircle,
} from "lucide-react"
import * as XLSX from "xlsx"
import {
  getDepartments,
  getAdvanceTypes,
  getIncumbencies,
  getSummaryStats,
  createIncumbency,
  updateIncumbency,
  deleteIncumbency,
  patchIncumbencyInline,
  type DepartmentWithStats,
  type SummaryStats,
} from "../lib/server-actions"

export interface SearchParams {
  dept?: string
  type?: string
  q?: string
  status?: string
}

export interface IncumbencyItem {
  id: string
  departmentCode: string
  advanceType: string
  code: string
  name: string
  designation: string | null
  fatherName: string | null
  superannuation?: string | null
  rgNumber?: string | null
  remarks: string | null
  status: "ACTIVE" | "CLOSED" | null
  createdAt: Date | null
  updatedAt: Date | null
}

export interface LoaderData {
  departments: DepartmentWithStats[]
  advanceTypes: { code: string; name: string; description: string | null; sortOrder: number | null }[]
  incumbencies: IncumbencyItem[]
  stats: SummaryStats
}

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): SearchParams => {
    return {
      dept: (search.dept as string) || "ALL",
      type: (search.type as string) || "ALL",
      q: (search.q as string) || "",
      status: (search.status as string) || "ALL",
    }
  },
  loaderDeps: ({ search }) => ({
    dept: search.dept,
    type: search.type,
    q: search.q,
    status: search.status,
  }),
  loader: async ({ deps }): Promise<LoaderData> => {
    const [departments, advanceTypes, incumbencies, stats] = await Promise.all([
      getDepartments(),
      getAdvanceTypes(),
      getIncumbencies({
        data: {
          departmentCode: deps.dept,
          advanceType: deps.type,
          search: deps.q,
          status: deps.status,
        },
      }),
      getSummaryStats(),
    ])

    return {
      departments,
      advanceTypes,
      incumbencies,
      stats,
    }
  },
  component: DashboardPage,
})

function DashboardPage() {
  const loaderData = Route.useLoaderData() as LoaderData
  const { departments, advanceTypes, incumbencies, stats } = loaderData
  const searchParams = Route.useSearch() as SearchParams
  const navigate = useNavigate()

  const [searchQuery, setSearchQuery] = useState(searchParams.q || "")
  const [deptSearch, setDeptSearch] = useState("")
  const [isPending, startTransition] = useTransition()

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<IncumbencyItem | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Form inputs
  const [formData, setFormData] = useState({
    departmentCode: "",
    advanceType: "HBA",
    code: "",
    name: "",
    designation: "",
    fatherName: "",
    superannuation: "",
    rgNumber: "",
    remarks: "",
    status: "ACTIVE" as "ACTIVE" | "CLOSED",
  })

  const currentDept = searchParams.dept || "ALL"
  const currentType = searchParams.type || "ALL"
  const currentStatus = searchParams.status || "ALL"

  // Selected Department Info
  const activeDeptInfo = useMemo(() => {
    if (currentDept === "ALL") return null
    return departments.find((d) => d.code === currentDept) || null
  }, [departments, currentDept])

  // Filter departments for sidebar search
  const filteredDepartments = useMemo(() => {
    if (!deptSearch.trim()) return departments
    const q = deptSearch.toLowerCase().trim()
    return departments.filter(
      (d) => d.code.toLowerCase().includes(q) || d.name.toLowerCase().includes(q)
    )
  }, [departments, deptSearch])

  // Quick department switch
  const handleSelectDept = (code: string) => {
    startTransition(() => {
      navigate({
        to: "/",
        search: {
          dept: code,
          type: currentType,
          q: searchQuery || undefined,
          status: currentStatus,
        },
      })
    })
  }

  // Type tab switch
  const handleSelectType = (code: string) => {
    startTransition(() => {
      navigate({
        to: "/",
        search: {
          dept: currentDept,
          type: code,
          q: searchQuery || undefined,
          status: currentStatus,
        },
      })
    })
  }

  // Status toggle
  const handleSelectStatus = (st: string) => {
    startTransition(() => {
      navigate({
        to: "/",
        search: {
          dept: currentDept,
          type: currentType,
          q: searchQuery || undefined,
          status: st,
        },
      })
    })
  }

  // Search submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(() => {
      navigate({
        to: "/",
        search: {
          dept: currentDept,
          type: currentType,
          q: searchQuery.trim() || undefined,
          status: currentStatus,
        },
      })
    })
  }

  // Open Create Modal
  const openCreateModal = () => {
    setEditingItem(null)
    setFormData({
      departmentCode: currentDept !== "ALL" ? currentDept : (departments[0]?.code || ""),
      advanceType: currentType !== "ALL" ? currentType : "HBA",
      code: "",
      name: "",
      designation: "",
      fatherName: "",
      superannuation: "",
      rgNumber: "",
      remarks: "",
      status: "ACTIVE",
    })
    setFormError(null)
    setIsModalOpen(true)
  }

  // Open Edit Modal
  const openEditModal = (item: IncumbencyItem) => {
    setEditingItem(item)
    setFormData({
      departmentCode: item.departmentCode,
      advanceType: item.advanceType,
      code: item.code,
      name: item.name,
      designation: item.designation || "",
      fatherName: item.fatherName || "",
      superannuation: item.superannuation || "",
      rgNumber: item.rgNumber || "",
      remarks: item.remarks || "",
      status: (item.status as "ACTIVE" | "CLOSED") || "ACTIVE",
    })
    setFormError(null)
    setIsModalOpen(true)
  }

  // Handle Form Submit
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setFormError(null)
    try {
      if (editingItem) {
        await updateIncumbency({
          data: {
            id: editingItem.id,
            departmentCode: formData.departmentCode,
            advanceType: formData.advanceType,
            code: formData.code,
            name: formData.name,
            designation: formData.designation,
            fatherName: formData.fatherName,
            superannuation: formData.superannuation,
            rgNumber: formData.rgNumber,
            remarks: formData.remarks,
            status: formData.status,
          },
        })
      } else {
        await createIncumbency({
          data: formData,
        })
      }
      setIsModalOpen(false)
      // Refresh view
      navigate({
        to: "/",
        search: {
          dept: currentDept,
          type: currentType,
          q: searchQuery || undefined,
          status: currentStatus,
        },
      })
    } catch (err: any) {
      setFormError(err.message || "An error occurred while saving.")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle Delete
  const handleDelete = async (item: IncumbencyItem) => {
    if (confirm(`Are you sure you want to delete "${item.name}" (${item.code})?`)) {
      try {
        await deleteIncumbency({ data: item.id })
        navigate({
          to: "/",
          search: {
            dept: currentDept,
            type: currentType,
            q: searchQuery || undefined,
            status: currentStatus,
          },
        })
      } catch (err: any) {
        alert("Failed to delete record: " + err.message)
      }
    }
  }

  // Export to Excel
  const handleExportExcel = () => {
    const exportData = incumbencies.map((row) => ({
      "Dept Code": row.departmentCode,
      "Advance Type": row.advanceType,
      "Loan Code": row.code,
      "Employee Name": row.name,
      Designation: row.designation || "",
      "Father Name": row.fatherName || "",
      Superannuation: row.superannuation || "",
      "RG Number": row.rgNumber || "",
      Remarks: row.remarks || "",
      Status: row.status,
    }))

    const worksheet = XLSX.utils.json_to_sheet(exportData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Incumbencies")
    const filename = `Incumbency_${currentDept}_${currentType}_${new Date().toISOString().slice(0, 10)}.xlsx`
    XLSX.writeFile(workbook, filename)
  }

  // Helper for badge color
  const getAdvanceBadgeColor = (type: string) => {
    switch (type) {
      case "HBA":
        return "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-200 dark:border-blue-800"
      case "CAR":
        return "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800"
      case "COM":
        return "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-200 dark:border-purple-800"
      case "SA":
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
      case "SCL":
        return "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-200 dark:border-rose-800"
      default:
        return "bg-secondary text-secondary-foreground border-border"
    }
  }

  return (
    <div className="flex flex-1 flex-col md:flex-row overflow-hidden bg-background">
      {/* ──────────────────────────────────────────────────────────
          LEFT SIDEBAR: Department Navigation
      ────────────────────────────────────────────────────────── */}
      <aside className="w-full md:w-80 border-r border-border bg-sidebar flex flex-col md:h-[calc(100vh-3.5rem)] shrink-0">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-sidebar-border space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" />
              Departments ({departments.length})
            </span>
            <button
              onClick={() => handleSelectDept("ALL")}
              className={`text-xs px-2 py-0.5 rounded font-medium transition-colors ${
                currentDept === "ALL"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-muted"
              }`}
            >
              All
            </button>
          </div>

          {/* Department Quick Filter Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Filter department..."
              value={deptSearch}
              onChange={(e) => setDeptSearch(e.target.value)}
              className="w-full bg-background text-foreground text-xs pl-8 pr-3 py-1.5 rounded-md border border-input focus:outline-none focus:ring-1 focus:ring-ring"
            />
            {deptSearch && (
              <button
                onClick={() => setDeptSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Department List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {/* "All Departments" item */}
          <button
            onClick={() => handleSelectDept("ALL")}
            className={`w-full text-left px-3 py-2 rounded-md text-xs font-medium flex items-center justify-between transition-colors ${
              currentDept === "ALL"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-sidebar-foreground hover:bg-sidebar-accent"
            }`}
          >
            <span className="flex items-center gap-2 truncate">
              <span className="font-semibold">ALL DEPARTMENTS</span>
            </span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                currentDept === "ALL"
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {stats.totalIncumbencies}
            </span>
          </button>

          {/* Department Items */}
          {filteredDepartments.map((dept) => {
            const isSelected = currentDept === dept.code
            return (
              <button
                key={dept.code}
                onClick={() => handleSelectDept(dept.code)}
                className={`w-full text-left px-3 py-2 rounded-md text-xs flex items-center justify-between transition-colors ${
                  isSelected
                    ? "bg-primary text-primary-foreground font-medium shadow-xs"
                    : "text-sidebar-foreground hover:bg-sidebar-accent"
                }`}
              >
                <div className="truncate pr-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold tracking-tight">
                      {dept.code}
                    </span>
                  </div>
                  <p
                    className={`text-[11px] truncate mt-0.5 ${
                      isSelected ? "text-primary-foreground/80" : "text-muted-foreground"
                    }`}
                  >
                    {dept.name}
                  </p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {dept.totalCount > 0 ? (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold ${
                        isSelected
                          ? "bg-primary-foreground/20 text-primary-foreground"
                          : "bg-muted text-foreground"
                      }`}
                    >
                      {dept.totalCount}
                    </span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground/60">0</span>
                  )}
                  <ChevronRight
                    className={`w-3 h-3 ${
                      isSelected ? "text-primary-foreground" : "text-muted-foreground/40"
                    }`}
                  />
                </div>
              </button>
            )
          })}

          {filteredDepartments.length === 0 && (
            <div className="p-4 text-center text-xs text-muted-foreground">
              No department matching "{deptSearch}"
            </div>
          )}
        </div>
      </aside>

      {/* ──────────────────────────────────────────────────────────
          MAIN CONTENT AREA
      ────────────────────────────────────────────────────────── */}
      <section className="flex-1 flex flex-col overflow-y-auto md:h-[calc(100vh-3.5rem)]">
        {/* Department Banner & Overview */}
        <div className="p-4 lg:p-6 border-b border-border bg-card space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs px-2 py-0.5 rounded font-bold bg-primary/10 text-primary border border-primary/20">
                  {currentDept}
                </span>
                <h2 className="text-xl font-bold tracking-tight text-foreground">
                  {activeDeptInfo ? activeDeptInfo.name : "All Departments Incumbency"}
                </h2>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Showing {incumbencies.length} records • Manage employee advance and loan incumbencies
              </p>
            </div>

            {/* Action Buttons: Add & Export */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportExcel}
                disabled={incumbencies.length === 0}
                className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-md border border-input bg-background hover:bg-muted text-foreground transition-colors disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                Export Excel
              </button>
              <button
                onClick={openCreateModal}
                className="inline-flex items-center gap-1.5 text-xs font-medium px-3.5 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Incumbency
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="p-3 rounded-lg border border-border bg-background">
              <div className="text-[11px] font-medium text-muted-foreground">Total Records</div>
              <div className="text-xl font-bold text-foreground mt-0.5">
                {activeDeptInfo ? activeDeptInfo.totalCount : stats.totalIncumbencies}
              </div>
            </div>
            <div className="p-3 rounded-lg border border-border bg-background">
              <div className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                Active Records
              </div>
              <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                {activeDeptInfo ? activeDeptInfo.activeCount : stats.activeIncumbencies}
              </div>
            </div>
            <div className="p-3 rounded-lg border border-border bg-background">
              <div className="text-[11px] font-medium text-muted-foreground">Closed Records</div>
              <div className="text-xl font-bold text-muted-foreground mt-0.5">
                {activeDeptInfo ? activeDeptInfo.closedCount : stats.closedIncumbencies}
              </div>
            </div>
            <div className="p-3 rounded-lg border border-border bg-background">
              <div className="text-[11px] font-medium text-muted-foreground">Filtered Results</div>
              <div className="text-xl font-bold text-primary mt-0.5">
                {incumbencies.length}
              </div>
            </div>
          </div>

          {/* Advance Type Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-border">
            <span className="text-xs font-semibold text-muted-foreground mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Type:
            </span>
            <button
              onClick={() => handleSelectType("ALL")}
              className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
                currentType === "ALL"
                  ? "bg-foreground text-background font-semibold"
                  : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              All Types
            </button>
            {advanceTypes.map((type) => {
              const isSel = currentType === type.code
              return (
                <button
                  key={type.code}
                  onClick={() => handleSelectType(type.code)}
                  className={`text-xs px-2.5 py-1 rounded-md font-medium flex items-center gap-1.5 transition-colors ${
                    isSel
                      ? "bg-foreground text-background font-semibold shadow-xs"
                      : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <span>{type.code}</span>
                  <span className="text-[10px] opacity-75">({type.name})</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* ──────────────────────────────────────────────────────────
            FILTER & SEARCH TOOLBAR
        ────────────────────────────────────────────────────────── */}
        <div className="p-4 border-b border-border bg-card/50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search by Name, Code, Designation */}
          <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name, code no, designation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-background text-foreground text-xs pl-9 pr-8 py-2 rounded-md border border-input focus:outline-none focus:ring-1 focus:ring-ring"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("")
                  startTransition(() => {
                    navigate({
                      to: "/",
                      search: {
                        dept: currentDept,
                        type: currentType,
                        status: currentStatus,
                      },
                    })
                  })
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </form>

          {/* Status Filter Toggle */}
          <div className="flex items-center gap-1 bg-muted p-1 rounded-lg self-start sm:self-auto text-xs">
            <button
              onClick={() => handleSelectStatus("ALL")}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                currentStatus === "ALL"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All
            </button>
            <button
              onClick={() => handleSelectStatus("ACTIVE")}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                currentStatus === "ACTIVE"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Active
            </button>
            <button
              onClick={() => handleSelectStatus("CLOSED")}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                currentStatus === "CLOSED"
                  ? "bg-slate-700 text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Closed
            </button>
          </div>
        </div>

        {/* ──────────────────────────────────────────────────────────
            DATA TABLE
        ────────────────────────────────────────────────────────── */}
        <div className="flex-1 p-4 lg:p-6 overflow-x-auto">
          {incumbencies.length > 0 ? (
            <div className="rounded-lg border border-border bg-card shadow-xs overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
                    <th className="py-3 px-3.5 w-32 whitespace-nowrap">Loan Code</th>
                    <th className="py-3 px-3.5">Employee Name</th>
                    <th className="py-3 px-3.5">Designation</th>
                    <th className="py-3 px-3.5">Father's Name</th>
                    <th className="py-3 px-2.5 w-44">Superannuation (Pension)</th>
                    <th className="py-3 px-2.5 w-36">RG Number</th>
                    <th className="py-3 px-3.5 w-24">Dept</th>
                    <th className="py-3 px-3.5 w-24">Type</th>
                    <th className="py-3 px-3.5">Remarks</th>
                    <th className="py-3 px-3.5 w-20 text-center">Status</th>
                    <th className="py-3 px-3.5 w-24 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {incumbencies.map((item) => (
                    <InlineIncumbencyRow
                      key={item.id}
                      item={item}
                      getAdvanceBadgeColor={getAdvanceBadgeColor}
                      openEditModal={openEditModal}
                      handleDelete={handleDelete}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">No Incumbency Records Found</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                No incumbencies match the current filters. Try changing your department, advance type, or search term.
              </p>
              <button
                onClick={openCreateModal}
                className="inline-flex items-center gap-1.5 text-xs font-medium px-3.5 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add First Incumbency
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────
          ADD / EDIT MODAL DIALOG
      ────────────────────────────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-card text-card-foreground border border-border w-full max-w-lg rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-sm">
                  {editingItem ? "Edit Incumbency Record" : "Add New Incumbency"}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Enter employee loan/advance details below
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleFormSubmit} className="p-4 space-y-4">
              {formError && (
                <div className="p-2.5 rounded-md bg-destructive/10 text-destructive text-xs">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Department Select */}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Department *
                  </label>
                  <select
                    value={formData.departmentCode}
                    onChange={(e) => setFormData({ ...formData, departmentCode: e.target.value })}
                    required
                    className="w-full bg-background text-foreground text-xs p-2 rounded-md border border-input focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    {departments.map((d) => (
                      <option key={d.code} value={d.code}>
                        {d.code} - {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Advance Type Select */}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Advance Type *
                  </label>
                  <select
                    value={formData.advanceType}
                    onChange={(e) => setFormData({ ...formData, advanceType: e.target.value })}
                    required
                    className="w-full bg-background text-foreground text-xs p-2 rounded-md border border-input focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    {advanceTypes.map((t) => (
                      <option key={t.code} value={t.code}>
                        {t.code} ({t.name})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Code */}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Loan Code / Code No *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 001 or HBA/DAT/001"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full bg-background text-foreground text-xs p-2 rounded-md border border-input focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                  <span className="block text-[10px] text-muted-foreground mt-0.5 truncate">
                    Preview: {formData.code?.includes("/") ? formData.code : `${formData.advanceType}/${formData.departmentCode || "..."}/${formData.code || "001"}`}
                  </span>
                </div>

                {/* Name */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Employee Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. C. Lalniliana"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-background text-foreground text-xs p-2 rounded-md border border-input focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Designation */}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Designation
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. JD, SDAO, Inspector"
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    className="w-full bg-background text-foreground text-xs p-2 rounded-md border border-input focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>

                {/* Father's Name */}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Father's Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Lalhmingliana"
                    value={formData.fatherName}
                    onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })}
                    className="w-full bg-background text-foreground text-xs p-2 rounded-md border border-input focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Superannuation */}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Superannuation (Pension Date: DD-MM-YYYY)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 31-03-2028"
                    value={formData.superannuation}
                    onChange={(e) => setFormData({ ...formData, superannuation: e.target.value })}
                    className="w-full bg-background text-foreground text-xs p-2 rounded-md border border-input focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>

                {/* RG Number */}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    RG Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. RG-001"
                    value={formData.rgNumber}
                    onChange={(e) => setFormData({ ...formData, rgNumber: e.target.value })}
                    className="w-full bg-background text-foreground text-xs p-2 rounded-md border border-input focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Status *
                </label>
                <div className="flex items-center gap-4 text-xs">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      value="ACTIVE"
                      checked={formData.status === "ACTIVE"}
                      onChange={() => setFormData({ ...formData, status: "ACTIVE" })}
                    />
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                      Active
                    </span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      value="CLOSED"
                      checked={formData.status === "CLOSED"}
                      onChange={() => setFormData({ ...formData, status: "CLOSED" })}
                    />
                    <span className="text-muted-foreground font-medium">Closed / Nil</span>
                  </label>
                </div>
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Remarks / Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Additional notes, order no, or closure status..."
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  className="w-full bg-background text-foreground text-xs p-2 rounded-md border border-input focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                />
              </div>

              {/* Modal Actions */}
              <div className="pt-2 border-t border-border flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 rounded-md text-xs font-medium border border-input bg-background hover:bg-muted text-foreground transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {editingItem ? "Save Changes" : "Create Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

interface InlineIncumbencyRowProps {
  item: IncumbencyItem
  getAdvanceBadgeColor: (type: string) => string
  openEditModal: (item: IncumbencyItem) => void
  handleDelete: (item: IncumbencyItem) => void
}

function InlineIncumbencyRow({
  item,
  getAdvanceBadgeColor,
  openEditModal,
  handleDelete,
}: InlineIncumbencyRowProps) {
  const [superannuation, setSuperannuation] = useState(item.superannuation || "")
  const [rgNumber, setRgNumber] = useState(item.rgNumber || "")
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [lastSaved, setLastSaved] = useState({
    superannuation: item.superannuation || "",
    rgNumber: item.rgNumber || "",
  })

  // Sync state if item prop changes
  useEffect(() => {
    setSuperannuation(item.superannuation || "")
    setRgNumber(item.rgNumber || "")
    setLastSaved({
      superannuation: item.superannuation || "",
      rgNumber: item.rgNumber || "",
    })
  }, [item.id, item.superannuation, item.rgNumber])

  const handleSaveField = async (field: "superannuation" | "rgNumber", val: string) => {
    const trimmed = val.trim()
    if (trimmed === lastSaved[field]) {
      return
    }

    setSaveStatus("saving")
    try {
      const res = await patchIncumbencyInline({
        data: {
          id: item.id,
          [field]: trimmed || null,
        },
      })
      if (res?.success) {
        setLastSaved((prev) => ({ ...prev, [field]: trimmed }))
        item[field] = trimmed || null
        setSaveStatus("saved")
        setTimeout(() => {
          setSaveStatus((s) => (s === "saved" ? "idle" : s))
        }, 2500)
      } else {
        setSaveStatus("error")
      }
    } catch (e) {
      console.error("Failed to inline save to D1:", e)
      setSaveStatus("error")
    }
  }

  const handleDatePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value // "YYYY-MM-DD"
    if (val) {
      const [y, m, d] = val.split("-")
      const formatted = `${d}-${m}-${y}`
      setSuperannuation(formatted)
      handleSaveField("superannuation", formatted)
    }
  }

  return (
    <tr className="hover:bg-muted/30 transition-colors group">
      <td className="py-2.5 px-3.5 whitespace-nowrap">
        <span className="font-mono font-bold text-xs text-primary px-1.5 py-0.5 rounded bg-primary/5 border border-primary/15">
          {item.code}
        </span>
      </td>
      <td className="py-2.5 px-3.5 font-medium text-foreground whitespace-nowrap">
        {item.name}
      </td>
      <td className="py-2.5 px-3.5 text-muted-foreground whitespace-nowrap">
        {item.designation || "—"}
      </td>
      <td className="py-2.5 px-3.5 text-muted-foreground whitespace-nowrap">
        {item.fatherName || "—"}
      </td>

      {/* Superannuation (Pension Date: DD-MM-YYYY) */}
      <td className="py-1.5 px-2.5 w-44">
        <div className="relative flex items-center">
          <input
            type="text"
            placeholder="DD-MM-YYYY"
            value={superannuation}
            onChange={(e) => setSuperannuation(e.target.value)}
            onBlur={() => handleSaveField("superannuation", superannuation)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.currentTarget.blur()
              }
            }}
            className="w-full font-mono text-xs px-2 py-1 pr-6 rounded border border-input bg-background/80 hover:bg-background focus:bg-background focus:outline-none focus:ring-1 focus:ring-ring transition-colors placeholder:text-muted-foreground/40"
            title="Superannuation Pension Date (DD-MM-YYYY)"
          />
          <label
            className="absolute right-1 cursor-pointer text-muted-foreground hover:text-foreground p-0.5"
            title="Choose Date"
          >
            <Calendar className="w-3.5 h-3.5" />
            <input
              type="date"
              className="sr-only"
              onChange={handleDatePick}
            />
          </label>
        </div>
      </td>

      {/* RG Number */}
      <td className="py-1.5 px-2.5 w-36">
        <div className="relative flex items-center">
          <input
            type="text"
            placeholder="RG Code"
            value={rgNumber}
            onChange={(e) => setRgNumber(e.target.value)}
            onBlur={() => handleSaveField("rgNumber", rgNumber)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.currentTarget.blur()
              }
            }}
            className="w-full font-mono text-xs px-2 py-1 rounded border border-input bg-background/80 hover:bg-background focus:bg-background focus:outline-none focus:ring-1 focus:ring-ring transition-colors placeholder:text-muted-foreground/40"
            title="RG Number code"
          />
        </div>
      </td>

      <td className="py-2.5 px-3.5">
        <span className="font-mono text-[11px] font-semibold text-muted-foreground">
          {item.departmentCode}
        </span>
      </td>
      <td className="py-2.5 px-3.5">
        <span
          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${getAdvanceBadgeColor(
            item.advanceType
          )}`}
        >
          {item.advanceType}
        </span>
      </td>
      <td className="py-2.5 px-3.5 text-muted-foreground max-w-xs truncate">
        {item.remarks || "—"}
      </td>
      <td className="py-2.5 px-3.5 text-center">
        <span
          className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
            item.status === "ACTIVE"
              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
              : "bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300"
          }`}
        >
          {item.status === "ACTIVE" ? (
            <CheckCircle2 className="w-3 h-3" />
          ) : (
            <XCircle className="w-3 h-3" />
          )}
          {item.status}
        </span>
      </td>
      <td className="py-2.5 px-3.5 text-right whitespace-nowrap">
        <div className="inline-flex items-center gap-1">
          {saveStatus === "saving" && (
            <span title="Saving to D1..." className="inline-flex items-center text-blue-500 mr-1">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            </span>
          )}
          {saveStatus === "saved" && (
            <span title="Saved to D1" className="inline-flex items-center text-emerald-600 dark:text-emerald-400 mr-1">
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            </span>
          )}
          {saveStatus === "error" && (
            <span title="Save error! Try again" className="inline-flex items-center text-destructive mr-1">
              <AlertCircle className="w-3.5 h-3.5" />
            </span>
          )}

          <button
            onClick={() => openEditModal(item)}
            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Edit Full Record"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleDelete(item)}
            className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  )
}
