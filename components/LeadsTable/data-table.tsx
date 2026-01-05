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

  // Extract unique statuses for the dropdown
  const statuses = React.useMemo(() => {
    const uniqueStatuses = new Set<string>();
    data.forEach((item: any) => {
      if (item.status) uniqueStatuses.add(item.status);
    });
    return Array.from(uniqueStatuses);
  }, [data]);

  // Logic: Filtered Data based on user input
  const filteredData = React.useMemo(() => {
    let filtered = [...data];

    if (dateRange?.from || dateRange?.to) {
      filtered = filtered.filter((item: any) => {
        const createdAt = new Date(item.createdAt);
        const createdAtDateOnly = new Date(createdAt.getFullYear(), createdAt.getMonth(), createdAt.getDate());
        const fromDate = dateRange.from ? new Date(dateRange.from.getFullYear(), dateRange.from.getMonth(), dateRange.from.getDate()) : new Date(0);
        const toDate = dateRange.to ? new Date(dateRange.to.getFullYear(), dateRange.to.getMonth(), dateRange.to.getDate()) : new Date(8640000000000000);
        return createdAtDateOnly >= fromDate && createdAtDateOnly <= toDate;
      });
    }

    if (globalFilter) {
      const searchTerm = globalFilter.toLowerCase();
      filtered = filtered.filter((item: any) => {
        const leadId = String(item.lead_id).toLowerCase();
        const customerName = String(item.customerName).toLowerCase();
        return leadId.includes(searchTerm) || customerName.includes(searchTerm);
      });
    }

    if (statusFilter && statusFilter !== "status") {
      filtered = filtered.filter((item: any) => item.status === statusFilter);
    }

    return filtered;
  }, [data, dateRange, globalFilter, statusFilter]);

  // Stats for the Dark Cards
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
    if (filteredData.length === 0) return;
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
      const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.setAttribute("download", `leads_export_${format(new Date(), "yyyy-MM-dd")}.csv`);
      link.click();
    } catch (e) { console.error(e); }
  };

  return (
    <div className="space-y-6 text-zinc-100 p-2">
      
      {/* --- STATS SECTION (DARK THEME) --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-zinc-900 border-zinc-800 border-l-4 border-l-zinc-500 shadow-lg">
          <CardContent className="flex items-center p-5">
            <div className="bg-zinc-800 p-3 rounded-full mr-4">
              <Users className="h-5 w-5 text-zinc-400" />
            </div>
            <div>
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-tighter">Total Results</p>
              <h3 className="text-2xl font-bold">{stats.all}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800 border-l-4 border-l-blue-600 shadow-lg">
          <CardContent className="flex items-center p-5">
            <div className="bg-blue-900/20 p-3 rounded-full mr-4">
              <Sparkles className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-tighter">Fresh Leads</p>
              <h3 className="text-2xl font-bold text-blue-500">{stats.fresh}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800 border-l-4 border-l-emerald-600 shadow-lg">
          <CardContent className="flex items-center p-5">
            <div className="bg-emerald-900/20 p-3 rounded-full mr-4">
              <Activity className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-tighter">Live Leads</p>
              <h3 className="text-2xl font-bold text-emerald-500">{stats.live}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* --- FILTERS BAR (DARK THEME) --- */}
      <div className="flex items-center py-4 gap-4 flex-wrap bg-zinc-900 p-4 rounded-xl border border-zinc-800 shadow-md">
        <Button 
          variant="outline" 
          onClick={exportToExcel} 
          className="bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700 hover:text-white"
        >
          <Download className="h-4 w-4 mr-2" /> Export
        </Button>

        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input
            placeholder="Search leads..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-10 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-zinc-700"
          />
        </div>

        <Select value={statusFilter || "status"} onValueChange={(v) => setStatusFilter(v === "status" ? "" : v)}>
          <SelectTrigger className="w-[180px] bg-zinc-800 border-zinc-700 text-zinc-200">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-200">
            <SelectItem value="status">All Statuses</SelectItem>
            {statuses.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Popover open={isDatePopoverOpen} onOpenChange={setIsDatePopoverOpen}>
          <PopoverTrigger asChild>
            <Button 
              variant="outline" 
              className={cn(
                "w-[280px] justify-start text-left font-normal bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700",
                !dateRange && "text-zinc-500"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange?.from ? (
                dateRange.to ? `${format(dateRange.from, "PP")} - ${format(dateRange.to, "PP")}` : format(dateRange.from, "PP")
              ) : "Filter by date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 bg-zinc-900 border-zinc-800" align="start">
            <Calendar 
              mode="range" 
              selected={dateRange} 
              onSelect={(r) => { setDateRange(r); if (r?.from && r?.to) setIsDatePopoverOpen(false); }} 
              numberOfMonths={2} 
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* --- DATA TABLE (DARK THEME) --- */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-950 shadow-2xl overflow-hidden">
        <Table>
          <TableHeader className="bg-zinc-900/50">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="border-zinc-800 hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="text-zinc-400 font-bold h-12">
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className="border-zinc-800 hover:bg-zinc-900/50 transition-colors">
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="p-4 text-zinc-300">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-32 text-center text-zinc-600">
                  No data found for the selected filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* --- PAGINATION (DARK THEME) --- */}
      <div className="flex items-center justify-between py-2 px-2">
        <div className="text-sm text-zinc-500">
          Showing <span className="text-zinc-200 font-medium">{table.getRowModel().rows.length}</span> results
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => table.previousPage()} 
            disabled={!table.getCanPreviousPage()}
            className="bg-zinc-900 border-zinc-800 text-zinc-300 disabled:opacity-20 hover:bg-zinc-800"
          >
            Previous
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => table.nextPage()} 
            disabled={!table.getCanNextPage()}
            className="bg-zinc-900 border-zinc-800 text-zinc-300 disabled:opacity-20 hover:bg-zinc-800"
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}