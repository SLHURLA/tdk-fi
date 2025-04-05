"use client";

import * as React from "react";
import {
  ColumnDef,
  SortingState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Download } from "lucide-react";

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

interface Vendor {
  id: number;
  name: string;
  mobileNo: string;
  address?: string;
  city: string;
  TotalCharge: number;
  GivenCharge: number;
}

interface DataTableProps<TData> {
  columns: ColumnDef<TData, any>[];
  data: TData[];
  userRole: "STORE_MANAGER" | "ADMIN" | "SUPER_HEAD";
}

export function DataTable<TData extends Vendor>({
  columns,
  data,
  userRole,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [cityFilter, setCityFilter] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState<string>("");

  // Filter vendors based on role, city selection, and search query
  const filteredData = React.useMemo(() => {
    let result = data;

    // Apply city filter if not "all"
    if (cityFilter !== "all") {
      result = result.filter((vendor) => vendor.city === cityFilter);
    }

    // Search filter (matches name, mobileNo, and address)
    if (searchQuery) {
      result = result.filter(
        (vendor) =>
          vendor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          vendor.mobileNo.includes(searchQuery) ||
          vendor.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          false
      );
    }

    return result;
  }, [data, cityFilter, searchQuery]);

  // Extract unique cities for filtering
  const uniqueCities = React.useMemo(
    () => Array.from(new Set(data.map((vendor) => vendor.city))).sort(),
    [data]
  );

  const table = useReactTable({
    data: filteredData,
    columns,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: {
      sorting,
    },
  });

  const exportToExcel = () => {
    if (filteredData.length === 0) {
      alert("No data to export");
      return;
    }

    try {
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

      // Create basic vendor info headers
      const headers = [
        "Vendor ID",
        "Vendor Name",
        "Mobile Number",
        "City",
        "Total Charge",
        "Given Charge",
        "Balance",
      ];

      // Create vendor data rows
      const rows = filteredData.map((vendor: any) => {
        const balance = vendor.TotalCharge - vendor.GivenCharge;

        return [
          escapeCSV(vendor.id),
          escapeCSV(vendor.name),
          escapeCSV(vendor.mobileNo),
          escapeCSV(vendor.city),
          escapeCSV(vendor.TotalCharge),
          escapeCSV(vendor.GivenCharge),
          escapeCSV(balance),
        ];
      });

      // Combine headers and rows for vendors
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

      // Create filename with city filter if applied
      let filename = `vendors_export`;
      if (cityFilter !== "all") {
        filename += `_${cityFilter}`;
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
    <div className="w-full">
      <div className="flex items-center py-4 gap-4">
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
        <Input
          placeholder="Search Vendor..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-xs"
        />

        {/* City Filter (Only for ADMIN & SUPER_HEAD) */}
        {userRole !== "STORE_MANAGER" && (
          <Select value={cityFilter} onValueChange={setCityFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by City" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>City</SelectLabel>
                <SelectItem value="all">All Cities</SelectItem>
                {uniqueCities.map((city) => (
                  <SelectItem key={city} value={city}>
                    {city}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Vendor Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="!py-2">
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
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="!py-4">
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
                  No results found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <p className="px-2 py-2 text-sm">List of all Vendors</p>
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-end space-x-2 py-4">
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
