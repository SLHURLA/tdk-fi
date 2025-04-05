"use client"

import StoreManagementLeads from "@/components/Leads/StoreManagementLeads";
import { useParams } from "next/navigation";
export default function StoreLeads() {
  
  const { id } =  useParams()

  return <StoreManagementLeads  url={`getStoreLead/${id}`} />;
}
