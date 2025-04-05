import React from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Briefcase } from "lucide-react";

interface LeadOverviewProps {
  leadId: string;
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
  customer,
  phone,
  contactInfo,
  store,
  status,
  createdAt,
  updatedAt,
  expectedHandover,
}) => {
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
            { label: "Customer ID", value: leadId },
            { label: "Customer", value: customer },
            { label: "Phone", value: phone },
            { label: "Contact Info", value: contactInfo },
            { label: "Store", value: store },
            { label: "Created At", value: createdAt },
            { label: "Expected Handover", value: expectedHandover },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="p-2 border rounded-md flex items-center justify-between"
            >
              <span className="font-semibold">{label}:</span>
              <p className="text-right">{value}</p>
            </div>
          ))}

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
