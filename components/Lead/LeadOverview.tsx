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
  status: "WON" | "INPROGRESS" | "LOSS" | "CLOSED";
  createdAt: string;
  updatedAt: string;
  expectedHandover: string;
  handoverDate?: string | null;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  WON: {
    label: "Won",
    className: "text-green-700 bg-green-100",
  },
  INPROGRESS: {
    label: "In Progress",
    className: "text-yellow-700 bg-yellow-100",
  },
  CLOSED: {
    label: "Closed",
    className: "text-blue-700 bg-blue-100",
  },
  LOSS: {
    label: "Loss",
    className: "text-red-700 bg-red-100",
  },
};

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
  handoverDate,
}) => {
  const { toast } = useToast();
  const [customerName, setCustomerName] = useState(customer);
  const [isEditing, setIsEditing] = useState(false);

  const getWonAtDate = (dateStr: string) => {
    const date = new Date(dateStr);
    date.setDate(date.getDate() - 1);
    return date.toLocaleDateString("en-GB");
  };

  const wonAt = getWonAtDate(createdAt);

  const { label: statusLabel, className: statusClassName } =
    statusConfig[status] ?? { label: status, className: "text-gray-700 bg-gray-100" };

  const closedDateDisplay =
    status === "CLOSED" && handoverDate
      ? new Date(handoverDate).toLocaleDateString("en-GB")
      : null;

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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, customerName }),
      });

      const data = await res.json();

      if (res.ok) {
        toast({
          title: "Success",
          description: "Customer name updated successfully ✅",
        });
        setIsEditing(false);
        window.location.reload();
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: data.message,
        });
      }
    } catch {
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
          {[
            { label: "Customer ID", value: displayLeadId },
            { label: "Phone", value: phone },
            { label: "Contact Info", value: contactInfo },
            { label: "Store", value: store },
            { label: "Won At", value: wonAt },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="p-2 border rounded-md flex items-center justify-between"
            >
              <span className="font-semibold">{label}:</span>
              <p className="text-right">{value}</p>
            </div>
          ))}

          {/* Editable customer name */}
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

          {/* Status badge */}
          <div className="p-2 border rounded-md flex items-center justify-between">
            <span className="font-semibold">Status:</span>
            <span className={`font-bold py-1 px-4 rounded-md ${statusClassName}`}>
              {statusLabel}
            </span>
          </div>

          {/* Closed On — only visible when status is CLOSED and handoverDate exists */}
          {closedDateDisplay && (
            <div className="p-2 border rounded-md flex items-center justify-between">
              <span className="font-semibold">Closed On:</span>
              <p className="text-right">{closedDateDisplay}</p>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="text-gray-500 text-sm text-center">
        Last updated: {updatedAt}
      </CardFooter>
    </Card>
  );
};

export default LeadOverview;