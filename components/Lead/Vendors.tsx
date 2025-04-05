"use client";

import React, { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import useSWR from "swr";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
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

// Fetch vendors API
const fetcher = (url: string) => fetch(url).then((res) => res.json());

type TransactionNote = {
  leadId: number;
  id: number;
  amount: number;
  transactionName: string;
  transactionType: "CASH_IN" | "CASH_OUT";
  paymentMethod: string;
  remark: string | null;
  transactionDate: Date;
  vendorId: number | null;
};

interface VendorsBreakdown {
  id: number;
  totalGiven: number;
  totalAmt: number;
  leadId: number;
}

interface Vendor {
  id: number;
  name: string;
  mobileNo: string;
  address: string;
  city: string;
  TotalCharge: number;
  GivenCharge: number;
  transNotes: TransactionNote[];
  vendorsBreakdown: VendorsBreakdown[];
}

interface VendorsProps {
  leadId: string;
  vendors: Vendor[];
  id: number;
  closedLead: boolean;
  onVendorPayClick: (vendorId: number, remainingAmount: number) => void;
  onDataUpdate: () => void;
}

const Vendors: React.FC<VendorsProps> = ({
  leadId,
  vendors: initialVendors,
  id,
  closedLead,
  onVendorPayClick,
  onDataUpdate,
}) => {
  const [open, setOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<string | null>(null);
  const [price, setPrice] = useState<string>("");
  const [localVendors, setLocalVendors] = useState<Vendor[]>(initialVendors);

  // New states for editing total charge
  const [isEditChargeModalOpen, setIsEditChargeModalOpen] = useState(false);
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [newTotalCharge, setNewTotalCharge] = useState<string>("");

  // States for unassigning vendor
  const [isUnassignDialogOpen, setIsUnassignDialogOpen] = useState(false);
  const [vendorToUnassign, setVendorToUnassign] = useState<number | null>(null);

  const { data, error, mutate } = useSWR("/api/getAllVendors", fetcher);
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  // Filter out vendors that are already assigned to the lead
  const assignedVendorIds = localVendors.map((vendor) => vendor.id);
  const availableVendors = data?.vendors?.filter(
    (vendor: Vendor) => !assignedVendorIds.includes(vendor.id)
  );

  // Calculate cash and bank payments for each vendor
  const calculatePayments = (vendor: Vendor) => {
    // Filter transactions for the current leadId
    const relevantTransactions = vendor.transNotes.filter(
      (note) => note.leadId === Number(id)
    );

    // Calculate cash payments (CASH_OUT only)
    const cashPayments = relevantTransactions
      .filter(
        (note) =>
          // note.transactionType === "CASH_OUT" &&
          note.paymentMethod === "CASH"
      )
      .reduce((sum, note) => sum + note.amount, 0);

    // Calculate bank/online payments (CASH_OUT only)
    const bankPayments = relevantTransactions
      .filter(
        (note) =>
          // note.transactionType === "CASH_OUT" &&
          note.paymentMethod === "ONLINE"
      )
      .reduce((sum, note) => sum + note.amount, 0);

    return { cashPayments, bankPayments };
  };

  const onSubmit = async () => {
    if (!selectedVendor || price.trim() === "") {
      toast({
        title: "Error",
        description: "Please select a vendor and enter a price",
        variant: "destructive",
      });
      return;
    }

    setOpen(false);
    setIsLoading(true);
    try {
      const response = await fetch("/api/addVendorToLead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendorId: Number(selectedVendor),
          leadId,
          price: Number(price),
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to add vendor");

      // Find the newly assigned vendor and update localVendors instantly
      const newVendor = result.data;
      if (newVendor) {
        setLocalVendors((prev) => [
          ...prev,
          {
            ...newVendor,
            TotalCharge: Number(price),
            GivenCharge: 0,
            vendorsBreakdown: [
              {
                id: newVendor.id,
                totalGiven: 0,
                totalAmt: Number(price),
                leadId: Number(leadId),
              },
            ],
          },
        ]);
      }
      onDataUpdate();
      mutate(); // Refresh vendors from API
      toast({
        title: "Vendor Added",
        description: "Successfully added vendor to lead.",
      });

      // Reset the form
      setSelectedVendor(null);
      setPrice("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditTotalCharge = async () => {
    if (!editingVendor) return;

    const currentTotalCharge =
      editingVendor?.vendorsBreakdown[0]?.totalAmt || 0;
    const newCharge = Number(newTotalCharge);
    setIsLoading(true);
    try {
      const response = await fetch("/api/setVendor", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendorId: editingVendor.id,
          leadId: Number(id),
          newAmount: newCharge,
        }),
      });

      const result = await response.json();
      if (!response.ok)
        throw new Error(result.message || "Failed to update total charge");

      // Update local vendors state
      setLocalVendors((prevVendors) =>
        prevVendors.map((vendor) =>
          vendor.id === editingVendor.id
            ? {
                ...vendor,
                vendorsBreakdown: [
                  {
                    ...vendor.vendorsBreakdown[0],
                    totalAmt: newCharge,
                  },
                ],
              }
            : vendor
        )
      );
      onDataUpdate();
      window.location.reload();
      toast({
        title: "Total Charge Updated",
        description: "Successfully updated vendor's total charge.",
      });

      // Close modals
      setIsEditChargeModalOpen(false);
      setIsConfirmationModalOpen(false);
      setEditingVendor(null);
      setNewTotalCharge("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const openEditTotalChargeModal = (vendor: Vendor) => {
    const currentTotalCharge = vendor?.vendorsBreakdown[0]?.totalAmt || 0;
    setEditingVendor(vendor);
    setNewTotalCharge(currentTotalCharge.toString());
    setIsEditChargeModalOpen(true);
  };

  const handleTotalChargeChange = () => {
    if (!editingVendor) return;

    const currentTotalCharge =
      editingVendor?.vendorsBreakdown[0]?.totalAmt || 0;
    const newCharge = Number(newTotalCharge);

    if (newCharge < currentTotalCharge) {
      // Show warning confirmation modal
      setIsConfirmationModalOpen(true);
    } else {
      // Directly update if new charge is higher
      handleEditTotalCharge();
    }
  };

  const handleUnassignVendor = async (vendorId: number) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/setVendor", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendorId: Number(vendorId),
          leadId: Number(id),
        }),
      });

      const result = await response.json();
      if (!response.ok)
        throw new Error(result.message || "Failed to unassign vendor");

      // Update local state to remove the unassigned vendor
      setLocalVendors((prevVendors) =>
        prevVendors.filter((vendor) => vendor.id !== vendorId)
      );

      toast({
        title: "Vendor Unassigned",
        description: "Vendor has been successfully unassigned.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const confirmUnassign = (vendorId: number) => {
    setVendorToUnassign(vendorId);
    setIsUnassignDialogOpen(true);
  };

  const handleConfirmUnassign = () => {
    if (vendorToUnassign !== null) {
      handleUnassignVendor(vendorToUnassign);
    }
    setIsUnassignDialogOpen(false);
    setVendorToUnassign(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Vendors</CardTitle>
      </CardHeader>
      <CardContent>
        <Button
          onClick={() => setOpen(true)}
          disabled={closedLead || isLoading}
        >
          Add Vendor
        </Button>

        {error && <p className="text-red-500">Error loading vendors.</p>}
        {!data && <p>Loading vendors...</p>}

        <Table className="mt-4">
          <TableCaption>
            {localVendors.length > 0
              ? "A list of your Assigned Vendors."
              : "No assigned vendors."}
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="p-4">ID</TableHead>
              <TableHead className="p-4">Name</TableHead>
              <TableHead className="p-4">Cash Payments</TableHead>
              <TableHead className="p-4">Bank Payments</TableHead>
              <TableHead className="p-4">Total Charge</TableHead>
              <TableHead className="p-4">Given Charge</TableHead>
              <TableHead className="p-4">Remaining Charge</TableHead>
              <TableHead className="p-4">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {localVendors?.map((vendor: Vendor) => {
              // Calculate remaining charge
              const remainingCharge =
                vendor?.vendorsBreakdown[0]?.totalAmt -
                vendor?.vendorsBreakdown[0]?.totalGiven;

              // Calculate cash and bank payments
              const { cashPayments, bankPayments } = calculatePayments(vendor);

              return (
                <TableRow key={vendor.id}>
                  <TableCell className="p-4">{vendor.id}</TableCell>
                  <TableCell className="p-4">{vendor.name}</TableCell>
                  <TableCell className="p-4">
                    ₹{cashPayments.toLocaleString()}
                  </TableCell>
                  <TableCell className="p-4">
                    ₹{bankPayments.toLocaleString()}
                  </TableCell>
                  <TableCell className="p-4 flex items-center">
                    ₹{vendor?.vendorsBreakdown[0]?.totalAmt.toLocaleString()}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="ml-2"
                      onClick={() => openEditTotalChargeModal(vendor)}
                      disabled={closedLead || isLoading}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                  <TableCell className="p-4">
                    ₹{vendor?.vendorsBreakdown[0]?.totalGiven.toLocaleString()}
                  </TableCell>
                  <TableCell className="p-4">
                    ₹{remainingCharge.toLocaleString()}
                  </TableCell>
                  <TableCell className="p-4">
                    <div className="flex gap-2">
                      {/* Pay Button - Only show if there's remaining amount */}
                      <Button
                        variant="outline"
                        className="bg-green-50 hover:bg-green-100 text-green-700 border-green-300"
                        disabled={
                          !(remainingCharge > 0 && !closedLead && !isLoading)
                        }
                        onClick={() => {
                          onDataUpdate();
                          onVendorPayClick(vendor.id, remainingCharge);
                        }}
                      >
                        Pay
                      </Button>

                      {/* Unassign Button */}
                      <Button
                        variant="destructive"
                        onClick={() => confirmUnassign(vendor.id)}
                        disabled={closedLead || isLoading}
                      >
                        Unassign
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>

      {/* Select Vendor Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Vendor</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Select
              onValueChange={setSelectedVendor}
              value={selectedVendor || ""}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a vendor" />
              </SelectTrigger>
              <SelectContent>
                {availableVendors?.map((vendor: Vendor) => (
                  <SelectItem key={vendor.id} value={vendor.id.toString()}>
                    {vendor.name} - {vendor.city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="number"
              placeholder="Enter total price"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
            <Button onClick={onSubmit} disabled={closedLead || isLoading}>
              Assign Vendor
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Total Charge Modal */}
      <Dialog
        open={isEditChargeModalOpen}
        onOpenChange={setIsEditChargeModalOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Total Charge</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              type="number"
              placeholder="Enter new total charge"
              value={newTotalCharge}
              onChange={(e) => setNewTotalCharge(e.target.value)}
            />
            <Button
              onClick={handleTotalChargeChange}
              disabled={closedLead || isLoading}
            >
              Update Charge
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Modal for Decreasing Total Charge */}
      <AlertDialog
        open={isConfirmationModalOpen}
        onOpenChange={setIsConfirmationModalOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>⚠ Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The extra provided payment will be
              automatically processed, and a transaction note will be added for
              future reference.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => setIsConfirmationModalOpen(false)}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleEditTotalCharge}>
              Confirm Update
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unassign Vendor Confirmation Modal */}
      <AlertDialog
        open={isUnassignDialogOpen}
        onOpenChange={setIsUnassignDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unassign Vendor</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to unassign this vendor from the lead?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsUnassignDialogOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmUnassign}>
              Unassign
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default Vendors;
