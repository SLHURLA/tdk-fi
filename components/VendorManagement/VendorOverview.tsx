import React from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Briefcase } from "lucide-react";

interface VendorOverviewProps {
  id: number;
  name: string;
  mobileNo: string;
  address: string;
  city: string;
  TotalCharge: number;
  GivenCharge: number;
  createdAt: string;
  leads: {
    id: number;
    lead_id: string;
    customerName: string;
    phoneNo: string;
    contactInfo: string;
    store: string;
    status: "WON" | "LOSS" | "INPROGRESS";
    expectedHandoverDate: string;
  }[];
}

const VendorOverview: React.FC<VendorOverviewProps> = ({
  id,
  name,
  mobileNo,
  address,
  city,
  TotalCharge,
  GivenCharge,
  createdAt,
  leads,
}) => {
  return (
    <Card className="lg:p-4  shadow-md rounded-lg w-full">
      <CardHeader>
        <CardTitle className="flex items-center font-bold lg:text-2xl text-lg gap-2">
          <Briefcase /> Vendor Overview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid lg:grid-cols-2 grid-cols-1 gap-3 lg:text-sm text-xs">
          {[
            { label: "Vendor ID", value: id },
            { label: "Name", value: name },
            { label: "Mobile No", value: mobileNo },
            { label: "Address", value: address },
            { label: "City", value: city },
            {
              label: "Total Charge",
              value: `₹${TotalCharge.toLocaleString()}`,
            },
            {
              label: "Given Charge",
              value: `₹${GivenCharge.toLocaleString()}`,
            },
            {
              label: "First Assigned At",
              value: new Date(createdAt).toLocaleDateString("en-GB"),
            },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="p-2 border rounded-md flex items-center justify-between"
            >
              <span className="font-semibold">{label}:</span>
              <p className="text-right">{value}</p>
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter className="text-gray-500 text-sm text-center">
        Number of Assigned Leads: {leads.length}
      </CardFooter>
    </Card>
  );
};

export default VendorOverview;
