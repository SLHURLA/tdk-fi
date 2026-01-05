"use client";
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import { Package, Trash2, PlusCircle, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  priceBreakdown,
  closedLead,
  leadId,
  onDataUpdate,
}: PriceBreakdownProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"main" | "additional">("main");

  // Form states
  const [areaType, setAreaType] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [bankPayments, setBankPayments] = useState("");
  const [cashPayments, setCashPayments] = useState("");
  const [gstPercentage, setGstPercentage] = useState("");
  const [gstAmount, setGstAmount] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [remark, setRemark] = useState("");

  const mainParticulars = Object.values(AreaType).filter(
    (area) => !["Counter_top", "Appliances", "Sink", "Installation"].includes(area)
  );
  const additionalParticulars = Object.values(AdditionalItemsList);
  const currentParticulars = activeTab === "main" ? mainParticulars : additionalParticulars;

  // EXCLUSIVE GST CALCULATION: GST Amount = (Bank Payment * GST%) / 100
  // This is the ONLY way GST is calculated - one direction only
  useEffect(() => {
    const bank = parseFloat(bankPayments) || 0;
    const gstPct = parseFloat(gstPercentage) || 0;

    if (bank > 0 && gstPct > 0) {
      // Formula: (Bank * GST%) / 100
      const calculatedGst = (bank * gstPct) / 100;
      setGstAmount(calculatedGst.toFixed(2));
    } else {
      setGstAmount("");
    }
  }, [bankPayments, gstPercentage]);

  const handleTotalChange = (value: string) => {
    setTotalAmount(value);
    if (value === "") {
      setBankPayments("");
      setCashPayments("");
    } else {
      // Default: All goes to bank, cash is 0
      setBankPayments(value);
      setCashPayments("0");
    }
  };

  const handleBankChange = (value: string) => {
    setBankPayments(value);
    const bankVal = parseFloat(value) || 0;
    const total = parseFloat(totalAmount) || 0;

    if (total > 0) {
      const remainingCash = total - bankVal;
      setCashPayments(remainingCash >= 0 ? remainingCash.toFixed(2) : "0");
    }
  };

  const handleCashChange = (value: string) => {
    setCashPayments(value);
    const cashVal = parseFloat(value) || 0;
    const total = parseFloat(totalAmount) || 0;

    if (total > 0) {
      const remainingBank = total - cashVal;
      setBankPayments(remainingBank >= 0 ? remainingBank.toFixed(2) : "0");
    }
  };

  const handleClear = () => {
    setAreaType("");
    setTotalAmount("");
    setBankPayments("");
    setCashPayments("");
    setGstPercentage("");
    setGstAmount("");
    setBrand("");
    setModel("");
    setRemark("");
    setEditingItemId(null);
  };

  // Calculate totals for the table
  const totals = priceBreakdown.reduce(
    (acc, item) => ({
      total: acc.total + (item.payInOnline + item.payInCash),
      bank: acc.bank + item.payInOnline,
      cash: acc.cash + item.payInCash,
      gst: acc.gst + item.gst,
    }),
    { total: 0, bank: 0, cash: 0, gst: 0 }
  );

  // Calculate grand total (Total Amount + GST)
  const grandTotal = totals.total + totals.gst;

  const handleDelete = async (itemId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/setProvidedItems", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, leadId }),
      });
      if (!response.ok) throw new Error();
      onDataUpdate();
      toast({ title: "Success", description: "Item deleted successfully." });
    } catch (error) {
      toast({ title: "Error", variant: "destructive", description: "Could not delete item." });
    } finally {
      setIsLoading(false);
      setIsDialogOpen(false);
      setItemToDelete(null);
    }
  };

  const validateAmounts = (): boolean => {
    const bank = parseFloat(bankPayments) || 0;
    const cash = parseFloat(cashPayments) || 0;
    const total = parseFloat(totalAmount) || 0;

    if (!total) {
      toast({
        variant: "destructive",
        title: "Missing Total",
        description: "Please enter total amount.",
      });
      return false;
    }

    if (Math.abs(bank + cash - total) > 0.1) {
      toast({
        variant: "destructive",
        title: "Balance Mismatch",
        description: "Bank + Cash must equal Total.",
      });
      return false;
    }

    return true;
  };

  const handleAddProvidedItem = async () => {
    if (!areaType || !validateAmounts()) return;

    setIsLoading(true);
    try {
      await fetch("/api/setProvidedItem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: Number(leadId),
          area: areaType,
          brand,
          model,
          remark,
          payInCash: parseFloat(cashPayments) || 0,
          payInOnline: parseFloat(bankPayments) || 0,
          gst: parseFloat(gstAmount) || 0,
        }),
      });
      onDataUpdate();
      handleClear();
      setIsAddDialogOpen(false);
      toast({ title: "Success", description: "Item added successfully." });
    } catch (error) {
      toast({ title: "Error", variant: "destructive", description: "Failed to add item." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditItem = (item: ProvidedItem) => {
    setEditingItemId(item.id);
    setAreaType(item.area);
    const total = (item.payInCash || 0) + (item.payInOnline || 0);
    setTotalAmount(total.toString());
    setBankPayments((item.payInOnline || 0).toString());
    setCashPayments((item.payInCash || 0).toString());
    setGstAmount((item.gst || 0).toString());

    // Calculate GST percentage from existing data
    if (item.payInOnline > 0 && item.gst > 0) {
      const pct = (item.gst / item.payInOnline) * 100;
      setGstPercentage(pct.toFixed(2));
    } else {
      setGstPercentage("");
    }

    setBrand(item.brand || "");
    setModel(item.model || "");
    setRemark(item.remark || "");
    setIsEditDialogOpen(true);
  };

  const handleUpdateProvidedItem = async () => {
    if (!areaType || !validateAmounts()) return;

    setIsLoading(true);
    try {
      await fetch("/api/setProvidedItem", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: Number(leadId),
          itemId: editingItemId,
          area: areaType,
          brand,
          model,
          remark,
          payInCash: parseFloat(cashPayments) || 0,
          payInOnline: parseFloat(bankPayments) || 0,
          gst: parseFloat(gstAmount) || 0,
        }),
      });
      onDataUpdate();
      setIsEditDialogOpen(false);
      handleClear();
      toast({ title: "Success", description: "Item updated successfully." });
    } catch (error) {
      toast({ title: "Error", variant: "destructive", description: "Update failed." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Card className="lg:p-4 shadow-md rounded-lg h-[443px] overflow-y-scroll">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" /> Booked Items
          </CardTitle>
          <Dialog
            open={isAddDialogOpen}
            onOpenChange={(open) => {
              setIsAddDialogOpen(open);
              if (!open) handleClear();
            }}
          >
            <DialogTrigger asChild>
              <Button variant="outline" disabled={closedLead || isLoading}>
                <PlusCircle className="mr-2 h-4 w-4" /> Book Item
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[550px]">
              <DialogHeader>
                <DialogTitle>Book an Item</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="main">Main</TabsTrigger>
                    <TabsTrigger value="additional">Additional</TabsTrigger>
                  </TabsList>
                </Tabs>

                <div className="space-y-1">
                  <Label>Particulars</Label>
                  <Select value={areaType} onValueChange={setAreaType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select area" />
                    </SelectTrigger>
                    <SelectContent>
                      {currentParticulars.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label>Total Amount (₹)</Label>
                  <Input
                    type="number"
                    value={totalAmount}
                    onChange={(e) => handleTotalChange(e.target.value)}
                    placeholder="Enter total amount"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Bank Payment (₹)</Label>
                    <Input
                      type="number"
                      value={bankPayments}
                      onChange={(e) => handleBankChange(e.target.value)}
                      placeholder="Bank amount"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Cash Payment (₹)</Label>
                    <Input
                      type="number"
                      value={cashPayments}
                      onChange={(e) => handleCashChange(e.target.value)}
                      placeholder="Cash amount"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>GST Percentage (%)</Label>
                    <Input
                      type="number"
                      value={gstPercentage}
                      onChange={(e) => setGstPercentage(e.target.value)}
                      placeholder="Enter GST %"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>GST Amount (₹)</Label>
                    <Input
                      type="number"
                      value={gstAmount}
                      readOnly
                      disabled
                      className="bg-gray-50"
                      placeholder="Auto-calculated"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    placeholder="Brand"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                  />
                  <Input
                    placeholder="Model"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                  />
                </div>

                <Input
                  placeholder="Remark"
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={handleClear}>
                  Clear
                </Button>
                <Button onClick={handleAddProvidedItem} disabled={isLoading}>
                  {isLoading ? "Adding..." : "Add Item"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {priceBreakdown.length > 0 ? (
                priceBreakdown.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium text-xs">{item.area}</TableCell>
                    <TableCell>₹{(item.payInOnline + item.payInCash).toLocaleString()}</TableCell>
                    <TableCell>₹{item.payInOnline.toLocaleString()}</TableCell>
                    <TableCell>₹{item.payInCash.toLocaleString()}</TableCell>
                    <TableCell className="text-blue-600 font-semibold">
                      ₹{item.gst.toLocaleString()}
                    </TableCell>
                    <TableCell className="flex gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        disabled={closedLead}
                        onClick={() => handleEditItem(item)}
                      >
                        <Edit className="w-4 h-4 text-blue-500" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        disabled={closedLead}
                        onClick={() => {
                          setItemToDelete(item.id);
                          setIsDialogOpen(true);
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4 text-gray-500">
                    No items booked.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
            {priceBreakdown.length > 0 && (
              <TableFooter className="bg-muted/50 font-bold">
                <TableRow>
                  <TableCell>Total Summary</TableCell>
                  <TableCell>₹{totals.total.toLocaleString()}</TableCell>
                  <TableCell>₹{totals.bank.toLocaleString()}</TableCell>
                  <TableCell>₹{totals.cash.toLocaleString()}</TableCell>
                  <TableCell className="text-blue-700">
                    ₹{totals.gst.toLocaleString()}
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </CardContent>
      </Card>

      {/* Calculation Summary Card */}
      {priceBreakdown.length > 0 && (
        <Card className="mt-4 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">Calculation Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="font-medium">Subtotal (Bank + Cash):</span>
                <span className="text-lg font-semibold">₹{totals.total.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="font-medium">Bank Payments:</span>
                <span className="text-lg">₹{totals.bank.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="font-medium">Cash Payments:</span>
                <span className="text-lg">₹{totals.cash.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-blue-200 bg-blue-50 px-2 rounded">
                <span className="font-medium text-blue-700">GST (Exclusive):</span>
                <span className="text-lg font-semibold text-blue-700">
                  ₹{totals.gst.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center py-3 bg-green-50 px-2 rounded border-2 border-green-200">
                <span className="font-bold text-green-800 text-lg">Grand Total (Incl. GST):</span>
                <span className="text-2xl font-bold text-green-800">
                  ₹{grandTotal.toLocaleString()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog
        open={isEditDialogOpen}
        onOpenChange={(open) => {
          setIsEditDialogOpen(open);
          if (!open) handleClear();
        }}
      >
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Edit Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Total Amount (₹)</Label>
              <Input
                type="number"
                value={totalAmount}
                onChange={(e) => handleTotalChange(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Bank Payment (₹)</Label>
                <Input
                  type="number"
                  value={bankPayments}
                  onChange={(e) => handleBankChange(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Cash Payment (₹)</Label>
                <Input
                  type="number"
                  value={cashPayments}
                  onChange={(e) => handleCashChange(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>GST %</Label>
                <Input
                  type="number"
                  value={gstPercentage}
                  onChange={(e) => setGstPercentage(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>GST Amount (₹)</Label>
                <Input
                  type="number"
                  value={gstAmount}
                  readOnly
                  disabled
                  className="bg-gray-50"
                />
              </div>
            </div>
            <Input placeholder="Brand" value={brand} onChange={(e) => setBrand(e.target.value)} />
            <Input placeholder="Model" value={model} onChange={(e) => setModel(e.target.value)} />
            <Input placeholder="Remark" value={remark} onChange={(e) => setRemark(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateProvidedItem} disabled={isLoading}>
              {isLoading ? "Updating..." : "Update Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600"
              onClick={() => itemToDelete && handleDelete(itemToDelete)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default PriceBreakdown;