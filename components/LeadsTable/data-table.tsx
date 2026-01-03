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
import { 
  CalendarIcon, 
  Download, 
  Search, 
  Filter, 
  Users, 
  Activity, 
  Sparkles 
} from "lucide-react";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
}

export function DataTable<TData, TValue>({
  columns,
  data,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>({
    from: undefined,
    to: undefined,
  });
  const [isDatePopoverOpen, setIsDatePopoverOpen] = React.useState(false);
  const pathname = usePathname();
  const [globalFilter, setGlobalFilter] = React.useState<string>("");
  const [statusFilter, setStatusFilter] = React.useState<string>(
    pathname === "/tsmgowp/leads/processing" ? "INPROGRESS" : ""
  );

  // Extract unique statuses
  const statuses = React.useMemo(() => {
    const uniqueStatuses = new Set<string>();
    data.forEach((item: any) => {
      if (item.status) uniqueStatuses.add(item.status);
    });
    return Array.from(uniqueStatuses);
  }, [data]);

  // CORE LOGIC: Filtered Data based on user input
  const filteredData = React.useMemo(() => {
    let filtered = [...data];

    // Date Range Filter
    if (dateRange?.from || dateRange?.to) {
      filtered = filtered.filter((item: any) => {
        const createdAt = new Date(item.createdAt);
        const createdAtDateOnly = new Date(createdAt.getFullYear(), createdAt.getMonth(), createdAt.getDate());
        const fromDate = dateRange.from ? new Date(dateRange.from.getFullYear(), dateRange.from.getMonth(), dateRange.from.getDate()) : new Date(0);
        const toDate = dateRange.to ? new Date(dateRange.to.getFullYear(), dateRange.to.getMonth(), dateRange.to.getDate()) : new Date(8640000000000000);
        return createdAtDateOnly >= fromDate && createdAtDateOnly <= toDate;
      });
    }

    // Global Search Filter
    if (globalFilter) {
      const searchTerm = globalFilter.toLowerCase();
      filtered = filtered.filter((item: any) => {
        const leadId = String(item.lead_id).toLowerCase();
        const customerName = String(item.customerName).toLowerCase();
        return leadId.includes(searchTerm) || customerName.includes(searchTerm);
      });
    }

    // Status Filter
    if (statusFilter && statusFilter !== "status") {
      filtered = filtered.filter((item: any) => item.status === statusFilter);
    }

    return filtered;
  }, [data, dateRange, globalFilter, statusFilter]);

  // STATS CALCULATION: Recalculates every time filteredData changes
  const stats = React.useMemo(() => {
    return {
      all: filteredData.length,
      fresh: filteredData.filter((item: any) => !item.init).length,
      live: filteredData.filter((item: any) => item.status === "INPROGRESS" || item.status === "WON").length,
    };
  }, [filteredData]);

  const table = useReactTable({
    data: filteredData,
    columns,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    state: { sorting, columnFilters },
  });

  const exportToExcel = () => {
    if (filteredData.length === 0) {
      alert("No data to export");
      return;
    }
    // (CSV Export logic remains the same as provided in your snippet)
    try {
      const firstItem = filteredData[0];
      const allKeys = Object.keys(firstItem || {}).filter((key) => key !== "user" && key !== "_count");
      const escapeCSV = (value: any) => {
        if (value === null || value === undefined) return "";
        let strValue = String(value);
        if (strValue.includes(",") || strValue.includes('"') || strValue.includes("\n")) {
          strValue = strValue.replace(/"/g, '""');
          return `"${strValue}"`;
        }
        return strValue;
      };
      const headers = [...allKeys.filter((key) => key !== "createdAt"), "Day", "Month", "Year", "Full_Date"];
      const rows = filteredData.map((row: any) => {
        const createdAt = new Date(row.createdAt);
        const day = escapeCSV(createdAt.getDate().toString());
        const month = escapeCSV(createdAt.toLocaleString("default", { month: "long" }));
        const year = escapeCSV(createdAt.getFullYear().toString());
        const fullDate = escapeCSV(format(createdAt, "LLL dd, yyyy"));
        const rowData = allKeys.filter((key) => key !== "createdAt").map((key) => escapeCSV(row[key]));
        return [...rowData, day, month, year, fullDate];
      });
      const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
      const BOM = "\uFEFF";
      const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      let filename = `leads_export_${format(new Date(), "yyyy-MM-dd")}.csv`;
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.click();
    } catch (e) { console.error(e); }
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value === "status" ? "" : value);
  };

  const handleDateSelect = (range: DateRange | undefined) => {
    setDateRange(range);
    if (range?.from && range.to) setIsDatePopoverOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* --- DYNAMIC STATS SECTION --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-slate-500 shadow-sm">
          <CardContent className="flex items-center p-4">
            <div className="bg-slate-100 p-3 rounded-full mr-4">
              <Users className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">All (Filtered)</p>
              <h3 className="text-2xl font-bold">{stats.all}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500 shadow-sm">
          <CardContent className="flex items-center p-4">
            <div className="bg-blue-100 p-3 rounded-full mr-4 text-blue-600">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Fresh (Filtered)</p>
              <h3 className="text-2xl font-bold text-blue-700">{stats.fresh}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500 shadow-sm">
          <CardContent className="flex items-center p-4">
            <div className="bg-green-100 p-3 rounded-full mr-4 text-green-600">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Live (Filtered)</p>
              <h3 className="text-2xl font-bold text-green-700">{stats.live}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* --- FILTERS SECTION --- */}
      <div className="flex items-center py-4 gap-4 flex-wrap bg-white p-4 rounded-lg border shadow-sm">
        <Button variant="outline" onClick={exportToExcel} className="flex items-center gap-2">
          <Download className="h-4 w-4" /> Export CSV
        </Button>

        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search leads..."
            value={globalFilter}
            onChange={(event) => setGlobalFilter(event.target.value)}
            className="pl-8"
          />
        </div>

        <Select value={statusFilter || "status"} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-[180px]">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <SelectValue placeholder="Status" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="status">All Statuses</SelectItem>
            {statuses.map((status) => (
              <SelectItem key={status} value={status}>{status}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Popover open={isDatePopoverOpen} onOpenChange={setIsDatePopoverOpen}>
          <PopoverTrigger asChild>
            <Button variant={"outline"} className={cn("w-[300px] justify-start text-left font-normal", !dateRange && "text-muted-foreground")}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange?.from ? (dateRange.to ? `${format(dateRange.from, "LLL dd, y")} - ${format(dateRange.to, "LLL dd, y")}` : format(dateRange.from, "LLL dd, y")) : "Filter by Date Range"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="range" selected={dateRange} onSelect={handleDateSelect} numberOfMonths={2} />
          </PopoverContent>
        </Popover>
      </div>

      {/* --- TABLE SECTION --- */}
      <div className="rounded-md border bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="p-4">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  No customers match your current filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* --- PAGINATION SECTION --- */}
      <div className="flex items-center justify-between py-4">
        <div className="text-sm text-muted-foreground">
          Showing <strong>{table.getRowModel().rows.length}</strong> customers in this view
        </div>
        <div className="space-x-2">
          <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>Previous</Button>
          <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Next</Button>
        </div>
      </div>
    </div>
  );
}