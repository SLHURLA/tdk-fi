import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Briefcase } from "lucide-react";
import { Button } from "../ui/button";
import { toast } from "@/hooks/use-toast";

interface LeadOverviewProps {
  // leadId: string;
  // leadId: number;
  leadId: number; // backend use
  displayLeadId: string; // UI display
  customer: string;
  phone: string;
  contactInfo: string;
  store: string;
  status: "WON" | "LOSS" | "INPROGRESS";
  createdAt: string;
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
  expectedHandover,
}) => {
  const [handoverDate, setHandoverDate] = useState(
    expectedHandover
      ? new Date(expectedHandover.split("/").reverse().join("-"))
          .toISOString()
          .split("T")[0]
      : "",
  );
  // const handleUpdate = async () => {
  //   if (!handoverDate) {
  //     alert("Please select date");
  //     return;
  //   }

  //   const res = await fetch("/api/updateHandoverDate", {
  //     method: "POST",
  //     headers: {
  //       "Content-Type": "application/json",
  //     },
  //     body: JSON.stringify({
  //       leadId,
  //       expectedHandoverDate: handoverDate,
  //     }),
  //   });

  //   const data = await res.json();

  //   if (res.ok) {
  //     alert("Handover date updated ✅");
  //   } else {
  //     alert(data.message || "Error");
  //   }
  // };
  const handleUpdate = async () => {
  if (!handoverDate) {
    toast({
      variant: "destructive",
      title: "Error",
      description: "Please select a date",
    });
    return;
  }

  try {
    const res = await fetch("/api/updateHandoverDate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        leadId,
        expectedHandoverDate: handoverDate,
      }),
    });

    const data = await res.json();

    if (res.ok) {
      toast({
        variant: "default",
        title: "Success",
        description: "Expected handover date updated successfully ✅",
      });

      // 🔥 OPTIONAL: refresh UI
      window.location.reload();
    } else {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: data.message || "Something went wrong",
      });
    }
  } catch (error) {
    toast({
      variant: "destructive",
      title: "Error",
      description: "Server error, please try again",
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
            // { label: "Customer ID", value: leadId },
            { label: "Customer ID", value: displayLeadId },
            { label: "Customer", value: customer },
            { label: "Phone", value: phone },
            { label: "Contact Info", value: contactInfo },
            { label: "Store", value: store },
            { label: "Created At", value: createdAt },
            // { label: "Expected Handover", value: expectedHandover },
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
            <span className="font-semibold">Expected Handover:</span>

            <div className="flex gap-2 items-center">
              <input
                type="date"
                value={handoverDate}
                onChange={(e) => setHandoverDate(e.target.value)}
                className="border px-2 py-1 rounded"
              />

              <Button size="sm" onClick={handleUpdate}>
                Save
              </Button>
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
