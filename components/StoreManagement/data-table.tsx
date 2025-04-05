"use client";

import * as React from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { format } from "date-fns";
import { CalendarIcon, Download, Search } from "lucide-react";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

interface Lead {
  id: number;
  lead_id: string;
  store: string;
  customerName: string;
  phoneNo: string;
  contactInfo: string;
  handoverDate: string | null;
  expectedHandoverDate: string | null;
  status: string;
  totalProjectCost: number;
  payInCash: number;
  payInOnline: number;
  createdAt: string;
  updatedAt: string;
  type: string;
  init: boolean;
}

interface DataTableProps<TData> {
  columns: ColumnDef<TData, any>[];
  data: TData[];
}

export function DataTable<TData extends Lead>({
  columns,
  data,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [leadTypeFilter, setLeadTypeFilter] = React.useState<string>("all");
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>({
    from: undefined,
    to: undefined,
  });
  const [globalFilter, setGlobalFilter] = React.useState<string>("");
  const [isDatePopoverOpen, setIsDatePopoverOpen] = React.useState(false);
  // Filter data based on lead type, date range, and global search
  const filteredData = React.useMemo(() => {
    let filtered = [...data]; // Create a copy to avoid mutation

    // Filter by lead type
    if (leadTypeFilter === "fresh") {
      filtered = filtered.filter((row) => !row.init); // Fresh Leads
    } else if (leadTypeFilter === "live") {
      filtered = filtered.filter((row) => row.init); // Live Leads
    }

    // Filter by date range
    if (dateRange?.from || dateRange?.to) {
      filtered = filtered.filter((row) => {
        const createdAt = new Date(row.createdAt);
        const createdAtDateOnly = new Date(
          createdAt.getFullYear(),
          createdAt.getMonth(),
          createdAt.getDate()
        );

        // Provide backup values for fromDate and toDate
        const fromDate = dateRange.from
          ? new Date(
              dateRange.from.getFullYear(),
              dateRange.from.getMonth(),
              dateRange.from.getDate()
            )
          : new Date(0); // Start of Unix time (January 1, 1970)

        const toDate = dateRange.to
          ? new Date(
              dateRange.to.getFullYear(),
              dateRange.to.getMonth(),
              dateRange.to.getDate()
            )
          : new Date(8640000000000000); // Far future date (September 13, 275760)

        return createdAtDateOnly >= fromDate && createdAtDateOnly <= toDate;
      });
    }

    // Filter by global search term
    if (globalFilter) {
      const searchTerm = globalFilter.toLowerCase();
      filtered = filtered.filter((row: any) => {
        const leadId = String(row.lead_id).toLowerCase();
        const customerName = String(row.customerName).toLowerCase();
        return leadId.includes(searchTerm) || customerName.includes(searchTerm);
      });
    }

    return filtered;
  }, [data, leadTypeFilter, dateRange, globalFilter]);

  const handleDateSelect = (range: DateRange | undefined) => {
    setDateRange(range);

    // Check if both 'from' and 'to' dates are selected
    if (range?.from && range.to) {
      setIsDatePopoverOpen(false);
    }
  };

  const table = useReactTable({
    data: filteredData, // Use the filtered data
    columns,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
    },
  });

  const exportToExcel = () => {
    if (filteredData.length === 0) {
      alert("No data to export");
      return;
    }

    try {
      // Get all possible keys from the first item in the data
      const firstItem = filteredData[0];
      const allKeys = Object.keys(firstItem || {}).filter(
        (key) => key !== "user" && key !== "_count"
      ); // Filter out the object fields

      // Function to escape special characters in CSV
      const escapeCSV = (value: any) => {
        if (value === null || value === undefined) return "";
        let strValue = String(value);

        // Check if the value contains commas, quotes, or newlines
        if (
          strValue.includes(",") ||
          strValue.includes('"') ||
          strValue.includes("\n")
        ) {
          // Escape quotes by doubling them and wrap in quotes
          strValue = strValue.replace(/"/g, '""');
          return `"${strValue}"`;
        }
        return strValue;
      };

      // Create headers row
      const headers = [
        ...allKeys.filter((key) => key !== "createdAt"), // Exclude the original createdAt
        "Day", // Add new columns for day, month, year, and full date
        "Month",
        "Year",
        "Full_Date", // Use underscore to avoid comma issues
      ];

      // Create data rows with all fields
      const rows = filteredData.map((row: any) => {
        // Extract and format the date components
        const createdAt = new Date(row.createdAt);
        const day = escapeCSV(createdAt.getDate().toString());
        const month = escapeCSV(
          createdAt.toLocaleString("default", { month: "long" })
        ); // Full month name
        const year = escapeCSV(createdAt.getFullYear().toString());
        // Ensure full date is properly quoted to prevent splitting
        const fullDate = escapeCSV(format(createdAt, "LLL dd, yyyy"));

        // Exclude the original createdAt and add the new date components
        const rowData = allKeys
          .filter((key) => key !== "createdAt")
          .map((key) => escapeCSV(row[key]));

        return [...rowData, day, month, year, fullDate];
      });

      // Combine headers and rows
      const csvContent = [
        headers.join(","),
        ...rows.map((row) => row.join(",")),
      ].join("\n");

      // For Excel to properly recognize the file as CSV, we'll add a BOM at the beginning
      const BOM = "\uFEFF";
      const blob = new Blob([BOM + csvContent], {
        type: "text/csv;charset=utf-8;",
      });

      // Create a download link and trigger a click
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);

      // Add date range and lead type to filename if filters are applied
      let filename = `leads_export`;
      if (leadTypeFilter !== "all") {
        filename += `_${leadTypeFilter}`;
      }
      if (dateRange?.from) {
        filename += `_from_${format(dateRange.from, "yyyy-MM-dd")}`;
        if (dateRange.to) {
          filename += `_to_${format(dateRange.to, "yyyy-MM-dd")}`;
        }
      }
      filename += `.csv`;

      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up the URL object
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting data:", error);
      alert("An error occurred while exporting the data");
    }
  };

  return (
    <div>
      {/* Filters */}
      <div className="flex items-center py-4 gap-4 flex-wrap">
        {/* Download Button */}
        <Button
          variant="outline"
          onClick={exportToExcel}
          className="flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          Export to Excel
        </Button>

        {/* Search Input */}
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search by Customer ID or Customer..."
            value={globalFilter}
            onChange={(event) => setGlobalFilter(event.target.value)}
            className="pl-8 max-w-xs"
          />
        </div>

        {/* Date Range Filter */}
        <Popover open={isDatePopoverOpen} onOpenChange={setIsDatePopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              id="date"
              variant={"outline"}
              className={cn(
                "w-[300px] justify-start text-left font-normal",
                !dateRange && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange?.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, "LLL dd, y")} -{" "}
                    {format(dateRange.to, "LLL dd, y")}
                  </>
                ) : (
                  format(dateRange.from, "LLL dd, y")
                )
              ) : (
                <span>Pick a date range</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={dateRange?.from}
              selected={dateRange}
              onSelect={handleDateSelect}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>

        {/* Lead Type Filter */}
        <Select value={leadTypeFilter} onValueChange={setLeadTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by Lead Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Customer Type</SelectLabel>
              <SelectItem value="all">All Customer</SelectItem>
              <SelectItem value="fresh">Fresh Customer</SelectItem>
              <SelectItem value="live">Live Customer</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="text-left">
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
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="text-left p-4">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          Showing{" "}
          {Math.min(
            table.getState().pagination.pageIndex *
              table.getState().pagination.pageSize +
              1,
            table.getRowModel().rows.length
          )}{" "}
          to{" "}
          {Math.min(
            (table.getState().pagination.pageIndex + 1) *
              table.getState().pagination.pageSize,
            table.getRowModel().rows.length
          )}{" "}
          of {table.getRowModel().rows.length} results
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
