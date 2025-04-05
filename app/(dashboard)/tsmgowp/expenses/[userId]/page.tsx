"use client";
import React, { useEffect, useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useParams } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import useSWR from "swr";
import { CalendarIcon, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { useSession } from "next-auth/react";
import { useIsMobile } from "@/hooks/use-mobile";
import { date } from "zod";

// Define types for the expense data
interface Expense {
  id: string;
  amount: number;
  transactionName: string;
  paymentMethod: "CASH" | "ONLINE";
  transactionDate: string;
  userId: number;
  date: string;
  storeName?: string;
  remark?: string; // Added remark property
}

interface NewExpense {
  amount: string;
  transactionName: string;
  paymentMethod: string;
  date: Date;
  remark: string; // Added remark property
}

interface Store {
  userId: string;
  store: string;
}

// Fetcher function for useSWR
const fetcher = async (url: string) => {
  const response = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) throw new Error("Failed to fetch data");

  const data = await response.json();
  console.log("Data", data);
  return data.item || data.stores; // Return the entire response
};

const StoreExpenses = () => {
  const { userId } = useParams();
  const { data: session } = useSession();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [newExpense, setNewExpense] = useState<NewExpense>({
    amount: "",
    transactionName: "",
    paymentMethod: "",
    date: new Date(),
    remark: "", // Initialize remark as empty string
  });
  const isMobile = useIsMobile();
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<string | null>(null);
  const [currentStoreName, setCurrentStoreName] = useState<string>("");

  // Calculate the start and end dates of the current month
  const currentDate = new Date();
  const startOfMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    1
  );
  const endOfMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    0
  );

  // Filters
  const [transactionNameFilter, setTransactionNameFilter] = useState("");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("");
  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfMonth, // Default to the start of the current month
    to: endOfMonth, // Default to the end of the current month
  });

  // Fetch stores for all users to ensure we have store names
  const { data: storesData } = useSWR("/api/getStores", fetcher);

  // Fetch expenses for the selected store or the current user
  const { data: expensesData } = useSWR(
    selectedStore
      ? `/api/getStoreExp?userId=${selectedStore}`
      : `/api/getStoreExp?userId=${userId}`,
    fetcher
  );
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  // Modify the date range selection logic to auto-close the popover
  const handleDateRangeSelect = (range: DateRange | undefined) => {
    if (range) {
      setDateRange(range);

      // If both from and to dates are selected, close the popover
      if (range.from && range.to) {
        setIsDatePickerOpen(false);
      }
    } else {
      setDateRange({ from: undefined, to: undefined });
    }
  };
  // Update stores when data is fetched
  useEffect(() => {
    if (storesData) {
      setStores(storesData);

      // Find and set current store name
      const currentStoreInfo = storesData.find(
        (store: Store) => store.userId === userId?.toString()
      );

      if (currentStoreInfo) {
        setCurrentStoreName(currentStoreInfo.store);
      } else if (selectedStore) {
        const selectedStoreInfo = storesData.find(
          (store: Store) => store.userId === selectedStore
        );
        if (selectedStoreInfo) {
          setCurrentStoreName(selectedStoreInfo.store);
        }
      }
    }
  }, [storesData, userId, selectedStore]);

  // When store selection changes, update current store name
  useEffect(() => {
    if (selectedStore && stores.length > 0) {
      const selectedStoreInfo = stores.find(
        (store) => store.userId === selectedStore
      );
      if (selectedStoreInfo) {
        setCurrentStoreName(selectedStoreInfo.store);
      }
    } else if (userId && stores.length > 0) {
      const currentStoreInfo = stores.find(
        (store) => store.userId === userId.toString()
      );
      if (currentStoreInfo) {
        setCurrentStoreName(currentStoreInfo.store);
      }
    }
  }, [selectedStore, userId, stores]);

  // Update expenses when data is fetched and add store names - do this after stores are loaded
  useEffect(() => {
    if (expensesData && stores.length > 0) {
      // Map to find store names for each expense
      const expensesWithStoreNames = expensesData.map((expense: Expense) => {
        // First try to find the store by exact userId match
        let storeName = "";

        // Convert expense userId to string to match with store.userId
        const expenseUserId = expense.userId.toString();

        // Find store with matching userId
        const storeInfo = stores.find(
          (store) => store.userId === expenseUserId
        );

        if (storeInfo) {
          storeName = storeInfo.store;
        } else {
          // If no match found and we have a current store name, use that
          storeName = currentStoreName || "No Store Found";
        }

        return {
          ...expense,
          storeName: storeName,
        };
      });

      setExpenses(expensesWithStoreNames);
    }
  }, [expensesData, stores, currentStoreName]);

  // Handle store selection
  const handleStoreSelect = (storeUserId: string) => {
    setSelectedStore(storeUserId);

    // Update current store name when selection changes
    const selectedStoreInfo = stores.find(
      (store) => store.userId === storeUserId
    );
    if (selectedStoreInfo) {
      setCurrentStoreName(selectedStoreInfo.store);
    }
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    confirmExpense();
  };

  // Confirm expense
  const confirmExpense = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/setStoreExpenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: Number(userId),
          amount: parseFloat(newExpense.amount),
          transactionName: newExpense.transactionName,
          paymentMethod: newExpense.paymentMethod,
          date: newExpense.date,
          remark: newExpense.remark, // Include remark in the request
        }),
      });

      if (!response.ok) throw new Error("Failed to add expense");

      const data = await response.json();

      const newExpenseItem: Expense = {
        id: (expenses.length + 1).toString(),
        amount: parseFloat(newExpense.amount),
        transactionName: newExpense.transactionName,
        paymentMethod: newExpense.paymentMethod as "CASH" | "ONLINE",
        transactionDate: newExpense.date.toISOString(),
        date: newExpense.date.toISOString(),
        userId: Number(userId),
        storeName: currentStoreName,
        remark: newExpense.remark, // Include remark in the expense item
      };
      setExpenses([...expenses, newExpenseItem]);
      setNewExpense({
        amount: "",
        transactionName: "",
        paymentMethod: "",
        date: new Date(),
        remark: "", // Reset remark field
      });

      // Show success toast
      toast({
        title: "Expense Added",
        description: "Your expense has been successfully added.",
      });
    } catch (error) {
      console.error("Error adding expense:", error);

      // Show error toast
      toast({
        title: "Error",
        description: "Failed to add expense. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Filtered expenses
  const filteredExpenses = expenses.filter((expense) => {
    const matchesTransactionName = transactionNameFilter
      ? expense.transactionName
          .toLowerCase()
          .includes(transactionNameFilter.toLowerCase())
      : true;

    const matchesPaymentMethod = paymentMethodFilter
      ? expense.paymentMethod === paymentMethodFilter
      : true;

    const matchesDateRange =
      dateRange.from && dateRange.to
        ? new Date(expense.transactionDate) >= dateRange.from &&
          new Date(expense.transactionDate) <=
            new Date(dateRange.to.setHours(23, 59, 59, 999)) // Include the entire "to" date
        : true;

    return matchesTransactionName && matchesPaymentMethod && matchesDateRange;
  });

  // Calculate total expenses
  const totalExpenses = filteredExpenses.reduce(
    (acc, expense) => acc + expense.amount,
    0
  );

  // Export to Excel function
  const exportToExcel = () => {
    if (filteredExpenses.length === 0) {
      toast({
        title: "Export Failed",
        description: "No data to export",
        variant: "destructive",
      });
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

      // Create headers for the CSV
      const headers = [
        "Date",
        "Store Name",
        "Transaction Name",
        "Amount (₹)",
        "Payment Method",
        "Remark", // Add Remark column to CSV export
      ];

      // Create expense data rows
      const rows = filteredExpenses.map((expense) => {
        let dateFormatted;
        try {
          const dateObj = new Date(expense.transactionDate);
          dateFormatted = isNaN(dateObj.getTime())
            ? "Invalid date"
            : format(dateObj, "dd-MM-yyyy");
        } catch (error) {
          dateFormatted = "Invalid date";
        }

        const transactionName =
          expense.transactionName === "BANK_DDN"
            ? "BANK"
            : expense.transactionName === "CASH_DDN"
            ? "CASH"
            : expense.transactionName;

        return [
          escapeCSV(dateFormatted),
          escapeCSV(expense.storeName || currentStoreName), // Use current store as fallback
          escapeCSV(transactionName),
          escapeCSV(expense.amount),
          escapeCSV(expense.paymentMethod),
          escapeCSV(expense.remark || ""), // Include remark in export
        ];
      });

      // Add a total row
      rows.push(["", "", "TOTAL", escapeCSV(totalExpenses), "", ""]);

      // Combine headers and rows
      const csvContent = [
        headers.join(","),
        ...rows.map((row) => row.join(",")),
      ].join("\n");

      // For Excel to properly recognize the file as CSV, add a BOM at the beginning
      const BOM = "\uFEFF";
      const blob = new Blob([BOM + csvContent], {
        type: "text/csv;charset=utf-8;",
      });

      // Create a download link and trigger a click
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);

      // Create filename with date range if applied
      let filename = `expenses_export`;
      if (dateRange.from && dateRange.to) {
        filename += `_${format(dateRange.from, "dd-MM-yyyy")}_to_${format(
          dateRange.to,
          "dd-MM-yyyy"
        )}`;
      }
      if (selectedStore) {
        const selectedStoreName = stores.find(
          (store) => store.userId === selectedStore
        )?.store;
        if (selectedStoreName) {
          filename += `_${selectedStoreName}`;
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

      toast({
        title: "Export Successful",
        description: "Expense data has been exported to Excel",
      });
    } catch (error) {
      console.error("Error exporting data:", error);
      toast({
        title: "Export Failed",
        description: "An error occurred while exporting the data",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="mt-8 w-full">
      <CardHeader>
        <CardTitle>Store Expenses</CardTitle>
        <CardDescription>Manage and track store expenses</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Store Selector for ADMIN and SUPER_HEAD */}
        {(session?.user?.role === "ADMIN" ||
          session?.user?.role === "SUPER_HEAD") && (
          <div className="mb-6">
            <Select onValueChange={handleStoreSelect}>
              <SelectTrigger className="max-w-xs">
                <SelectValue placeholder="Select a store" />
              </SelectTrigger>
              <SelectContent>
                {stores.map((store) => (
                  <SelectItem key={store.userId} value={store.userId}>
                    {store.store}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Total Expenses Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Total Expenses</CardTitle>
            <CardDescription>
              {currentStoreName
                ? `Overall expenses for ${currentStoreName}`
                : "Overall expenses for the store"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{totalExpenses.toLocaleString()}
            </div>
            <Progress
              value={(totalExpenses / 100000) * 100}
              className="h-2 mt-4"
            />
          </CardContent>
        </Card>

        {/* Add Expense Form (Only for STORE_MANAGER) */}
        {session?.user?.role === "STORE_MANAGER" && (
          <AddExpenseForm
            onSubmit={handleSubmit}
            isLoading={isLoading}
            newExpense={newExpense}
            setNewExpense={setNewExpense}
          />
        )}

        {/* Filters and Export Button */}
        <div className="flex items-center gap-4 mb-6 flex-wrap">
          {/* Export Button */}
          <Button
            variant="outline"
            onClick={exportToExcel}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export to Excel
          </Button>

          {/* Transaction Name Filter */}
          <Input
            placeholder="Filter by Transaction Name"
            value={transactionNameFilter}
            onChange={(e) => setTransactionNameFilter(e.target.value)}
            className="max-w-xs"
          />

          {/* Payment Method Filter */}
          <Select
            value={paymentMethodFilter}
            onValueChange={(value) => setPaymentMethodFilter(value)}
          >
            <SelectTrigger className="max-w-xs">
              <SelectValue placeholder="Filter by Payment Method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CASH">Cash</SelectItem>
              <SelectItem value="ONLINE">Bank</SelectItem>
            </SelectContent>
          </Select>

          {/* Date Picker */}
          <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "max-w-xs justify-start text-left font-normal",
                  !dateRange.from && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "dd-MM-yyyy")} -{" "}
                      {format(dateRange.to, "dd-MM-yyyy")}
                    </>
                  ) : (
                    format(dateRange.from, "dd-MM-yyyy")
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
                defaultMonth={dateRange.from}
                selected={dateRange}
                onSelect={handleDateRangeSelect}
                numberOfMonths={isMobile ? 1 : 2}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Expenses Table */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="p-4">Date</TableHead>
              <TableHead className="p-4">Store Name</TableHead>
              <TableHead className="p-4">Transaction Name</TableHead>
              <TableHead className="p-4">Amount</TableHead>
              <TableHead className="p-4">Payment Method</TableHead>
              <TableHead className="p-4">Remark</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredExpenses.map((expense) => (
              <TableRow key={expense.id}>
                <TableCell className="p-4">
                  {expense.transactionDate
                    ? (() => {
                        try {
                          const dateObj = new Date(expense.transactionDate);
                          // Check if the date is valid
                          if (isNaN(dateObj.getTime())) {
                            return "Invalid date";
                          }
                          return format(dateObj, "dd-MM-yyyy");
                        } catch (error) {
                          return "Invalid date";
                        }
                      })()
                    : "No date"}
                </TableCell>
                <TableCell className="p-4">
                  {expense.storeName || currentStoreName || "No Store Found"}
                </TableCell>
                <TableCell className="p-4">
                  {expense.transactionName === "BANK_DDN"
                    ? "BANK"
                    : expense.transactionName === "CASH_DDN"
                    ? "CASH"
                    : expense.transactionName}
                </TableCell>
                <TableCell className="p-4">
                  <Badge variant="outline">
                    ₹{expense.amount.toLocaleString()}
                  </Badge>
                </TableCell>
                <TableCell className="p-4">
                  <Badge variant="secondary">{expense.paymentMethod}</Badge>
                </TableCell>
                <TableCell className="p-4">{expense.remark || "-"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default StoreExpenses;

// AddExpenseForm Component
const AddExpenseForm = ({
  onSubmit,
  isLoading,
  newExpense,
  setNewExpense,
}: {
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
  newExpense: NewExpense;
  setNewExpense: (expense: NewExpense) => void;
}) => {
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Add New Expense</CardTitle>
        <CardDescription>Enter the details of the new expense</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <Input
              type="number"
              placeholder="Amount"
              value={newExpense.amount}
              onChange={(e) =>
                setNewExpense({ ...newExpense, amount: e.target.value })
              }
              required
              disabled={isLoading}
            />
            <Select
              onValueChange={(value) =>
                setNewExpense({ ...newExpense, transactionName: value })
              }
              value={newExpense.transactionName}
              required
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Transaction Name" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SALARY">Salary</SelectItem>
                <SelectItem value="BANK_DDN">Bank</SelectItem>
                <SelectItem value="CASH_DDN">Cash</SelectItem>
                <SelectItem value="LABOUR">Labour</SelectItem>
                <SelectItem value="PANTRY">Pantry</SelectItem>
                <SelectItem value="TRAVEL">Travel</SelectItem>
                <SelectItem value="FOOD">Food</SelectItem>
                <SelectItem value="GIFT">Gift</SelectItem>
                <SelectItem value="FINISHING">Finishing</SelectItem>
                <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                <SelectItem value="STATIONERY">Stationery</SelectItem>
                <SelectItem value="RENT">Rent</SelectItem>
                <SelectItem value="ELECTRICITY">Electricity</SelectItem>
                <SelectItem value="MISCELLANEOUS">Miscellaneous</SelectItem>
              </SelectContent>
            </Select>
            <Select
              onValueChange={(value) =>
                setNewExpense({ ...newExpense, paymentMethod: value })
              }
              value={newExpense.paymentMethod}
              required
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Payment Method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CASH">Cash</SelectItem>
                <SelectItem value="ONLINE">Bank</SelectItem>
              </SelectContent>
            </Select>
            <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {newExpense.date
                    ? format(new Date(newExpense.date), "yyyy-MM-dd")
                    : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent>
                <Calendar
                  mode="single"
                  selected={newExpense.date}
                  onSelect={(date) => {
                    if (date) {
                      setNewExpense({
                        ...newExpense,
                        date, // Store the Date object directly
                      });
                    }
                    setIsDatePickerOpen(false);
                  }}
                  disabled={(date) => date > new Date()}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Add Remark Textarea */}
          <div className="mb-4">
            <Input
              placeholder="Add a remark (optional)"
              value={newExpense.remark}
              onChange={(e: any) =>
                setNewExpense({ ...newExpense, remark: e.target.value })
              }
              disabled={isLoading}
            />
          </div>

          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Adding..." : "Add Expense"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
