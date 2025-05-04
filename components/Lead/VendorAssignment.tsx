import { useState, useEffect } from "react";
import { Loader2, Search, Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSession } from "next-auth/react";

interface Vendor {
  id: string;
  name: string;
  city: string;
}

interface VendorSelectionProps {
  activeTab: "main" | "additional";
  areaType: string;
  brand: string;
  setBrand: (brand: string) => void;
  onVendorAssign: (vendor: Vendor) => void;
  assignedVendors: Vendor[];
  onVendorRemove: (vendorId: string) => void;
}

const VendorSelection: React.FC<VendorSelectionProps> = ({
  activeTab,
  areaType,
  brand,
  setBrand,
  onVendorAssign,
  assignedVendors,
  onVendorRemove,
}) => {
  const { data: session } = useSession();
  const [searchResults, setSearchResults] = useState<Vendor[]>([]);
  const [filteredResults, setFilteredResults] = useState<Vendor[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [nameFilter, setNameFilter] = useState("");
  const [searchTab, setSearchTab] = useState<"search" | "all">("search");
  const [allVendors, setAllVendors] = useState<Vendor[]>([]);
  const [allVendorsLoaded, setAllVendorsLoaded] = useState(false);

  // Define brand options for different item types
  const sinkBrands = [
    "Anupam Sink",
    "Morzze Sink",
    "Hafele Water Solution",
    "Carysil Sink",
  ];

  const applianceBrands = [
    "Hafele Appliances",
    "Bosch Appliances",
    "Electrolux",
  ];

  const isSink = areaType === "Sink";
  const isAppliance = areaType === "Appliances";
  const shouldShowBrandDropdown = isSink || isAppliance;

  const getBrandOptions = () => {
    if (isSink) return sinkBrands;
    if (isAppliance) return applianceBrands;
    return [];
  };

  const searchVendors = async () => {
    if (!areaType) return;

    setIsSearching(true);

    try {
      const params = new URLSearchParams();
      if (areaType) params.append("item", areaType);
      if (brand) params.append("brand", brand);

      const response = await fetch(`/api/getReqVendor?${params.toString()}`);

      if (!response.ok) {
        throw new Error("Failed to fetch vendors");
      }

      const data = await response.json();
      setSearchResults(data.data || []);
    } catch (error) {
      console.error("Error fetching vendors:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const fetchAllVendors = async () => {
    setIsSearching(true);

    try {
      const response = await fetch("/api/getAllVendors");

      if (!response.ok) {
        throw new Error("Failed to fetch all vendors");
      }

      const data = await response.json();
      const vendors = data.vendors || [];
      setAllVendors(vendors);
      setSearchResults(vendors);
      setAllVendorsLoaded(true);
    } catch (error) {
      console.error("Error fetching all vendors:", error);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    const vendorsToFilter = searchTab === "search" ? searchResults : allVendors;

    if (nameFilter.trim() === "") {
      setFilteredResults(vendorsToFilter);
      return;
    }

    const filtered = vendorsToFilter.filter(
      (vendor) =>
        vendor.name.toLowerCase().includes(nameFilter.toLowerCase()) ||
        (vendor.city &&
          vendor.city.toLowerCase().includes(nameFilter.toLowerCase()))
    );

    setFilteredResults(filtered);
  }, [nameFilter, searchResults, allVendors, searchTab]);

  useEffect(() => {
    setFilteredResults(searchResults);
  }, [searchResults]);

  useEffect(() => {
    if (searchTab === "search") {
      setSearchResults([]);
      setFilteredResults([]);
      setNameFilter("");
    } else {
      setFilteredResults(allVendorsLoaded ? allVendors : []);
      setNameFilter("");
    }
  }, [searchTab, allVendors, allVendorsLoaded]);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="brand">Brand</Label>
        {shouldShowBrandDropdown ? (
          <Select value={brand} onValueChange={setBrand}>
            <SelectTrigger id="brand">
              <SelectValue placeholder="Select brand" />
            </SelectTrigger>
            <SelectContent>
              {getBrandOptions().map((brandOption) => (
                <SelectItem key={brandOption} value={brandOption}>
                  {brandOption}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            id="brand"
            placeholder="Enter brand name"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
          />
        )}
      </div>

      <Tabs
        value={searchTab}
        onValueChange={(value) => setSearchTab(value as "search" | "all")}
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="search">Search Vendors</TabsTrigger>
          <TabsTrigger value="all">All Vendors</TabsTrigger>
        </TabsList>

        <TabsContent value="search" className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center gap-2">
              <Button
                onClick={searchVendors}
                disabled={
                  isSearching ||
                  !areaType ||
                  (!brand && shouldShowBrandDropdown)
                }
                className="flex-shrink-0"
              >
                {isSearching ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Search className="h-4 w-4 mr-2" />
                )}
                Fetch Vendors
              </Button>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                className="pl-10"
                placeholder="Filter vendors by name"
                value={nameFilter}
                onChange={(e) => setNameFilter(e.target.value)}
                disabled={searchResults.length === 0}
              />
            </div>

            {shouldShowBrandDropdown && !brand && (
              <div className="text-amber-500 text-sm mt-1">
                Please select a brand to search vendors
              </div>
            )}
          </div>

          {renderVendorResults()}
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          <div className="flex justify-between items-center">
            <Button
              onClick={fetchAllVendors}
              disabled={isSearching}
              variant="outline"
              className="flex-shrink-0"
            >
              {isSearching ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Search className="h-4 w-4 mr-2" />
              )}
              Fetch All Vendors
            </Button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              className="pl-10"
              placeholder="Filter vendors by name"
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
              disabled={!allVendorsLoaded}
            />
          </div>

          {renderVendorResults()}
        </TabsContent>
      </Tabs>

      {assignedVendors.length > 0 && (
        <Card className="mt-4">
          <CardContent className="pt-4">
            <Label className="mb-2 block">Assigned Vendors</Label>
            <div className="flex flex-wrap gap-2">
              {assignedVendors.map((vendor) => (
                <Badge
                  key={vendor.id}
                  variant="secondary"
                  className="px-3 py-1 flex items-center gap-1"
                >
                  {vendor.name}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 ml-1 p-0 hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => onVendorRemove(vendor.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  function renderVendorResults() {
    if (isSearching) {
      return (
        <div className="flex items-center justify-center p-4 border rounded-md">
          <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
          <span>Searching for vendors...</span>
        </div>
      );
    }

    // Filter vendors based on session.user.store
    const filteredVendors = filteredResults.filter(
      (vendor) => session?.user?.store && vendor.city === session.user.store
    );

    if (filteredVendors.length > 0) {
      return (
        <div className="border rounded-md divide-y">
          {filteredVendors.map((vendor) => (
            <div
              key={vendor.id}
              className="flex items-center justify-between p-3 hover:bg-muted/20"
            >
              <span className="font-medium">
                {vendor.name}
                {vendor.city && ` (${vendor.city})`}
              </span>
              <Button
                size="sm"
                variant="outline"
                className="flex items-center gap-1"
                onClick={() => onVendorAssign(vendor)}
                disabled={assignedVendors.some((v) => v.id === vendor.id)}
              >
                <Plus className="h-4 w-4" />
                Assign
              </Button>
            </div>
          ))}
        </div>
      );
    }

    if (
      nameFilter &&
      filteredResults.length > 0 &&
      filteredVendors.length === 0
    ) {
      return (
        <div className="flex items-center justify-center p-4 border rounded-md text-muted-foreground">
          No vendors in {session?.user?.store} match your search filter.
        </div>
      );
    }

    if (filteredResults.length > 0 && filteredVendors.length === 0) {
      return (
        <div className="flex items-center justify-center p-4 border rounded-md text-muted-foreground">
          No vendors available in {session?.user?.store}.
        </div>
      );
    }

    if (
      searchTab === "search" &&
      searchResults.length === 0 &&
      !isSearching &&
      shouldShowBrandDropdown &&
      !brand
    ) {
      return (
        <div className="flex items-center justify-center p-4 border rounded-md text-muted-foreground">
          Please select a brand to search for vendors.
        </div>
      );
    }

    if (
      searchTab === "search" &&
      searchResults.length === 0 &&
      !isSearching &&
      areaType
    ) {
      return (
        <div className="flex items-center justify-center p-4 border rounded-md text-muted-foreground">
          Click "Fetch Vendors" to search for vendors.
        </div>
      );
    }

    if (searchTab === "all" && !allVendorsLoaded && !isSearching) {
      return (
        <div className="flex items-center justify-center p-4 border rounded-md text-muted-foreground">
          Click "Fetch All Vendors" to see available vendors.
        </div>
      );
    }

    return (
      <div className="flex items-center justify-center p-4 border rounded-md text-muted-foreground">
        {searchTab === "search"
          ? "Select an item type and brand, then click 'Fetch Vendors'."
          : "No vendors loaded."}
      </div>
    );
  }
};

export default VendorSelection;
