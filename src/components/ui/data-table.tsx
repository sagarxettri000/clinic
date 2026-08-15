"use client"

import * as React from "react"
import { Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { SearchInput } from "./search-input"
import { Pagination } from "./pagination"
import { EmptyState } from "./empty-state"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "./table"

interface Column {
  key: string
  label: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  render?: (item: any) => React.ReactNode
  className?: string
}

interface DataTableAction {
  label: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onClick: (item: any) => void
  variant?: "default" | "destructive"
}

interface DataTableProps {
  columns: Column[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any[]
  searchable?: boolean
  searchPlaceholder?: string
  emptyMessage?: string
  emptyIcon?: React.ReactNode
  actions?: DataTableAction[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onRowClick?: (item: any) => void
  pageSize?: number
}

export function DataTable({
  columns,
  data,
  searchable = true,
  searchPlaceholder = "Search...",
  emptyMessage = "No records found.",
  emptyIcon,
  actions,
  onRowClick,
  pageSize = 10,
}: DataTableProps) {
  const [search, setSearch] = React.useState("")
  const [currentPage, setCurrentPage] = React.useState(1)

  const filteredData = React.useMemo(() => {
    if (!search) return data

    const searchLower = search.toLowerCase()
    return data.filter((item) =>
      columns.some((col) => {
        const value = item[col.key]
        return value !== null && value !== undefined && String(value).toLowerCase().includes(searchLower)
      })
    )
  }, [data, search, columns])

  const totalPages = Math.ceil(filteredData.length / pageSize)
  const paginatedData = filteredData.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  const handleSearch = React.useCallback((value: string) => {
    setSearch(value)
    setCurrentPage(1)
  }, [])

  return (
    <div className="space-y-4">
      {searchable && (
        <div className="flex items-center gap-2">
          <SearchInput
            onSearch={handleSearch}
            placeholder={searchPlaceholder}
            className="max-w-sm"
          />
        </div>
      )}

      {filteredData.length === 0 ? (
        <EmptyState
          icon={emptyIcon || <Search className="h-12 w-12" />}
          title={emptyMessage}
        />
      ) : (
        <>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((col) => (
                    <TableHead key={col.key} className={col.className}>
                      {col.label}
                    </TableHead>
                  ))}
                  {actions && actions.length > 0 && (
                    <TableHead className="text-right">Actions</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.map((item, index) => (
                  <TableRow
                    key={index}
                    onClick={onRowClick ? () => onRowClick(item) : undefined}
                    className={cn(onRowClick && "cursor-pointer")}
                  >
                    {columns.map((col) => (
                      <TableCell key={col.key} className={col.className}>
                        {col.render
                          ? col.render(item)
                          : (item[col.key] as React.ReactNode)}
                      </TableCell>
                    ))}
                    {actions && actions.length > 0 && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {actions.map((action, actionIndex) => (
                            <button
                              key={actionIndex}
                              onClick={() => action.onClick(item)}
                              className={cn(
                                "rounded px-2 py-1 text-xs font-medium transition-colors hover:bg-muted",
                                action.variant === "destructive"
                                  ? "text-destructive hover:text-destructive"
                                  : "text-foreground"
                              )}
                            >
                              {action.label}
                            </button>
                          ))}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredData.length}
            itemsPerPage={pageSize}
            onPageChange={setCurrentPage}
          />
        </>
      )}
    </div>
  )
}
