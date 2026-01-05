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

  // Form state
  const [areaType, setAreaType] = useState<string>("");
  const [totalAmount, setTotalAmount] = useState<number | "">("");
  const [bankPayments, setBankPayments] = useState<number | "">("");
  const [cashPayments, setCashPayments] = useState<number | "">("");
  
  // Default GST percentage set to 18
  const [gstPercentage, setGstPercentage] = useState<number | "">(18);
  const [gstAmount, setGstAmount] = useState<number | "">("");
  const [brand, setBrand] = useState<string>("");
  const [model, setModel] = useState<string>("");
  const [remark, setRemark] = useState<string>("");
  const [lastEditedGstField, setLastEditedGstField] = useState<"percentage" | "amount">("percentage");

  const mainParticulars = Object.values(AreaType).filter(
    (area) => !["Counter_top", "Appliances", "Sink", "Installation"].includes(area)
  );
  const additionalParticulars = Object.values(AdditionalItemsList);
  const currentParticulars = activeTab === "main" ? mainParticulars : additionalParticulars;

  // STRICT CALCULATION LOGIC: GST = (Percentage * Bank Payment) / 100
 useEffect(() => {
  const bank = Number(bankPayments) || 0;

  // Default GST percentage = 18
  const pct =
    gstPercentage === "" || isNaN(Number(gstPercentage))
      ? 18
      : Number(gstPercentage);

  // If user edits GST percentage → calculate GST amount
  if (lastEditedGstField === "percentage") {
    const gst = (bank * pct) / 100;
    setGstPercentage(pct); // ensures default 18 is applied
    setGstAmount(Number(gst.toFixed(2)));
  }

  // If user edits GST amount → calculate GST percentage
  if (lastEditedGstField === "amount") {
    const amt = Number(gstAmount) || 0;

    if (bank > 0) {
      const calculatedPct = (amt / bank) * 100;
      setGstPercentage(Number(calculatedPct.toFixed(2)));
    } else {
      setGstPercentage(18); // fallback safety
    }
  }
}, [gstPercentage, gstAmount, bankPayments, lastEditedGstField]);


  const handleTotalChange = (value: number | "") => {
    setTotalAmount(value);
    if (value === "") {
      setBankPayments("");
      setCashPayments("");
    } else {
      setBankPayments(value);
      setCashPayments(0);
    }
  };

  const handleBankChange = (value: number | "") => {
    setBankPayments(value);
    if (totalAmount !== "" && value !== "") {
      const remaining = Number(totalAmount) - Number(value);
      setCashPayments(remaining >= 0 ? Number(remaining.toFixed(2)) : 0);
    }
    setLastEditedGstField("percentage");
  };

  const handleCashChange = (value: number | "") => {
    setCashPayments(value);
    if (totalAmount !== "" && value !== "") {
      const remaining = Number(totalAmount) - Number(value);
      setBankPayments(remaining >= 0 ? Number(remaining.toFixed(2)) : 0);
    }
    setLastEditedGstField("percentage");
  };

  const handleClear = () => {
    setAreaType("");
    setTotalAmount("");
    setBankPayments("");
    setCashPayments("");
    setGstPercentage(18); 
    setGstAmount("");
    setBrand("");
    setModel("");
    setRemark("");
    setLastEditedGstField("percentage");
    setEditingItemId(null);
  };

  const handleDelete = async (itemId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/setProvidedItems", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, leadId }),
      });
      if (!response.ok) throw new Error("Failed to delete");
      onDataUpdate();
      toast({ title: "Success", description: "Item deleted successfully." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete item.", variant: "destructive" });
    } finally {
      setIsLoading(false);
      setIsDialogOpen(false);
      setItemToDelete(null);
    }
  };

  const validateAmounts = (): boolean => {
    const bank = Number(bankPayments) || 0;
    const cash = Number(cashPayments) || 0;
    const total = Number(totalAmount) || 0;
    if (!total) {
      toast({ variant: "destructive", title: "Missing Total", description: "Please enter total amount." });
      return false;
    }
    if (Math.abs(bank + cash - total) > 0.1) {
      toast({ variant: "destructive", title: "Balance Mismatch", description: "Bank + Cash must equal Total." });
      return false;
    }
    return true;
  };

  const handleAddProvidedItem = async () => {
    if (!areaType || !validateAmounts()) return;
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
          payInCash: Number(cashPayments) || 0,
          payInOnline: Number(bankPayments) || 0,
          gst: Number(gstAmount) || 0,
        }),
      });
      if (!response.ok) throw new Error();
      onDataUpdate();
      handleClear();
      setIsAddDialogOpen(false);
      toast({ title: "Success", description: "Item added." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to add item.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditItem = (item: ProvidedItem) => {
    setEditingItemId(item.id);
    setAreaType(item.area);
    setTotalAmount((item.payInCash || 0) + (item.payInOnline || 0));
    setBankPayments(item.payInOnline || 0);
    setCashPayments(item.payInCash || 0);
    setGstAmount(item.gst || 0);
    
    if (item.payInOnline > 0) {
        const pct = (item.gst / item.payInOnline) * 100;
        setGstPercentage(Number(pct.toFixed(2)));
    } else {
        setGstPercentage(18);
    }

    setBrand(item.brand || "");
    setModel(item.model || "");
    setRemark(item.remark || "");
    setLastEditedGstField("percentage");
    setIsEditDialogOpen(true);
  };

  const handleUpdateProvidedItem = async () => {
    if (!areaType || !validateAmounts()) return;
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
          payInCash: Number(cashPayments) || 0,
          payInOnline: Number(bankPayments) || 0,
          gst: Number(gstAmount) || 0,
        }),
      });
      if (!response.ok) throw new Error();
      onDataUpdate();
      setIsEditDialogOpen(false);
      handleClear();
      toast({ title: "Success", description: "Item updated." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to update.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="lg:p-4 shadow-md rounded-lg h-[443px] overflow-y-scroll">
      <CardHeader>
        <CardTitle className="flex items-center font-bold text-2xl gap-2">
          <Package /> Booked Items
          <Dialog open={isAddDialogOpen} onOpenChange={(open) => { setIsAddDialogOpen(open); if(!open) handleClear(); }}>
            <DialogTrigger asChild>
              <Button variant="outline" className="ml-auto flex items-center gap-2" disabled={closedLead || isLoading}>
                <PlusCircle className="w-4 h-4" /> Book Item
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[550px]">
              <DialogHeader><DialogTitle>Book an Item</DialogTitle></DialogHeader>
              <div className="space-y-4 py-2">
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "main" | "additional")}>
                  <TabsList className="grid grid-cols-2">
                    <TabsTrigger value="main">Main</TabsTrigger>
                    <TabsTrigger value="additional">Additional</TabsTrigger>
                  </TabsList>
                </Tabs>
                <div className="space-y-2">
                  <Label>Particulars</Label>
                  <Select value={areaType} onValueChange={setAreaType}>
                    <SelectTrigger><SelectValue placeholder="Select item" /></SelectTrigger>
                    <SelectContent>
                      {currentParticulars.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Total Amount (₹)</Label>
                    <Input type="number" value={totalAmount} onChange={(e) => handleTotalChange(e.target.value === "" ? "" : Number(e.target.value))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Bank Payment (₹)</Label>
                    <Input type="number" value={bankPayments} onChange={(e) => handleBankChange(e.target.value === "" ? "" : Number(e.target.value))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Cash Payment (₹)</Label>
                        <Input type="number" value={cashPayments} onChange={(e) => handleCashChange(e.target.value === "" ? "" : Number(e.target.value))} />
                    </div>
                    <div className="space-y-2">
                        <Label>GST Percentage (%)</Label>
                        <Input type="number" value={gstPercentage} onChange={(e) => {
                            setGstPercentage(e.target.value === "" ? "" : Number(e.target.value));
                            setLastEditedGstField("percentage");
                        }} />
                    </div>
                </div>
                <div className="space-y-2">
                  <Label>GST Amount (₹)</Label>
                  <Input type="number" value={gstAmount} onChange={(e) => {
                      setGstAmount(e.target.value === "" ? "" : Number(e.target.value));
                      setLastEditedGstField("amount");
                  }} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input placeholder="Brand" value={brand} onChange={(e) => setBrand(e.target.value)} />
                  <Input placeholder="Model" value={model} onChange={(e) => setModel(e.target.value)} />
                </div>
                <Input placeholder="Remark" value={remark} onChange={(e) => setRemark(e.target.value)} />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={handleClear}>Clear</Button>
                <Button onClick={handleAddProvidedItem} disabled={isLoading}>Add Item</Button>
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
              <TableHead>Total</TableHead>
              <TableHead>Bank</TableHead>
              <TableHead>Cash</TableHead>
              <TableHead>GST</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {priceBreakdown.length > 0 ? (
              priceBreakdown.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.area}</TableCell>
                  <TableCell>₹{(item.payInOnline + item.payInCash).toLocaleString()}</TableCell>
                  <TableCell>₹{item.payInOnline.toLocaleString()}</TableCell>
                  <TableCell>₹{item.payInCash.toLocaleString()}</TableCell>
                  <TableCell>₹{item.gst.toLocaleString()}</TableCell>
                  <TableCell className="flex gap-2">
                    <Button size="icon" variant="ghost" disabled={closedLead} onClick={() => handleEditItem(item)}><Edit className="w-4 h-4 text-blue-500" /></Button>
                    <Button size="icon" variant="ghost" disabled={closedLead} onClick={() => { setItemToDelete(item.id); setIsDialogOpen(true); }}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow><TableCell colSpan={6} className="text-center py-4">No items booked.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => { setIsEditDialogOpen(open); if(!open) handleClear(); }}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader><DialogTitle>Edit Item</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
             <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Bank Payment (₹)</Label>
                    <Input type="number" value={bankPayments} onChange={(e) => handleBankChange(e.target.value === "" ? "" : Number(e.target.value))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Cash Payment (₹)</Label>
                    <Input type="number" value={cashPayments} onChange={(e) => handleCashChange(e.target.value === "" ? "" : Number(e.target.value))} />
                  </div>
             </div>
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>GST %</Label>
                    <Input type="number" value={gstPercentage} onChange={(e) => {
                        setGstPercentage(e.target.value === "" ? "" : Number(e.target.value));
                        setLastEditedGstField("percentage");
                    }} />
                </div>
                <div className="space-y-2">
                    <Label>GST Amount (₹)</Label>
                    <Input type="number" value={gstAmount} onChange={(e) => {
                        setGstAmount(e.target.value === "" ? "" : Number(e.target.value));
                        setLastEditedGstField("amount");
                    }} />
                </div>
            </div>
            <Input placeholder="Brand" value={brand} onChange={(e) => setBrand(e.target.value)} />
            <Input placeholder="Model" value={model} onChange={(e) => setModel(e.target.value)} />
            <Input placeholder="Remark" value={remark} onChange={(e) => setRemark(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateProvidedItem} disabled={isLoading}>Update Item</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-red-600" 
              onClick={() => itemToDelete && handleDelete(itemToDelete)}
              disabled={isLoading}
            >
              {isLoading ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default PriceBreakdown;