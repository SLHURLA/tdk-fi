import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Briefcase } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

interface LeadOverviewProps {
  leadId: number;
  displayLeadId: string;
  customer: string;
  phone: string;
  contactInfo: string;
  store: string;
  status: "WON" | "LOSS" | "INPROGRESS";
  createdAt: string; // Used as the base date
  updatedAt: string;
  expectedHandover: string;
}

const LeadOverview: React.FC<LeadOverviewProps> = ({
  leadId,
  displayLeadId,
  customer,
  phone,
  contactInfo,
  store,
  status,
  createdAt,
  updatedAt,
}) => {
  // Logic to calculate "Won At" (createdAt minus 1 day)
  const getWonAtDate = (dateStr: string) => {
    const date = new Date(dateStr);
    // Subtract 1 day (24 hours)
    date.setDate(date.getDate() - 1);

    // Returns format: DD/MM/YYYY (adjust locale as needed)
    return date.toLocaleDateString("en-GB");
  };
  const { toast } = useToast();

  const [customerName, setCustomerName] = useState(customer);
  const [isEditing, setIsEditing] = useState(false);

  const wonAt = getWonAtDate(createdAt);
  const handleUpdateCustomer = async () => {
    if (!customerName.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Customer name cannot be empty",
      });
      return;
    }

    try {
      const res = await fetch("/api/updateCustomerName", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          leadId,
          customerName,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast({
          title: "Success",
          description: "Customer name updated successfully ✅",
        });

        setIsEditing(false);

        window.location.reload(); // or mutate()
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: data.message,
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Something went wrong",
      });
    }
  };

  return (
    <Card className="lg:p-4 shadow-md rounded-lg w-full">
      <CardHeader>
        <CardTitle className="flex items-center font-bold text-2xl gap-2">
          <Briefcase /> Customer Overview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid lg:grid-cols-2 grid-cols-1 gap-3 text-sm">
          {/* Using a cleaner map structure */}
          {[
            { label: "Customer ID", value: displayLeadId },
            // { label: "Customer", value: customer },
            { label: "Phone", value: phone },
            { label: "Contact Info", value: contactInfo },
            { label: "Store", value: store },
            { label: "Won At", value: wonAt }, // Displays the calculated date
          ].map(({ label, value }) => (
            <div
              key={label}
              className="p-2 border rounded-md flex items-center justify-between"
            >
              <span className="font-semibold">{label}:</span>
              <p className="text-right">{value}</p>
            </div>
          ))}
          <div className="p-2 border rounded-md flex items-center justify-between">
            <span className="font-semibold">Customer:</span>

            <div className="flex gap-2 items-center">
              {isEditing ? (
                <>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="border px-2 py-1 rounded"
                  />

                  <Button size="sm" onClick={handleUpdateCustomer}>
                    Save
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setCustomerName(customer);
                      setIsEditing(false);
                    }}
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-right">{customer}</p>

                  <Button size="sm" onClick={() => setIsEditing(true)}>
                    Edit
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Status Field with Dynamic Styling */}
          <div className="p-2 border rounded-md flex items-center justify-between">
            <span className="font-semibold">Status:</span>
            <p
              className={`text-right font-bold w-fit py-1 px-4 rounded-md ${
                status === "WON"
                  ? "text-green-600 bg-lime-200"
                  : status === "INPROGRESS"
                    ? "text-yellow-600 bg-yellow-100"
                    : "text-red-600 bg-red-200"
              }`}
            >
              {status}
            </p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="text-gray-500 text-sm text-center">
        Last updated: {updatedAt}
      </CardFooter>
    </Card>
  );
};

export default LeadOverview;
