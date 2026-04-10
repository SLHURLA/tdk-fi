"use client";
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Package, Trash2, PlusCircle, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdditionalItemsList, AreaType } from "@prisma/client";

interface ProvidedItem {
  id: string;
  area: string;
  brand: string;
  model: string;
  remark: string;
  payInCash: number;
  payInOnline: number;
  gst: number;
  totalAmount?: number;
}

interface PriceBreakdownProps {
  priceBreakdown: ProvidedItem[];
  leadId: number;
  closedLead: boolean;
  onDataUpdate: () => void;
}

const PriceBreakdown = ({
  priceBreakdown: initialPriceBreakdown,
  closedLead,
  leadId,
  onDataUpdate,
}: PriceBreakdownProps) => {
  const [priceBreakdown, setPriceBreakdown] = useState(initialPriceBreakdown);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"main" | "additional">("main");

  // Form state
  const [areaType, setAreaType] = useState<string>("");
  const [totalAmount, setTotalAmount] = useState<number | "">("");
  const [bankPayments, setBankPayments] = useState<number | "">("");
  const [cashPayments, setCashPayments] = useState<number | "">("");
  const [gstPercentage, setGstPercentage] = useState<number | "">(18);
  const [gstAmount, setGstAmount] = useState<number | "">("");
  const [brand, setBrand] = useState<string>("");
  const [model, setModel] = useState<string>("");
  const [remark, setRemark] = useState<string>("");
  const [lastEditedGstField, setLastEditedGstField] = useState<
    "percentage" | "amount" | null
  >("percentage");

  /* ================= PARTICULARS ================= */
  const mainParticulars = Object.values(AreaType).filter(
    (area) =>
      !["Counter_top", "Appliances", "Sink", "Installation"].includes(area)
  );

  const additionalParticulars = Object.values(AdditionalItemsList);

  const currentParticulars =
    activeTab === "main" ? mainParticulars : additionalParticulars;

  /* ================= GST CALCULATION - INCLUSIVE ================= */
  // useEffect to handle GST percentage changes
  useEffect(() => {
    if (lastEditedGstField === "percentage" && gstPercentage !== "") {
      const bank = Number(bankPayments) || 0;
      if (bank <= 0) {
        setGstAmount(0);
        return;
      }

      const pct = Number(gstPercentage);
      // INCLUSIVE: GST Amount = Bank × (GST% ÷ (100 + GST%))
      const gst = bank * (pct / (100 + pct));
      setGstAmount(Number(gst.toFixed(2)));
    }
  }, [gstPercentage, bankPayments, lastEditedGstField]);

  // useEffect to handle GST amount changes
  useEffect(() => {
    if (lastEditedGstField === "amount" && gstAmount !== "") {
      const bank = Number(bankPayments) || 0;
      const amt = Number(gstAmount);

      if (bank <= 0 || amt <= 0) {
        setGstPercentage(0);
        return;
      }

      // INCLUSIVE: GST% = (GST Amount ÷ (Bank - GST Amount)) × 100
      const baseAmount = bank - amt;
      if (baseAmount <= 0) {
        setGstPercentage(0);
        return;
      }

      const pct = (amt / baseAmount) * 100;
      setGstPercentage(Number(pct.toFixed(2)));
    }
  }, [gstAmount, bankPayments, lastEditedGstField]);

  /* ================= PAYMENT HANDLERS ================= */

  // Handle cash payment change
  const handleCashChange = (value: number | "") => {
    setCashPayments(value);

    if (totalAmount !== "" && value !== "") {
      const bank = Number(totalAmount) - Number(value);
      const safeBank = bank >= 0 ? bank : 0;
      setBankPayments(safeBank);

      // Recalculate GST if field was previously edited
      if (lastEditedGstField === "percentage" && gstPercentage !== "") {
        const pct = Number(gstPercentage);
        const gst = safeBank * (pct / (100 + pct));
        setGstAmount(Number(gst.toFixed(2)));
      } else if (lastEditedGstField === "amount" && gstAmount !== "") {
        const amt = Number(gstAmount);
        if (safeBank > amt) {
          const baseAmount = safeBank - amt;
          const pct = (amt / baseAmount) * 100;
          setGstPercentage(Number(pct.toFixed(2)));
        }
      }
    } else if (value === "") {
      setBankPayments(totalAmount);
    }
  };

  // Handle bank payment change
  const handleBankChange = (value: number | "") => {
    setBankPayments(value);

    if (totalAmount !== "" && value !== "") {
      const cash = Number(totalAmount) - Number(value);
      setCashPayments(cash >= 0 ? cash : 0);

      // Recalculate GST if field was previously edited
      if (lastEditedGstField === "percentage" && gstPercentage !== "") {
        const pct = Number(gstPercentage);
        const bank = Number(value);
        const gst = bank * (pct / (100 + pct));
        setGstAmount(Number(gst.toFixed(2)));
      } else if (lastEditedGstField === "amount" && gstAmount !== "") {
        const amt = Number(gstAmount);
        const bank = Number(value);
        if (bank > amt) {
          const baseAmount = bank - amt;
          const pct = (amt / baseAmount) * 100;
          setGstPercentage(Number(pct.toFixed(2)));
        }
      }
    } else if (value === "") {
      setCashPayments(totalAmount);
    }
  };

  // Handle total amount change
  const handleTotalChange = (value: number | "") => {
    setTotalAmount(value);

    if (value === "") {
      setBankPayments("");
      setCashPayments("");
      setGstAmount(0);
      return;
    }

    const total = Number(value);

    // Maintain split ratio if both payments are set
    if (bankPayments !== "" && cashPayments !== "") {
      const prevTotal = Number(bankPayments) + Number(cashPayments);

      if (prevTotal > 0) {
        const newBank = (Number(bankPayments) / prevTotal) * total;
        const newCash = total - newBank;

        const roundedBank = Number(newBank.toFixed(2));
        setBankPayments(roundedBank);
        setCashPayments(Number(newCash.toFixed(2)));

        // Recalculate GST based on new bank amount
        if (lastEditedGstField === "percentage" && gstPercentage !== "") {
          const pct = Number(gstPercentage);
          const gst = roundedBank * (pct / (100 + pct));
          setGstAmount(Number(gst.toFixed(2)));
        } else if (lastEditedGstField === "amount" && gstAmount !== "") {
          const amt = Number(gstAmount);
          if (roundedBank > amt) {
            const baseAmount = roundedBank - amt;
            const pct = (amt / baseAmount) * 100;
            setGstPercentage(Number(pct.toFixed(2)));
          }
        }
      } else {
        setBankPayments(total);
        setCashPayments(0);
      }
    } else if (bankPayments !== "") {
      const bank = Number(bankPayments);
      if (bank > total) {
        setBankPayments(total);
        setCashPayments(0);
      } else {
        setCashPayments(total - bank);
      }
    } else if (cashPayments !== "") {
      const cash = Number(cashPayments);
      if (cash > total) {
        setCashPayments(total);
        setBankPayments(0);
      } else {
        setBankPayments(total - cash);
      }
    } else {
      setBankPayments(total);
      setCashPayments(0);
    }
  };

  /* ================= GST INPUT HANDLERS ================= */

  const handleGstPercentageChange = (value: number | "") => {
    setGstPercentage(value);
    setLastEditedGstField("percentage");
  };

  const handleGstAmountChange = (value: number | "") => {
    setGstAmount(value);
    setLastEditedGstField("amount");
  };

  /* ================= DELETE HANDLERS ================= */

  const handleDelete = async (itemId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/setProvidedItems", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ itemId, leadId }),
      });

      if (!response.ok) throw new Error("Failed to delete item");

      onDataUpdate();
      setPriceBreakdown((prevItems) =>
        prevItems.filter((item) => item.id !== itemId)
      );

      toast({
        title: "Success",
        description: "Item deleted successfully.",
        variant: "default",
      });
    } catch (error) {
      console.error("Error deleting item:", error);
      toast({
        title: "Error",
        description: "Failed to delete item. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const confirmDelete = (itemId: string) => {
    setItemToDelete(itemId);
    setIsDialogOpen(true);
  };

  const handleConfirm = () => {
    if (itemToDelete) handleDelete(itemToDelete);
    setIsDialogOpen(false);
    setItemToDelete(null);
  };

  const handleCancel = () => {
    setIsDialogOpen(false);
    setItemToDelete(null);
  };

  /* ================= VALIDATION ================= */

  const validateAmounts = (): boolean => {
    const bank = Number(bankPayments) || 0;
    const cash = Number(cashPayments) || 0;
    const total = Number(totalAmount) || 0;

    if (!total) {
      toast({
        variant: "destructive",
        title: "Missing Total Amount",
        description: "Please enter the total amount.",
      });
      return false;
    }

    if (Math.abs(bank + cash - total) > 0.01) {
      toast({
        variant: "destructive",
        title: "Invalid Amounts",
        description:
          "The sum of bank and cash payments must equal the total amount.",
      });
      return false;
    }

    if (bank + cash === 0) {
      toast({
        variant: "destructive",
        title: "Missing Payment Information",
        description: "Please enter at least one payment method amount.",
      });
      return false;
    }

    return true;
  };

  /* ================= ADD ITEM ================= */

  const handleAddProvidedItem = async () => {
    if (!areaType) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please select an area type.",
      });
      return;
    }

    if (!validateAmounts()) {
      return;
    }

    const payInBankValue = Number(bankPayments) || 0;
    const payInCashValue = Number(cashPayments) || 0;
    const gstValue = Number(gstAmount) || 0;
    setIsLoading(true);
    try {
      const response = await fetch("/api/setProvidedItem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: Number(leadId),
          area: areaType,
          brand,
          model,
          remark,
          payInCash: payInCashValue,
          payInOnline: payInBankValue,
          gst: gstValue,
        }),
      });

      const responseData = await response.json();

      if (!response.ok || !responseData.newItem) {
        throw new Error("Failed to add item");
      }

      onDataUpdate();

      const newItemWithTotal = {
        ...responseData.newItem,
        totalAmount: payInCashValue + payInBankValue,
      };

      setPriceBreakdown((prevItems) => [...prevItems, newItemWithTotal]);
      handleClear();
      setIsAddDialogOpen(false);

      toast({
        title: "Success",
        description: "Item added successfully. (GST is inclusive of bank payment)",
        variant: "default",
      });
    } catch (error) {
      console.error("Error adding item:", error);
      toast({
        title: "Error",
        description: "Failed to add item. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  /* ================= EDIT ITEM ================= */

  const handleEditItem = (item: ProvidedItem) => {
    setEditingItemId(item.id);
    setAreaType(item.area);
    const totalAmt = (item.payInCash || 0) + (item.payInOnline || 0);
    const bankPayment = item.payInOnline || 0;

    setTotalAmount(totalAmt);
    setBankPayments(bankPayment);
    setCashPayments(item.payInCash || 0);
    setGstAmount(item.gst || 0);

    // Calculate GST percentage from GST amount using INCLUSIVE formula
    if (bankPayment > 0 && item.gst > 0) {
      const baseAmount = bankPayment - item.gst;
      if (baseAmount > 0) {
        const calculatedPercentage = (item.gst / baseAmount) * 100;
        setGstPercentage(Number(calculatedPercentage.toFixed(2)));
      } else {
        setGstPercentage(18);  // Default to 18%
      }
    } else {
      setGstPercentage(18);  // Default to 18%
    }

    setBrand(item.brand || "");
    setModel(item.model || "");
    setRemark(item.remark || "");
    setIsEditDialogOpen(true);
    setLastEditedGstField("percentage");
  };

  const handleUpdateProvidedItem = async () => {
    if (!areaType) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please select an area type.",
      });
      return;
    }

    if (!validateAmounts()) {
      return;
    }

    const payInBankValue = Number(bankPayments) || 0;
    const payInCashValue = Number(cashPayments) || 0;
    const gstValue = Number(gstAmount) || 0;
    setIsLoading(true);
    try {
      const response = await fetch("/api/setProvidedItem", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: Number(leadId),
          itemId: editingItemId,
          area: areaType,
          brand,
          model,
          remark,
          payInCash: payInCashValue,
          payInOnline: payInBankValue,
          gst: gstValue,
        }),
      });

      const responseData = await response.json();

      if (!response.ok || !responseData.success) {
        throw new Error("Failed to update item");
      }

      onDataUpdate();

      setPriceBreakdown((prevItems) =>
        prevItems.map((item) =>
          item.id === editingItemId
            ? {
                ...item,
                area: areaType,
                brand,
                model,
                remark,
                payInCash: payInCashValue,
                payInOnline: payInBankValue,
                gst: gstValue,
                totalAmount: payInCashValue + payInBankValue,
              }
            : item
        )
      );

      handleClear();
      setIsEditDialogOpen(false);
      setEditingItemId(null);

      toast({
        title: "Success",
        description: "Item updated successfully. (GST is inclusive of bank payment)",
        variant: "default",
      });
    } catch (error) {
      console.error("Error updating item:", error);
      toast({
        title: "Error",
        description: "Failed to update item. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setAreaType("");
    setTotalAmount("");
    setBankPayments("");
    setCashPayments("");
    setGstPercentage(18);  // Default to 18%
    setGstAmount("");
    setBrand("");
    setModel("");
    setRemark("");
    setLastEditedGstField("percentage");  // Set to percentage by default
  };

  return (
    <Card className="lg:p-4 shadow-md rounded-lg h-[443px] overflow-y-scroll">
      <CardHeader>
        <CardTitle className="flex items-center font-bold text-2xl gap-2">
          <Package /> Booked Items
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="ml-auto flex items-center gap-2"
                disabled={closedLead || isLoading}
              >
                <PlusCircle className="w-4 h-4" /> Book Item
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[550px]">
              <DialogHeader>
                <DialogTitle>Book an Item</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                {/* Tabs for main/additional items */}
                <Tabs
                  value={activeTab}
                  onValueChange={(value) =>
                    setActiveTab(value as "main" | "additional")
                  }
                  className="mb-4"
                >
                  <TabsList className="grid grid-cols-2">
                    <TabsTrigger value="main">Main Items</TabsTrigger>
                    <TabsTrigger value="additional">
                      Additional Items
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                <div className="space-y-2">
                  <Label htmlFor="areaType">Particulars</Label>
                  <Select value={areaType} onValueChange={setAreaType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select item" />
                    </SelectTrigger>
                    <SelectContent>
                      {currentParticulars.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="totalAmount">Total Amount (₹)</Label>
                  <Input
                    id="totalAmount"
                    type="number"
                    placeholder="0.00"
                    value={totalAmount}
                    onChange={(e) =>
                      handleTotalChange(Number(e.target.value) || "")
                    }
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bankPayments">Bank Payments (₹)</Label>
                    <Input
                      id="bankPayments"
                      type="number"
                      placeholder="0.00"
                      value={bankPayments}
                      onChange={(e) =>
                        handleBankChange(Number(e.target.value) || "")
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cashPayments">Cash Payments (₹)</Label>
                    <Input
                      id="cashPayments"
                      type="number"
                      placeholder="0.00"
                      value={cashPayments}
                      onChange={(e) =>
                        handleCashChange(Number(e.target.value) || "")
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="gstPercentage">GST Percentage (%)</Label>
                    <Input
                      id="gstPercentage"
                      type="number"
                      placeholder="0.00"
                      value={gstPercentage}
                      onChange={(e) =>
                        handleGstPercentageChange(Number(e.target.value) || "")
                      }
                    />
                    <p className="text-xs text-blue-600 font-semibold">
                      GST is inclusive of bank payment
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gstAmount">GST Amount (₹)</Label>
                    <Input
                      id="gstAmount"
                      type="number"
                      placeholder="0.00"
                      value={gstAmount}
                      onChange={(e) =>
                        handleGstAmountChange(Number(e.target.value) || "")
                      }
                    />
                    <p className="text-xs text-blue-600 font-semibold">
                      Calculated: ₹{Number(gstAmount || 0).toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="brand">Brand</Label>
                    <Input
                      id="brand"
                      placeholder="Enter brand name"
                      value={brand}
                      onChange={(e) => setBrand(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="model">Model Name</Label>
                    <Input
                      id="model"
                      placeholder="Enter model name"
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="remark">Remark</Label>
                  <Input
                    id="remark"
                    placeholder="Add any additional notes"
                    value={remark}
                    onChange={(e) => setRemark(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={handleClear}>
                  Clear
                </Button>
                <Button disabled={isLoading} onClick={handleAddProvidedItem}>
                  Add Item
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableCaption>
            {priceBreakdown.length > 0
              ? "A detailed breakdown of prices and items."
              : "No provided items have been added yet."}
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="p-4">Area</TableHead>
              <TableHead className="p-4">Total Amount (₹)</TableHead>
              <TableHead className="p-4">Bank Payments (₹)</TableHead>
              <TableHead className="p-4">Cash Payments (₹)</TableHead>
              <TableHead className="p-4">GST (₹)</TableHead>
              <TableHead className="p-4">Brand</TableHead>
              <TableHead className="p-4">Model</TableHead>
              <TableHead className="p-4">Remark</TableHead>
              <TableHead className="p-4">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {priceBreakdown.length > 0 ? (
              priceBreakdown.map((item, index) => (
                <TableRow key={item.id || index}>
                  <TableCell className="p-4">{item.area}</TableCell>
                  <TableCell className="p-4">
                    ₹
                    {(
                      (item.payInCash || 0) + (item.payInOnline || 0)
                    ).toLocaleString()}
                  </TableCell>
                  <TableCell className="p-4">
                    ₹{(item.payInOnline || 0).toLocaleString()}
                  </TableCell>
                  <TableCell className="p-4">
                    ₹{(item.payInCash || 0).toLocaleString()}
                  </TableCell>
                  <TableCell className="p-4">
                    ₹{(item.gst || 0).toLocaleString()}
                  </TableCell>
                  <TableCell className="p-4">{item.brand || "-"}</TableCell>
                  <TableCell className="p-4">{item.model || "-"}</TableCell>
                  <TableCell className="p-4">{item.remark || "-"}</TableCell>
                  <TableCell className="p-4 flex items-center space-x-2">
                    <button
                      onClick={() => handleEditItem(item)}
                      className="text-blue-500 hover:text-blue-700"
                      disabled={closedLead || isLoading}
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => confirmDelete(item.id)}
                      className="text-red-500 hover:text-red-700"
                      disabled={closedLead || isLoading}
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-4">
                  No items have been booked yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Edit Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="editAreaType">Area Type</Label>
              <Select value={areaType} onValueChange={setAreaType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Area Type" />
                </SelectTrigger>
                <SelectContent>
                  {mainParticulars.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="editTotalAmount">Total Amount (₹)</Label>
              <Input
                id="editTotalAmount"
                type="number"
                placeholder="0.00"
                value={totalAmount}
                onChange={(e) =>
                  handleTotalChange(Number(e.target.value) || "")
                }
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editBankPayments">Bank Payments (₹)</Label>
                <Input
                  id="editBankPayments"
                  type="number"
                  placeholder="0.00"
                  value={bankPayments}
                  onChange={(e) =>
                    handleBankChange(Number(e.target.value) || "")
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editCashPayments">Cash Payments (₹)</Label>
                <Input
                  id="editCashPayments"
                  type="number"
                  placeholder="0.00"
                  value={cashPayments}
                  onChange={(e) =>
                    handleCashChange(Number(e.target.value) || "")
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editGstPercentage">GST Percentage (%)</Label>
                <Input
                  id="editGstPercentage"
                  type="number"
                  placeholder="0.00"
                  value={gstPercentage}
                  onChange={(e) =>
                    handleGstPercentageChange(Number(e.target.value) || "")
                  }
                />
                <p className="text-xs text-blue-600 font-semibold">
                  GST is inclusive of bank payment
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="editGstAmount">GST Amount (₹)</Label>
                <Input
                  id="editGstAmount"
                  type="number"
                  placeholder="0.00"
                  value={gstAmount}
                  onChange={(e) =>
                    handleGstAmountChange(Number(e.target.value) || "")
                  }
                />
                <p className="text-xs text-blue-600 font-semibold">
                  Calculated: ₹{Number(gstAmount || 0).toFixed(2)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editBrand">Brand</Label>
                <Input
                  id="editBrand"
                  placeholder="Enter brand name"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editModel">Model</Label>
                <Input
                  id="editModel"
                  placeholder="Enter model name"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="editRemark">Remark</Label>
              <Input
                id="editRemark"
                placeholder="Add any additional notes"
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => {
                handleClear();
                setIsEditDialogOpen(false);
                setEditingItemId(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdateProvidedItem}>Update Item</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              item.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancel}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default PriceBreakdown;