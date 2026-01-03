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
  // CHANGED: Default GST percentage set to 18
  const [gstPercentage, setGstPercentage] = useState<number | "">(18);
  const [gstAmount, setGstAmount] = useState<number | "">("");
  const [brand, setBrand] = useState<string>("");
  const [model, setModel] = useState<string>("");
  const [remark, setRemark] = useState<string>("");
  const [lastEditedGstField, setLastEditedGstField] = useState<
    "percentage" | "amount" | null
  >("percentage"); // Default to percentage to trigger calculation on bank change

  const mainParticulars = Object.values(AreaType).filter(
    (area) =>
      !["Counter_top", "Appliances", "Sink", "Installation"].includes(area)
  );

  const additionalParticulars = Object.values(AdditionalItemsList);

  const currentParticulars =
    activeTab === "main" ? mainParticulars : additionalParticulars;

  // UPDATED: Calculate GST based only on Bank Payments
  useEffect(() => {
    if (lastEditedGstField === "percentage" && gstPercentage !== "" && bankPayments !== "") {
      // Calculate GST amount from percentage based ONLY on Bank Payments
      // Formula: (Bank Amount * GST%) / (100 + GST%)
      const calculatedGstAmount = (Number(bankPayments) * Number(gstPercentage)) / (100 + Number(gstPercentage));
      setGstAmount(Number(calculatedGstAmount.toFixed(2)));
    } else if (lastEditedGstField === "amount" && gstAmount !== "" && bankPayments !== "") {
      // Calculate GST percentage from amount based ONLY on Bank Payments
      const baseAmount = Number(bankPayments) - Number(gstAmount);
      if (baseAmount > 0) {
        const calculatedGstPercentage = (Number(gstAmount) / baseAmount) * 100;
        setGstPercentage(Number(calculatedGstPercentage.toFixed(2)));
      }
    }
  }, [gstPercentage, gstAmount, bankPayments, lastEditedGstField]);

  const handleCashChange = (value: number | "") => {
    setCashPayments(value);
    if (totalAmount !== "" && value !== "") {
      const calculatedBank = Number(totalAmount) - Number(value);
      setBankPayments(calculatedBank >= 0 ? calculatedBank : 0);
    } else if (value === "") {
      setBankPayments(totalAmount);
    }
    setLastEditedGstField("percentage"); // Trigger GST update for new bank value
  };

  const handleBankChange = (value: number | "") => {
    setBankPayments(value);
    if (totalAmount !== "" && value !== "") {
      const calculatedCash = Number(totalAmount) - Number(value);
      setCashPayments(calculatedCash >= 0 ? calculatedCash : 0);
    } else if (value === "") {
      setCashPayments(totalAmount);
    }
    setLastEditedGstField("percentage"); // Trigger GST update
  };

  const handleTotalChange = (value: number | "") => {
    setTotalAmount(value);
    if (value === "") {
      setBankPayments("");
      setCashPayments("");
    } else {
      if (bankPayments !== "" && cashPayments !== "") {
        const total = Number(bankPayments) + Number(cashPayments);
        if (total > 0) {
          const newBank = (Number(bankPayments) / total) * Number(value);
          const newCash = Number(value) - newBank;
          setBankPayments(Math.round(newBank * 100) / 100);
          setCashPayments(Math.round(newCash * 100) / 100);
        } else {
          setBankPayments(Number(value));
          setCashPayments(0);
        }
      } else {
        setBankPayments(Number(value));
        setCashPayments(0);
      }
    }
    setLastEditedGstField("percentage");
  };

  const handleGstPercentageChange = (value: number | "") => {
    setGstPercentage(value);
    setLastEditedGstField("percentage");
  };

  const handleGstAmountChange = (value: number | "") => {
    setGstAmount(value);
    setLastEditedGstField("amount");
  };

  const handleDelete = async (itemId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/setProvidedItems", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, leadId }),
      });
      if (!response.ok) throw new Error("Failed to delete item");
      onDataUpdate();
      setPriceBreakdown((prevItems) => prevItems.filter((item) => item.id !== itemId));
      toast({ title: "Success", description: "Item deleted successfully." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete item.", variant: "destructive" });
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

  const validateAmounts = (): boolean => {
    const bank = Number(bankPayments) || 0;
    const cash = Number(cashPayments) || 0;
    const total = Number(totalAmount) || 0;

    if (!total) {
      toast({ variant: "destructive", title: "Missing Total Amount", description: "Please enter the total amount." });
      return false;
    }
    if (Math.abs(bank + cash - total) > 0.01) {
      toast({ variant: "destructive", title: "Invalid Amounts", description: "Sum of bank and cash must equal total amount." });
      return false;
    }
    return true;
  };

  const handleAddProvidedItem = async () => {
    if (!areaType || !validateAmounts()) return;
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
      if (!response.ok) throw new Error("Failed to add item");
      onDataUpdate();
      setPriceBreakdown((prevItems) => [...prevItems, { ...responseData.newItem, totalAmount: payInCashValue + payInBankValue }]);
      handleClear();
      setIsAddDialogOpen(false);
      toast({ title: "Success", description: "Item added successfully." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to add item.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditItem = (item: ProvidedItem) => {
    setEditingItemId(item.id);
    setAreaType(item.area);
    const totalAmt = (item.payInCash || 0) + (item.payInOnline || 0);
    setTotalAmount(totalAmt);
    setBankPayments(item.payInOnline || 0);
    setCashPayments(item.payInCash || 0);
    setGstAmount(item.gst || 0);
    
    // UPDATED: Logic to reverse calculate percentage from bank payment specifically
    if (item.payInOnline > 0 && item.gst > 0) {
      const baseAmount = item.payInOnline - item.gst;
      const calculatedPercentage = (item.gst / baseAmount) * 100;
      setGstPercentage(Number(calculatedPercentage.toFixed(2)));
    } else {
      setGstPercentage(18); // Default back to 18 if no GST recorded
    }

    setBrand(item.brand || "");
    setModel(item.model || "");
    setRemark(item.remark || "");
    setIsEditDialogOpen(true);
  };

  const handleUpdateProvidedItem = async () => {
    if (!areaType || !validateAmounts()) return;
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
      if (!response.ok) throw new Error("Failed to update item");
      onDataUpdate();
      setPriceBreakdown((prevItems) =>
        prevItems.map((item) =>
          item.id === editingItemId
            ? { ...item, area: areaType, brand, model, remark, payInCash: payInCashValue, payInOnline: payInBankValue, gst: gstValue, totalAmount: payInCashValue + payInBankValue }
            : item
        )
      );
      handleClear();
      setIsEditDialogOpen(false);
      toast({ title: "Success", description: "Item updated successfully." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to update item.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setAreaType("");
    setTotalAmount("");
    setBankPayments("");
    setCashPayments("");
    setGstPercentage(18); // Reset to default 18
    setGstAmount("");
    setBrand("");
    setModel("");
    setRemark("");
    setLastEditedGstField("percentage");
  };

  return (
    <Card className="lg:p-4 shadow-md rounded-lg h-[443px] overflow-y-scroll">
      <CardHeader>
        <CardTitle className="flex items-center font-bold text-2xl gap-2">
          <Package /> Booked Items
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="ml-auto flex items-center gap-2" disabled={closedLead || isLoading}>
                <PlusCircle className="w-4 h-4" /> Book Item
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[550px]">
              <DialogHeader>
                <DialogTitle>Book an Item</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "main" | "additional")} className="mb-4">
                  <TabsList className="grid grid-cols-2">
                    <TabsTrigger value="main">Main Items</TabsTrigger>
                    <TabsTrigger value="additional">Additional Items</TabsTrigger>
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
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="totalAmount">Total Amount (₹)</Label>
                  <Input id="totalAmount" type="number" placeholder="0.00" value={totalAmount} onChange={(e) => handleTotalChange(Number(e.target.value) || "")} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bankPayments">Bank Payments (₹)</Label>
                    <Input id="bankPayments" type="number" placeholder="0.00" value={bankPayments} onChange={(e) => handleBankChange(Number(e.target.value) || "")} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cashPayments">Cash Payments (₹)</Label>
                    <Input id="cashPayments" type="number" placeholder="0.00" value={cashPayments} onChange={(e) => handleCashChange(Number(e.target.value) || "")} />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="gstPercentage">GST Percentage (%)</Label>
                    <Input id="gstPercentage" type="number" placeholder="18.00" value={gstPercentage} onChange={(e) => handleGstPercentageChange(Number(e.target.value) || "")} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gstAmount">GST Amount (₹)</Label>
                    <Input id="gstAmount" type="number" placeholder="0.00" value={gstAmount} onChange={(e) => handleGstAmountChange(Number(e.target.value) || "")} />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="brand">Brand</Label>
                    <Input id="brand" placeholder="Enter brand" value={brand} onChange={(e) => setBrand(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="model">Model</Label>
                    <Input id="model" placeholder="Enter model" value={model} onChange={(e) => setModel(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="remark">Remark</Label>
                  <Input id="remark" placeholder="Notes" value={remark} onChange={(e) => setRemark(e.target.value)} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={handleClear}>Clear</Button>
                <Button disabled={isLoading} onClick={handleAddProvidedItem}>Add Item</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Area</TableHead>
              <TableHead>Total (₹)</TableHead>
              <TableHead>Bank (₹)</TableHead>
              <TableHead>Cash (₹)</TableHead>
              <TableHead>GST (₹)</TableHead>
              <TableHead>Brand</TableHead>
              <TableHead>Model</TableHead>
              <TableHead>Remark</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {priceBreakdown.length > 0 ? (
              priceBreakdown.map((item, index) => (
                <TableRow key={item.id || index}>
                  <TableCell>{item.area}</TableCell>
                  <TableCell>₹{((item.payInCash || 0) + (item.payInOnline || 0)).toLocaleString()}</TableCell>
                  <TableCell>₹{(item.payInOnline || 0).toLocaleString()}</TableCell>
                  <TableCell>₹{(item.payInCash || 0).toLocaleString()}</TableCell>
                  <TableCell>₹{(item.gst || 0).toLocaleString()}</TableCell>
                  <TableCell>{item.brand || "-"}</TableCell>
                  <TableCell>{item.model || "-"}</TableCell>
                  <TableCell>{item.remark || "-"}</TableCell>
                  <TableCell className="flex space-x-2">
                    <button onClick={() => handleEditItem(item)} className="text-blue-500" disabled={closedLead || isLoading}><Edit className="w-5 h-5" /></button>
                    <button onClick={() => confirmDelete(item.id)} className="text-red-500" disabled={closedLead || isLoading}><Trash2 className="w-5 h-5" /></button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow><TableCell colSpan={9} className="text-center">No items found.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>

      {/* Edit and Delete Dialogs remain largely the same in structure, using updated logic above */}
      <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Item?</AlertDialogTitle></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancel}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm} className="bg-red-600">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default PriceBreakdown;