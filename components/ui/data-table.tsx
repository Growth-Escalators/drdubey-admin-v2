"use client"

import { Button } from "@/components/ui/button"
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  SortingState,
  getSortedRowModel,
  useReactTable,
  getFilteredRowModel,
  ColumnFiltersState,
  VisibilityState,
  getPaginationRowModel

} from "@tanstack/react-table"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import React, { useState, forwardRef, useImperativeHandle } from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useModal } from "@/hooks/use-modal-store"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search } from "lucide-react"

export interface DataTableRef<T> {
  getCurrentPageData: () => T[];
  getSelectedData: () => T[];
  getFilteredData: () => T[];
}

interface DataTableProps<TData, TValue> {
 
  onSelectionChange?: (count: number) => void
  enableFiltering?: boolean
 
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  pageSizeOptions?: number[];

  
  filterableColumns?: {
    id: string;
    title: string;
  }[];

  searchableColumns?: string[];
}

const DataTable = forwardRef<DataTableRef<any>, DataTableProps<any, any>>(({
  columns,
  data,
  pageSizeOptions = [10, 20, 30, 40, 50],
  onSelectionChange,
  enableFiltering,
  filterableColumns,
  searchableColumns
}, ref) => {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  )
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})
  const [isLoading, setIsLoading] = useState(false)
  const { onOpen } = useModal();
  const [globalFilter, setGlobalFilter] = React.useState('');
  

  const header = {
   "headers":{
    Authorization: process.env.NEXT_PUBLIC_WHATSAPP_TOKEN,
    Accept: "application/json"
    
   } 
  }

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onRowSelectionChange: setRowSelection,
    getPaginationRowModel: getPaginationRowModel(),
    state: {
      sorting,
      columnFilters,
      rowSelection,
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: (row, columnId, filterValue) => {
      const searchableFields = searchableColumns || [];
      return searchableFields.some(field => {
        const value = row.getValue(field);
        return value?.toString().toLowerCase().includes(filterValue.toLowerCase());
      });
    },
  })

  useImperativeHandle(ref, () => ({
    getCurrentPageData: () => {
      return table.getRowModel().rows.map(row => row.original);
    },
    getSelectedData: () => {
      return table
        .getFilteredRowModel()
        .rows.filter(row => row.getIsSelected())
        .map(row => row.original);
    },
    getFilteredData: () => {
      return table.getFilteredRowModel().rows.map(row => row.original);
    }
  }));

  // Keep the latest onSelectionChange in a ref so the effect below can
  // call it without listing it as a dep — parents often pass an inline
  // arrow function which would otherwise change every render and re-fire
  // the effect on every render, defeating the rowSelection-based gating.
  const onSelectionChangeRef = React.useRef(onSelectionChange);
  React.useEffect(() => {
    onSelectionChangeRef.current = onSelectionChange;
  });

  // The `rowSelection` useState above is what react-table mutates when a
  // row is checked, so depending on it is the right signal — and it's a
  // simple identifier the linter can statically verify.
  React.useEffect(() => {
    const selectedCount = table.getFilteredSelectedRowModel().rows.length;
    onSelectionChangeRef.current?.(selectedCount);
  }, [rowSelection, table]);

  return (
    <div className="space-y-4">
      {/* Replace multiple search boxes with a single search box */}
      <div className="relative w-full md:w-[400px]">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, phone, or any field..."
          value={globalFilter ?? ""}
          onChange={(event) => setGlobalFilter(event.target.value)}
          className="pl-10 pr-4 py-2 h-10 w-full bg-background border border-input rounded-md focus:ring-2 focus:ring-offset-2 focus:ring-primary"
        />
      </div>

      {/* Add selection info */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} of{" "}
          {table.getFilteredRowModel().rows.length} row(s) selected
        </div>
        {table.getFilteredSelectedRowModel().rows.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.toggleAllRowsSelected(false)}
          >
            Clear selection
          </Button>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="hover:bg-gray-50"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  No results found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">Rows per page</p>
          <Select
            value={`${table.getState().pagination.pageSize}`}
            onValueChange={(value) => {
              table.setPageSize(Number(value))
            }}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue placeholder={table.getState().pagination.pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {pageSizeOptions.map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-6 lg:space-x-8">
          <div className="flex w-[100px] items-center justify-center text-sm font-medium">
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {table.getPageCount()}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="h-8 w-8 p-0"
            >
              <span className="sr-only">Go to previous page</span>
              ←
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="h-8 w-8 p-0"
            >
              <span className="sr-only">Go to next page</span>
              →
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
})

DataTable.displayName = "DataTable";

export { DataTable };
