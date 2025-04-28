"use client";
import type React from "react";
import { useEffect, useState } from "react";
import useSWR from "swr";
import { useParams, useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import {
  Briefcase,
  IndianRupee,
  Loader2,
  PlusCircle,
  Calendar,
  Package,
  ShoppingCart,
  Save,
  CreditCard,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { type Lead, AreaType, AdditionalItemsList } from "@prisma/client";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ProvidedItems as BookedItems } from "@prisma/client";
interface ProvidedItem {
  area: AreaType;
  totalAmount: number;
  onlineAmount: number;
  cashAmount: number;
  gstPercentage: number;
  gstAmount: number;
  brand: string;
  model: string;
  remark: string;
  vendors?: Array<{ id: string; name: string; city: string }>;
}

interface AdditionalItem {
  category: AdditionalItemsList;
  prodName: string;
  custPrice: number;
  landingPrice?: number;
  model?: string;
  make?: string;
  gst: number;
  gstAmount: number;
}

interface LeadData {
  status?: string;
  userId?: number;
  // totalProjectCost?: number;
  // payInCash?: number;
  // payInOnline?: number;
  expectedHandoverDate: Date;
  additionalItems?: AdditionalItem[];
  providedItems?: any;
  // totalGST: number;
}

async function fetcher(url: string) {
  const response = await fetch(`/api/${url}`);
  if (!response.ok) throw new Error("Failed to fetch lead data");
  const data = await response.json();
  return data.data;
}

const InitLead: React.FC = () => {
  const { leadId } = useParams();
  const { data, error, isLoading } = useSWR<Lead>(
    `/getLead/${leadId}`,
    fetcher
  );
  const { toast } = useToast();

  const [providedItems, setProvidedItems] = useState<ProvidedItem[]>([]);
  const [additionalItems, setAdditionalItems] = useState<AdditionalItem[]>([]);
  const [selectedAreaType, setSelectedAreaType] = useState<AreaType | null>(
    null
  );
  const [brand, setBrand] = useState("");
  const [remark, setRemark] = useState("");

  const [additionalItemCategory, setAdditionalItemCategory] =
    useState<AdditionalItemsList | null>(null);
  const [prodName, setProdName] = useState("");
  const [custPrice, setCustPrice] = useState<number>(0);
  const [landingPrice, setLandingPrice] = useState<number | "">("");
  const [model, setModel] = useState("");
  const [make, setMake] = useState("");
  const [addGst, setAddGst] = useState(0);

  const [payInCash, setPayInCash] = useState<number>(0);
  const [payInOnline, setPayInOnline] = useState<number>(0);
  const [additionalItemsPrice, setAdditionalItemsPrice] = useState<number>(0);
  const [expectedHandoverDate, setExpectedHandoverDate] = useState<Date>(
    new Date("2025-01-01")
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [providedItemDialogOpen, setProvidedItemDialogOpen] = useState(false);
  const [additionalItemDialogOpen, setAdditionalItemDialogOpen] =
    useState(false);
  const [leadInfoDialogOpen, setLeadInfoDialogOpen] = useState(false);
  const [totalBookedAmount, setTotalBookedAmount] = useState(0);
  const [addGstAmount, setAddGstAmount] = useState<number | "">(0);
  const [lastEditedGstField, setLastEditedGstField] = useState<
    "percentage" | "amount" | null
  >(null);

  const router = useRouter();

  useEffect(() => {
    // When GST percentage is 0, explicitly set GST amount to 0
    if (addGst === 0) {
      setAddGstAmount(0);
      return;
    }

    // Only calculate GST amount if both custPrice and addGst are non-zero
    if (custPrice && addGst) {
      const calculatedGstAmount = (custPrice * Number(addGst)) / 100;
      setAddGstAmount(Number(calculatedGstAmount.toFixed(2)));
    }
  }, [addGst, custPrice]);

  useEffect(() => {
    // When GST amount is 0 or empty, set GST percentage to 0
    if (addGstAmount === 0) {
      setAddGst(0);
      return;
    }

    // Only calculate GST percentage if both custPrice and addGstAmount are non-zero
    if (custPrice && addGstAmount) {
      const calculatedGstPercentage = (Number(addGstAmount) / custPrice) * 100;
      setAddGst(Number(calculatedGstPercentage.toFixed(2)));
    }
  }, [addGstAmount, custPrice]);

  useEffect(() => {
    if (error) {
      toast({
        variant: "destructive",
        title: "Error Fetching Data",
        description:
          "Oops! Something went wrong while loading the lead details.",
      });
    }
  }, [error, toast]);

  useEffect(() => {
    const total = additionalItems.reduce(
      (sum, item) => sum + item.custPrice,
      0
    );
    setAdditionalItemsPrice(total);
  }, [additionalItems]);

  useEffect(() => {
    const total = providedItems.reduce(
      (sum, item) => sum + item.totalAmount,
      0
    );
    setTotalBookedAmount(total);
  }, [providedItems]);

  const [payInCashLocal, setPayInCashLocal] = useState(0);
  const [payInOnlineLocal, setPayInOnlineLocal] = useState(0);
  const [additionalItemTotal, setAdditionalItemTotal] = useState(0);
  const [overallGST, setOverallGST] = useState(0);

  const calculatePayInCash = (items: ProvidedItem[]) => {
    const total = items.reduce((sum, item) => sum + item.cashAmount, 0);
    setPayInCashLocal(total);
  };

  const calculatePayInOnline = (items: ProvidedItem[]) => {
    const total = items.reduce((sum, item) => sum + item.onlineAmount, 0);
    setPayInOnlineLocal(total);
  };

  const calculateAdditionalItemTotal = (items: AdditionalItem[]) => {
    const total = items.reduce((sum, item) => sum + item.custPrice, 0);
    setAdditionalItemTotal(total);
  };

  const calculateOverallGST = (
    provided: ProvidedItem[],
    additional: AdditionalItem[]
  ) => {
    const providedGST = provided.reduce((sum, item) => sum + item.gstAmount, 0);
    const additionalGST = additional.reduce(
      (sum, item) => sum + item.gstAmount,
      0
    );
    setOverallGST(providedGST + additionalGST);
  };

  useEffect(() => {
    calculatePayInCash(providedItems);
    calculatePayInOnline(providedItems);
    calculateAdditionalItemTotal(additionalItems);
    calculateOverallGST(providedItems, additionalItems);
  }, [providedItems, additionalItems]);

  const [assignedVendors, setAssignedVendors] = useState<
    Array<{ id: string; name: string; city: string }>
  >([]);

  const handleVendorAssign = (vendor: any) => {
    if (!assignedVendors.some((v) => v.id === vendor.id)) {
      setAssignedVendors([...assignedVendors, vendor]);
      toast({
        title: "Vendor Assigned",
        description: `${vendor.name} has been assigned to this item.`,
      });
    }
  };

  const handleVendorRemove = (vendorId: string) => {
    setAssignedVendors(assignedVendors.filter((v) => v.id !== vendorId));
    toast({
      title: "Vendor Removed",
      description: "Vendor has been removed from this item.",
    });
  };

  if (isLoading || !data) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-[60vh]">
        <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading lead information...</p>
      </div>
    );
  }
  const addAdditionalItem = () => {
    if (additionalItemCategory && prodName.trim() && custPrice > 0) {
      // Use the calculated GST amount
      const gstAmountToUse = addGstAmount || 0;
      const gstPercentageToUse = addGst || 0;

      setAdditionalItems([
        ...additionalItems,
        {
          category: additionalItemCategory,
          prodName,
          custPrice,
          landingPrice: landingPrice === "" ? undefined : Number(landingPrice),
          model,
          make,
          gst: gstPercentageToUse,
          gstAmount: Number(gstAmountToUse.toFixed(2)),
        },
      ]);

      // Reset form fields
      setAdditionalItemCategory(null);
      setProdName("");
      setCustPrice(0);
      setLandingPrice("");
      setModel("");
      setMake("");
      setAddGst(0);
      setAddGstAmount(0);
      setLastEditedGstField(null);
      setAdditionalItemDialogOpen(false);

      toast({
        title: "Item Added",
        description: "Additional item has been added successfully.",
      });
    } else {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please fill in all required fields.",
      });
    }
  };

  const removeProvidedItem = (index: number) => {
    setProvidedItems(providedItems.filter((_, i) => i !== index));
    toast({
      title: "Item Removed",
      description: "Provided item has been removed.",
    });
  };

  const removeAdditionalItem = (index: number) => {
    setAdditionalItems(additionalItems.filter((_, i) => i !== index));
    toast({
      title: "Item Removed",
      description: "Additional item has been removed.",
    });
  };

  const calculateGst = () => {
    return (
      additionalItems.reduce((sum, item) => sum + item.gst, 0) +
      providedItems.reduce((sum, item) => sum + item.gstAmount, 0)
    );
  };

  const handleSaveData = async () => {
    if (!leadId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Lead ID is missing.",
      });
      return;
    }

    if (totalProjectCost <= 0) {
      toast({
        variant: "destructive",
        title: "Invalid Total Cost",
        description:
          "The total project cost must be greater than zero. Please add items or update prices.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // First, assign all vendors to the lead
      // Collect all vendors from all provided items
      const allVendors: any[] = [];
      for (const item of providedItems) {
        if (item.vendors && item.vendors.length > 0) {
          for (const vendor of item.vendors) {
            // Avoid duplicates by checking if vendor is already in allVendors
            if (!allVendors.some((v) => v.id === vendor.id)) {
              allVendors.push(vendor);
            }
          }
        }
      }

      // Assign all collected vendors to the lead
      if (allVendors.length > 0) {
        try {
          for (const vendor of allVendors) {
            await fetch("/api/addVendorToLead", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                vendorId: Number(vendor.id),
                leadId: Number(leadId),
                price: 0, // Initial price set to 0
              }),
            });
          }

          toast({
            title: "Vendors Assigned",
            description: `${allVendors.length} vendor(s) assigned to the lead.`,
          });
        } catch (error) {
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to assign vendors to the lead.",
          });
          console.error("Error assigning vendors:", error);
          setIsSubmitting(false);
          return; // Exit if vendor assignment fails
        }
      }

      // Map the providedItems to match the new schema before sending
      const mappedProvidedItems = providedItems.map((item) => ({
        area: item.area as AreaType,
        brand: item.brand,
        model: item.model,
        remark: item.remark,
        payInCash: item.cashAmount,
        payInOnline: item.onlineAmount,
        gst: item.gstAmount,
      }));

      const mappedAdditionalItems = additionalItems.map((item) => ({
        category: item.category,
        prodName: item.prodName,
        custPrice: item.custPrice,
        landingPrice: item.landingPrice,
        model: item.model,
        make: item.make,
        gst: item.gstAmount,
        gstAmount: item.gst,
      }));

      console.log("mappedAdditionalItems", mappedAdditionalItems);

      const requestData: LeadData = {
        status: "INPROGRESS",
        userId: data?.userId,
        expectedHandoverDate: expectedHandoverDate,
        additionalItems: mappedAdditionalItems || [],
        providedItems: mappedProvidedItems || [],
      };

      const response = await fetch(`/api/initLead/${leadId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: "Success",
          description: "Lead data has been saved successfully.",
        });

        router.push(`/tsmgowp/lead/${leadId}`);
      } else {
        throw new Error(result.message || "Failed to save lead data");
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save lead data.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case "WON":
        return "bg-green-100 text-green-800 hover:bg-green-200";
      case "INPROGRESS":
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-200";
      default:
        return "bg-red-100 text-red-800 hover:bg-red-200";
    }
  };

  const totalProjectCost =
    (payInCashLocal || 0) + (payInOnlineLocal || 0) + additionalItemsPrice;

  return (
    <div className="w-full p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* New Customer Name Header with Info Icon */}
      <div className="flex items-center justify-between mb-6">
        <Dialog open={leadInfoDialogOpen} onOpenChange={setLeadInfoDialogOpen}>
          <DialogTrigger asChild>
            <div className="flex flex-row gap-4">
              <h1 className="text-2xl md:text-3xl font-bold">
                {data.customerName}
              </h1>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
                aria-label="View Lead Details"
              >
                <Info className="h-5 w-5" />
              </Button>
            </div>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[80%]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Lead Overview
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold">Status</h3>
                <Badge className={getStatusBadgeStyle(data.status)}>
                  {data.status}
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                {[
                  { label: "Lead ID", value: data.lead_id },
                  { label: "Customer", value: data.customerName },
                  { label: "Phone", value: data.phoneNo },
                  { label: "Contact Info", value: data.contactInfo },
                  { label: "Store", value: data.store },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    className="p-3 border rounded-md flex items-center justify-between bg-card"
                  >
                    <span className="font-medium">{label}</span>
                    <p className="text-right font-semibold">{value}</p>
                  </div>
                ))}
              </div>

              <p className="text-sm text-muted-foreground">
                This lead information is also available throughout the project
                management process.
              </p>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="items" className="w-full">
        <TabsList className="grid grid-cols-2 mb-4">
          <TabsTrigger value="items" className="flex items-center gap-2">
            <Package className="h-4 w-4" /> Items & Products
          </TabsTrigger>
          <TabsTrigger value="payment" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" /> Payment & Handover
          </TabsTrigger>
        </TabsList>

        <TabsContent value="items" className="space-y-6">
          {/* Provided Items Section */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Package className="h-5 w-5" /> Booked Items
                </CardTitle>
                {/* Total amount display */}
                <div className="flex items-center bg-primary/10 px-3 py-1 rounded-md">
                  <IndianRupee className="h-4 w-4 mr-1 text-primary" />
                  <span className="font-semibold text-primary">
                    {totalBookedAmount.toLocaleString()}
                  </span>
                </div>
              </div>
              <CardDescription>
                Items booked by the customer for the project
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BookItemSection
                providedItems={providedItems}
                setProvidedItems={setProvidedItems}
              />

              {providedItems.length > 0 ? (
                <ScrollArea className="h-[300px] rounded-md border mt-4">
                  <Table>
                    <TableHeader className="sticky top-0 bg-card z-10">
                      <TableRow>
                        <TableHead className="p-4">Particulars</TableHead>
                        <TableHead className="p-4">Total Amount</TableHead>
                        <TableHead className="p-4">Bank Payments</TableHead>
                        <TableHead className="p-4">Cash Payments</TableHead>
                        <TableHead className="p-4">GST %</TableHead>
                        <TableHead className="p-4">GST Amount</TableHead>
                        <TableHead className="p-4">Brand</TableHead>
                        <TableHead className="p-4">Model</TableHead>
                        <TableHead className="p-4">Remark</TableHead>
                        <TableHead className="p-4">Assigned Vendors</TableHead>
                        <TableHead className="text-right p-4">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {providedItems.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium p-4">
                            {item.area}
                          </TableCell>
                          <TableCell className="p-4">
                            ₹{item.totalAmount.toLocaleString()}
                          </TableCell>
                          <TableCell className="p-4">
                            ₹{item.onlineAmount.toLocaleString()}
                          </TableCell>
                          <TableCell className="p-4">
                            ₹{item.cashAmount.toLocaleString()}
                          </TableCell>
                          <TableCell className="p-4">
                            {item.gstPercentage}%
                          </TableCell>
                          <TableCell className="p-4">
                            ₹{item.gstAmount.toLocaleString()}
                          </TableCell>
                          <TableCell className="p-4">
                            {item.brand || "-"}
                          </TableCell>
                          <TableCell className="p-4">
                            {item.model || "-"}
                          </TableCell>
                          <TableCell>{item.remark || "-"}</TableCell>
                          <TableCell className="p-4">
                            {item.vendors && item.vendors.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {item.vendors.map((vendor) => (
                                  <Badge
                                    key={vendor.id}
                                    variant="outline"
                                    className="text-xs"
                                  >
                                    {vendor.name}{" "}
                                    {vendor.city && `(${vendor.city})`}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell className="text-right p-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() => removeProvidedItem(index)}
                            >
                              Remove
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              ) : (
                <div className="flex flex-col items-center justify-center h-[200px] border rounded-md bg-muted/20">
                  <Package className="h-10 w-10 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">
                    No Booked items added yet
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Additional Items Section */}
          {/* <Card>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" /> Additional Items
                </CardTitle>
               
                <div className="flex items-center bg-primary/10 px-3 py-1 rounded-md">
                  <IndianRupee className="h-4 w-4 mr-1 text-primary" />
                  <span className="font-semibold text-primary">
                    {additionalItemsPrice.toLocaleString()}
                  </span>
                </div>
              </div>
              <CardDescription>
                Extra items to be included in the project
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Dialog
                open={additionalItemDialogOpen}
                onOpenChange={setAdditionalItemDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="mb-4 flex items-center gap-2"
                  >
                    <PlusCircle className="w-4 h-4" /> Add Additional Item
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add Additional Item</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <div className="space-y-2">
                      <Label htmlFor="category">Category</Label>
                      <RadioGroup
                        value={additionalItemCategory || undefined}
                        onValueChange={(value) =>
                          setAdditionalItemCategory(
                            value as AdditionalItemsList
                          )
                        }
                        className="grid grid-cols-2 gap-2"
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
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
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <div className="space-y-2">
                        <Label htmlFor="landingPrice">
                          Landing Price (₹) (optional)
                        </Label>
                        <Input
                          id="landingPrice"
                          type="number"
                          placeholder="0.00"
                          value={landingPrice}
                          onChange={(e) =>
                            setLandingPrice(
                              e.target.value ? Number(e.target.value) : ""
                            )
                          }
                        />
                      </div> 

                      <div className="space-y-2">
                        <Label htmlFor="model">Model (optional)</Label>
                        <Input
                          id="model"
                          placeholder="Enter model"
                          value={model}
                          onChange={(e) => setModel(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="make">Make (optional)</Label>
                      <Input
                        id="make"
                        placeholder="Enter make"
                        value={make}
                        onChange={(e) => setMake(e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="gst">GST (%)</Label>
                        <Input
                          id="gst"
                          type="number"
                          placeholder="0.00"
                          value={addGst || ""}
                          onChange={(e) => {
                            const value =
                              e.target.value === ""
                                ? 0
                                : Number(e.target.value);
                            setAddGst(value);
                            setLastEditedGstField("percentage");
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="gstAmount">GST Amount (₹)</Label>
                        <Input
                          id="gstAmount"
                          type="number"
                          placeholder="0.00"
                          value={addGstAmount || ""}
                          onChange={(e) => {
                            const value =
                              e.target.value === ""
                                ? 0
                                : Number(e.target.value);
                            setAddGstAmount(value);
                            setLastEditedGstField("amount");
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setAdditionalItemDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button onClick={addAdditionalItem}>Add Item</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {additionalItems.length > 0 ? (
                <ScrollArea className="h-[300px] rounded-md border">
                  <Table>
                    <TableHeader className="sticky top-0 bg-card z-10">
                      <TableRow>
                        <TableHead>Category</TableHead>
                        <TableHead>Product Name</TableHead>
                        <TableHead>Customer Price</TableHead>
                        <TableHead>Landing Price</TableHead>
                        <TableHead>Model</TableHead>
                        <TableHead>Make</TableHead>
                        <TableHead>GST (%)</TableHead>
                        <TableHead>GST Amount (₹)</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {additionalItems.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">
                            {item.category}
                          </TableCell>
                          <TableCell>{item.prodName}</TableCell>
                          <TableCell>
                            ₹{item.custPrice.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            {item.landingPrice
                              ? `₹${item.landingPrice.toLocaleString()}`
                              : "-"}
                          </TableCell>
                          <TableCell>{item.model || "-"}</TableCell>
                          <TableCell>{item.make || "-"}</TableCell>
                          <TableCell>{item.gst}%</TableCell>
                          <TableCell>
                            ₹{item.gstAmount.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() => removeAdditionalItem(index)}
                            >
                              Remove
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              ) : (
                <div className="flex flex-col items-center justify-center h-[200px] border rounded-md bg-muted/20">
                  <ShoppingCart className="h-10 w-10 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">
                    No additional items added yet
                  </p>
                </div>
              )}
            </CardContent>
          </Card> */}
        </TabsContent>

        <TabsContent value="payment" className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard className="h-5 w-5" /> Payment Details
              </CardTitle>
              <CardDescription>
                Manage payment information and expected handover date
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="payInCash">Pay In Cash (₹)</Label>
                    <div className="relative">
                      <IndianRupee className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        id="payInCash"
                        className="pl-10 bg-muted/20"
                        disabled
                        placeholder="Enter cash payment amount"
                        type="number"
                        value={payInCashLocal || ""}
                        onChange={(e) => setPayInCash(Number(e.target.value))}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="payInOnline">Pay In Online (₹)</Label>
                    <div className="relative">
                      <IndianRupee className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        id="payInOnline"
                        className="pl-10 bg-muted/20"
                        placeholder="Enter online payment amount"
                        disabled
                        type="number"
                        value={payInOnlineLocal || ""}
                        onChange={(e) => setPayInOnline(Number(e.target.value))}
                      />
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <div className="space-y-2">
                      <Label htmlFor="totalKitchenCost">Total GST (₹)</Label>
                      <div className="relative">
                        <IndianRupee className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                        <Input
                          id="totalKitchenCost"
                          className="pl-10 bg-muted/50"
                          placeholder="0.00"
                          type="number"
                          value={overallGST || ""}
                          disabled
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="totalKitchenCost">
                        Total Kitchen Cost (₹)
                      </Label>
                      <div className="relative">
                        <IndianRupee className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                        <Input
                          id="totalKitchenCost"
                          className="pl-10 bg-muted/50"
                          placeholder="0.00"
                          type="number"
                          value={
                            (payInCashLocal || 0) + (payInOnlineLocal || 0) ||
                            ""
                          }
                          disabled
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="additionalItemsTotal">
                      Additional Items Total (₹)
                    </Label>
                    <div className="relative">
                      <IndianRupee className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        id="additionalItemsTotal"
                        className="pl-10 bg-muted/50"
                        placeholder="0.00"
                        type="number"
                        value={additionalItemTotal || ""}
                        disabled
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="handoverDate">Expected Handover Date</Label>
                    <div className="flex items-center border rounded-md p-2">
                      <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                      <DatePicker
                        date={expectedHandoverDate}
                        setDate={setExpectedHandoverDate}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 p-4 bg-primary/10 rounded-lg">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <IndianRupee className="h-5 w-5" /> Total Project Cost
                  </h3>
                  <p className="text-xl font-bold">
                    ₹{totalProjectCost.toLocaleString("hi")}
                  </p>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Includes kitchen cost and all additional items
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button
              onClick={handleSaveData}
              className="w-full md:w-auto"
              size="lg"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Lead Data
                </>
              )}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InitLead;

interface ProvidedItem {
  area: AreaType;
  totalAmount: number;
  onlineAmount: number;
  cashAmount: number;
  gstPercentage: number;
  gstAmount: number;
  brand: string;
  model: string;
  remark: string;
}

interface BookItemSectionProps {
  providedItems: ProvidedItem[];
  setProvidedItems: (items: ProvidedItem[]) => void;
}

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { toast } from "@/hooks/use-toast";
import VendorSelection from "@/components/Lead/VendorAssignment";
const BookItemSection: React.FC<BookItemSectionProps> = ({
  providedItems,
  setProvidedItems,
}) => {
  const [activeTab, setActiveTab] = useState<"main" | "additional">("main");
  const [areaType, setAreaType] = useState<string>("");
  const [totalAmount, setTotalAmount] = useState<number | "">("");
  const [onlineAmount, setOnlineAmount] = useState<number | "">("");
  const [cashAmount, setCashAmount] = useState<number | "">("");
  const [gstPercentage, setGstPercentage] = useState<number | "">("");
  const [gstAmount, setGstAmount] = useState<number | "">("");
  const [brand, setBrand] = useState<string>("");
  const [model, setModel] = useState<string>("");
  const [remark, setRemark] = useState<string>("");
  const [assignedVendors, setAssignedVendors] = useState<
    Array<{ id: string; name: string; city: string }>
  >([]);
  const [lastEditedGstField, setLastEditedGstField] = useState<
    "percentage" | "amount" | null
  >(null);

  // Main items particulars - these are AreaTypes that are NOT in AdditionalItemsList
  const mainParticulars = Object.values(AreaType).filter(
    (area) =>
      !["Counter_top", "Appliances", "Sink", "Installation"].includes(area)
  );

  // Additional items particulars - these are explicitly from AdditionalItemsList
  const additionalParticulars = Object.values(AdditionalItemsList);

  // Get current particulars based on active tab
  const currentParticulars =
    activeTab === "main" ? mainParticulars : additionalParticulars;

  // Handle vendor assignment
  const handleVendorAssign = (vendor: any) => {
    if (!assignedVendors.some((v) => v.id === vendor.id)) {
      setAssignedVendors([...assignedVendors, vendor]);
      toast({
        title: "Vendor Assigned",
        description: `${vendor.name} has been assigned to this item.`,
      });
    }
  };

  // Handle vendor removal
  const handleVendorRemove = (vendorId: string) => {
    setAssignedVendors(assignedVendors.filter((v) => v.id !== vendorId));
    toast({
      title: "Vendor Removed",
      description: "Vendor has been removed from this item.",
    });
  };

  // Calculate GST when percentage or amount changes
  useEffect(() => {
    if (lastEditedGstField === "percentage" && gstPercentage && totalAmount) {
      // Calculate GST amount from percentage
      const baseAmount =
        (Number(totalAmount) * 100) / (100 + Number(gstPercentage));
      const calculatedGstAmount = Number(totalAmount) - baseAmount;
      setGstAmount(Number(calculatedGstAmount.toFixed(2)));
    } else if (lastEditedGstField === "amount" && gstAmount && totalAmount) {
      // Calculate GST percentage from amount
      const baseAmount = Number(totalAmount) - Number(gstAmount);
      const calculatedGstPercentage = (Number(gstAmount) / baseAmount) * 100;
      setGstPercentage(Number(calculatedGstPercentage.toFixed(2)));
    }
  }, [gstPercentage, gstAmount, totalAmount, lastEditedGstField]);

  // Handle cash amount change
  const handleCashChange = (value: number | "") => {
    setCashAmount(value);

    if (totalAmount !== "" && value !== "") {
      const calculatedOnline = Number(totalAmount) - Number(value);
      setOnlineAmount(calculatedOnline >= 0 ? calculatedOnline : 0);
    } else if (value === "") {
      setOnlineAmount(totalAmount);
    }
  };

  // Handle online amount change
  const handleOnlineChange = (value: number | "") => {
    setOnlineAmount(value);

    if (totalAmount !== "" && value !== "") {
      const calculatedCash = Number(totalAmount) - Number(value);
      setCashAmount(calculatedCash >= 0 ? calculatedCash : 0);
    } else if (value === "") {
      setCashAmount(totalAmount);
    }
  };

  // Handle total amount change
  const handleTotalChange = (value: number | "") => {
    setTotalAmount(value);

    if (value === "") {
      setOnlineAmount("");
      setCashAmount("");
    } else {
      if (onlineAmount !== "" && cashAmount !== "") {
        const total = Number(onlineAmount) + Number(cashAmount);
        if (total > 0) {
          const newOnline = (Number(onlineAmount) / total) * Number(value);
          const newCash = Number(value) - newOnline;
          setOnlineAmount(Math.round(newOnline * 100) / 100);
          setCashAmount(Math.round(newCash * 100) / 100);
        } else {
          setOnlineAmount(Number(value));
          setCashAmount(0);
        }
      } else if (onlineAmount !== "") {
        if (Number(onlineAmount) > Number(value)) {
          setOnlineAmount(Number(value));
          setCashAmount(0);
        } else {
          setCashAmount(Number(value) - Number(onlineAmount));
        }
      } else if (cashAmount !== "") {
        if (Number(cashAmount) > Number(value)) {
          setCashAmount(Number(value));
          setOnlineAmount(0);
        } else {
          setOnlineAmount(Number(value) - Number(cashAmount));
        }
      } else {
        setOnlineAmount(Number(value));
        setCashAmount(0);
      }
    }
  };

  // Handle GST percentage change
  const handleGstPercentageChange = (value: number | "") => {
    setGstPercentage(value);
    setLastEditedGstField("percentage");
  };

  // Handle GST amount change
  const handleGstAmountChange = (value: number | "") => {
    setGstAmount(value);
    setLastEditedGstField("amount");
  };

  // Validate amounts before saving
  const validateAmounts = (): boolean => {
    const online = Number(onlineAmount) || 0;
    const cash = Number(cashAmount) || 0;
    const total = Number(totalAmount) || 0;

    if (!total) {
      toast({
        variant: "destructive",
        title: "Missing Total Amount",
        description: "Please enter the total amount.",
      });
      return false;
    }

    if (Math.abs(online + cash - total) > 0.01) {
      toast({
        variant: "destructive",
        title: "Invalid Amounts",
        description:
          "The sum of online and cash amounts must equal the total amount.",
      });
      return false;
    }

    if (online + cash === 0) {
      toast({
        variant: "destructive",
        title: "Missing Payment Information",
        description: "Please enter at least one payment method amount.",
      });
      return false;
    }

    return true;
  };

  // Handle Save
  const handleSave = () => {
    if (!areaType) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please select a particular.",
      });
      return;
    }

    if (!validateAmounts()) {
      return;
    }

    const newItem: ProvidedItem = {
      area: areaType as AreaType,
      totalAmount: Number(totalAmount) || 0,
      onlineAmount: Number(onlineAmount) || 0,
      cashAmount: Number(cashAmount) || 0,
      gstPercentage: Number(gstPercentage) || 0,
      gstAmount: Number(gstAmount) || 0,
      brand: brand || "",
      model: model || "",
      remark: remark || "",
      // Add vendor information (this would need to be added to the ProvidedItem interface)
      vendors: assignedVendors,
    };

    setProvidedItems([...providedItems, newItem]);
    handleClear();

    toast({
      title: "Item Added",
      description: "Booked item has been added successfully.",
    });
  };

  // Handle Clear
  const handleClear = () => {
    setAreaType("");
    setTotalAmount("");
    setOnlineAmount("");
    setCashAmount("");
    setGstPercentage("");
    setGstAmount("");
    setBrand("");
    setModel("");
    setRemark("");
    setAssignedVendors([]);
    setLastEditedGstField(null);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Package className="h-5 w-5" /> Book Item
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Add tabs for main/additional items */}
        <Tabs
          value={activeTab}
          onValueChange={(value) =>
            setActiveTab(value as "main" | "additional")
          }
          className="mb-4"
        >
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="main">Main Items</TabsTrigger>
            <TabsTrigger value="additional">Additional Items</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="space-y-4">
          {/* Area Type Dropdown - now shows different options based on tab */}
          <div className="space-y-2">
            <Label htmlFor="areaType">Particulars</Label>
            <Select value={areaType} onValueChange={setAreaType}>
              <SelectTrigger>
                <SelectValue
                  placeholder={`Select ${
                    activeTab === "main" ? "item" : "item"
                  }`}
                />
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

          {/* Total Amount */}
          <div className="space-y-2">
            <Label htmlFor="totalAmount">Total Amount (₹)</Label>
            <Input
              id="totalAmount"
              type="number"
              placeholder="0.00"
              value={totalAmount}
              onChange={(e) => handleTotalChange(Number(e.target.value) || "")}
            />
          </div>

          {/* Online and Cash Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="onlineAmount">Bank Payments (₹)</Label>
              <Input
                id="onlineAmount"
                type="number"
                placeholder="0.00"
                value={onlineAmount}
                onChange={(e) =>
                  handleOnlineChange(Number(e.target.value) || "")
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cashAmount">Cash Payments (₹)</Label>
              <Input
                id="cashAmount"
                type="number"
                placeholder="0.00"
                value={cashAmount}
                onChange={(e) => handleCashChange(Number(e.target.value) || "")}
              />
            </div>
          </div>

          {/* GST Amount and Percentage */}
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
            </div>
          </div>

          {/* Vendor Selection Component */}
          <VendorSelection
            activeTab={activeTab}
            areaType={areaType}
            brand={brand}
            setBrand={setBrand}
            onVendorAssign={handleVendorAssign}
            assignedVendors={assignedVendors}
            onVendorRemove={handleVendorRemove}
          />

          {/* Model Input */}
          <div className="space-y-2">
            <Label htmlFor="model">Model</Label>
            <Input
              id="model"
              placeholder="Enter model name"
              value={model}
              onChange={(e) => setModel(e.target.value)}
            />
          </div>

          {/* Remark Input */}
          <div className="space-y-2">
            <Label htmlFor="remark">Remark</Label>
            <Input
              id="remark"
              placeholder="Add any additional notes"
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
            />
          </div>

          {/* Save and Clear Buttons */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClear}>
              Clear
            </Button>
            <Button onClick={handleSave}>Save</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
