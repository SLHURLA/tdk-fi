"use client";
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Banknote, PlusCircle, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
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
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AdditionalItemsList } from "@prisma/client";

interface AdditionalItemsProps {
  additionalItems: {
    id: number;
    category: string;
    prodName: string;
    model: string;
    make: string;
    custPrice: number;
    landingPrice: number | null;
    gst: number | null;
  }[];
  leadId: number;
  closedLead: boolean;
  onDataUpdate: () => void;
}

const AdditionalItems = ({
  additionalItems: initialItems,
  leadId,
  closedLead,
  onDataUpdate,
}: AdditionalItemsProps) => {
  const [landingPrices, setLandingPrices] = useState<{ [key: number]: string }>(
    {}
  );
  const [items, setItems] = useState(initialItems);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [currentAction, setCurrentAction] = useState<{
    type: "update" | "delete" | "deleteItem";
    itemId: number;
  } | null>(null);
  const { toast } = useToast();

  const [category, setCategory] = useState<AdditionalItemsList | null>(null);
  const [prodName, setProdName] = useState("");
  const [custPrice, setCustPrice] = useState<number>(0);
  const [landingPrice, setLandingPrice] = useState<number>(0);
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [gstRate, setGstRate] = useState<number>(18);
  const [gstAmount, setGstAmount] = useState<number>(0);
  // Add a flag to track which field was last updated
  const [lastUpdated, setLastUpdated] = useState<"rate" | "amount">("rate");
  const [isLoading, setIsLoading] = useState(false);
  // Calculate GST amount when custPrice or gstRate changes, but only when rate was last updated
  useEffect(() => {
    if (lastUpdated === "rate" && custPrice > 0 && gstRate >= 0) {
      const calculatedGst = (custPrice * gstRate) / 100;
      setGstAmount(calculatedGst);
    }
  }, [custPrice, gstRate, lastUpdated]);

  // Update GST rate when GST amount changes, but only when amount was last updated
  const handleGstAmountChange = (amount: number) => {
    setGstAmount(amount);
    setLastUpdated("amount");

    if (custPrice > 0 && amount >= 0) {
      const calculatedRate = (amount / custPrice) * 100;
      setGstRate(calculatedRate);
    }
  };

  // Handler for GST rate change
  const handleGstRateChange = (rate: number) => {
    setGstRate(rate);
    setLastUpdated("rate");
  };

  const handleUpdateLandingPrice = async (itemId: number) => {
    const landingPrice = parseFloat(landingPrices[itemId]);

    if (isNaN(landingPrice)) {
      toast({
        title: "Error",
        description: "Please enter a valid amount.",
        variant: "destructive",
      });
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch("/api/setLandingPrice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          landingPrice,
          itemId,
          leadId,
        }),
      });

      if (response.ok) {
        onDataUpdate();
        setItems((prevItems) =>
          prevItems.map((item) =>
            item.id === itemId ? { ...item, landingPrice } : item
          )
        );

        toast({
          title: "Success",
          description: `Landing price for ${
            items.find((item) => item.id === itemId)?.prodName
          } updated to ₹${landingPrice}.`,
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to update landing price.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error updating landing price:", error);
      toast({
        title: "Error",
        description: "An error occurred while updating the landing price.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteLandingPrice = async (itemId: number) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/setLandingPrice", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          itemId,
          leadId,
        }),
      });

      if (response.ok) {
        onDataUpdate();
        setItems((prevItems) =>
          prevItems.map((item) =>
            item.id === itemId ? { ...item, landingPrice: null } : item
          )
        );

        toast({
          title: "Success",
          description: `Landing price for ${
            items.find((item) => item.id === itemId)?.prodName
          } deleted successfully.`,
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to delete landing price.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error deleting landing price:", error);
      toast({
        title: "Error",
        description: "An error occurred while deleting the landing price.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteItem = async (itemId: number) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/setAdditionalItem", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          leadId,
          id: itemId,
        }),
      });

      if (response.ok) {
        onDataUpdate();
        setItems((prevItems) => prevItems.filter((item) => item.id !== itemId));

        toast({
          title: "Success",
          description: "Additional item deleted successfully.",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to delete additional item.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error deleting additional item:", error);
      toast({
        title: "Error",
        description: "An error occurred while deleting the additional item.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleActionConfirmation = (confirmed: boolean) => {
    if (confirmed && currentAction) {
      if (currentAction.type === "update") {
        handleUpdateLandingPrice(currentAction.itemId);
      } else if (currentAction.type === "delete") {
        handleDeleteLandingPrice(currentAction.itemId);
      } else if (currentAction.type === "deleteItem") {
        handleDeleteItem(currentAction.itemId);
      }
    }
    setCurrentAction(null);
    setIsDialogOpen(false);
  };

  const handleAddAdditionalItem = async () => {
    if (!category || !prodName || custPrice <= 0) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch("/api/setAdditionalItem", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          leadId,
          category,
          custPrice,
          prodName,
          make,
          model,
          gst: gstAmount,
          landingPrice: landingPrice > 0 ? landingPrice : null,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        onDataUpdate();
        setItems(data.additionalItems);

        toast({
          title: "Success",
          description: "Additional item added successfully.",
        });

        setIsAddDialogOpen(false);
        resetForm();
      } else {
        toast({
          title: "Error",
          description: "Failed to add additional item.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error adding additional item:", error);
      toast({
        title: "Error",
        description: "An error occurred while adding the additional item.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setCategory(null);
    setProdName("");
    setCustPrice(0);
    setLandingPrice(0);
    setMake("");
    setModel("");
    setGstRate(18);
    setGstAmount(0);
    setLastUpdated("rate");
  };

  return (
    <Card className="lg:p-4 shadow-md rounded-lg my-2">
      <CardHeader>
        <CardTitle className="flex items-center font-bold text-2xl gap-2">
          <Banknote /> Appliances List
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="ml-auto flex items-center gap-2"
                disabled={closedLead || isLoading}
              >
                <PlusCircle className="w-4 h-4" /> Add Additional Item
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Add Additional Item</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 py-4">
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="category">Category</Label>
                  <RadioGroup
                    value={category || undefined}
                    onValueChange={(value) =>
                      setCategory(value as AdditionalItemsList)
                    }
                    className="grid grid-cols-3 gap-2"
                  >
                    {Object.values(AdditionalItemsList).map((type) => (
                      <div
                        key={type}
                        className="flex items-center space-x-2 border p-2 rounded-md"
                      >
                        <RadioGroupItem value={type} id={type} />
                        <label
                          htmlFor={type}
                          className="text-sm font-medium cursor-pointer"
                        >
                          {type}
                        </label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                <div className="space-y-2 col-span-2">
                  <Label htmlFor="prodName">Product Name</Label>
                  <Input
                    id="prodName"
                    placeholder="Enter product name"
                    value={prodName}
                    onChange={(e) => setProdName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="custPrice">Customer Price (₹)</Label>
                  <Input
                    id="custPrice"
                    type="number"
                    placeholder="0.00"
                    value={custPrice || ""}
                    onChange={(e) => setCustPrice(Number(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="make">Make</Label>
                  <Input
                    id="make"
                    placeholder="Enter make"
                    value={make}
                    onChange={(e) => setMake(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="model">Model</Label>
                  <Input
                    id="model"
                    placeholder="Enter model"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gstRate">GST Rate (%)</Label>
                  <Input
                    id="gstRate"
                    type="number"
                    placeholder="0.00"
                    value={gstRate || ""}
                    onChange={(e) =>
                      handleGstRateChange(Number(e.target.value))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gstAmount">GST Amount (₹)</Label>
                  <Input
                    id="gstAmount"
                    type="number"
                    placeholder="0.00"
                    value={gstAmount || ""}
                    onChange={(e) =>
                      handleGstAmountChange(Number(e.target.value))
                    }
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    resetForm();
                    setIsAddDialogOpen(false);
                  }}
                  disabled={closedLead || isLoading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddAdditionalItem}
                  disabled={closedLead || isLoading}
                >
                  Add Item
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto max-w-full">
          <Table>
            <TableCaption>
              {items.length > 0
                ? "A list of your additional items."
                : "No additional items."}
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="p-4">Category</TableHead>
                <TableHead className="p-4">Product</TableHead>
                <TableHead className="p-4">Make/Model</TableHead>
                <TableHead className="p-4">Customer Price</TableHead>
                <TableHead className="p-4">GST</TableHead>
                <TableHead className="p-4">Landing Price</TableHead>
                <TableHead className="p-4">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length > 0 ? (
                items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="p-4">{item.category}</TableCell>
                    <TableCell className="p-4">{item.prodName}</TableCell>
                    <TableCell className="p-4">
                      {item.make || "-"} / {item.model || "-"}
                    </TableCell>
                    <TableCell className="p-4">
                      ₹{item.custPrice.toLocaleString()}
                    </TableCell>
                    <TableCell className="p-4">
                      ₹{item.gst !== null ? item.gst.toLocaleString() : "0"}
                    </TableCell>
                    <TableCell className="p-4">
                      {item.landingPrice ? (
                        <div className="flex flex-row gap-4 items-center">
                          ₹{item.landingPrice.toLocaleString()}
                        </div>
                      ) : (
                        <Input
                          placeholder="Enter Amount"
                          className="w-full"
                          value={landingPrices[item.id] || ""}
                          onChange={(e) =>
                            setLandingPrices({
                              ...landingPrices,
                              [item.id]: e.target.value,
                            })
                          }
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-2">
                        {item.landingPrice ? (
                          <Button
                            onClick={() => {
                              setCurrentAction({
                                type: "delete",
                                itemId: item.id,
                              });
                              setIsDialogOpen(true);
                            }}
                            className="w-[150px]"
                            variant="destructive"
                            disabled={closedLead || isLoading}
                          >
                            Erase Landing Price
                          </Button>
                        ) : (
                          <div className="flex gap-2">
                            <Button
                              onClick={() => {
                                setCurrentAction({
                                  type: "update",
                                  itemId: item.id,
                                });
                                setIsDialogOpen(true);
                              }}
                              className="w-full"
                              disabled={closedLead || isLoading}
                            >
                              Update
                            </Button>
                            <Button
                              onClick={() => {
                                setCurrentAction({
                                  type: "deleteItem",
                                  itemId: item.id,
                                });
                                setIsDialogOpen(true);
                              }}
                              className=""
                              variant="destructive"
                              disabled={closedLead || isLoading}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-4">
                    No additional items available.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* AlertDialog for Confirmation */}
      <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {currentAction?.type === "deleteItem"
                ? "Delete Additional Item"
                : currentAction?.type === "delete"
                ? "Erase Landing Price"
                : "Update Landing Price"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {currentAction?.type === "deleteItem"
                ? "Are you sure you want to delete this additional item? This action cannot be undone."
                : currentAction?.type === "delete"
                ? "Are you sure you want to erase the landing price? This action cannot be undone."
                : "Are you sure you want to update the landing price? This will overwrite the existing value."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => handleActionConfirmation(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => handleActionConfirmation(true)}>
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default AdditionalItems;
