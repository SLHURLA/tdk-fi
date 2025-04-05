"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

interface Transaction {
  transactionName: string;
  transactionType: string;
  paymentMethod: string;
  amount: number;
  remark?: string;
  transactionDate: string | number | Date;
  vendorId?: number;
}

interface ProvidedItem {
  area: string;
  brand?: string;
  model?: string;
  remark?: string;
  payInCash: number;
  payInOnline: number;
  gst: number;
}

interface AdditionalItem {
  category: string;
  prodName: string;
  custPrice: number;
  landingPrice?: number;
  model?: string;
  make?: string;
  gst: number;
}

interface CustomerData {
  lead_id: string;
  customerName: string;
  phoneNo: string;
  contactInfo: string;
  store: string;
  createdAt: string | number | Date;
  expectedHandoverDate: string | number | Date;
  status: string;
  totalProjectCost: number;
  payInCash: number;
  payInOnline: number;
  receiveCash: number;
  receiveOnline: number;
  totalExp: number;
  additionalItemsCost: number;
  totalGST: number;
  ProvidedItems?: ProvidedItem[];
  additionalItems?: AdditionalItem[];
  transactions?: Transaction[];
  vendors?: any[];
}

const PDFDownloadButton = ({ data }: { data: CustomerData }) => {
  const generatePDF = () => {
    const doc = new jsPDF();
    const darkGreen = [34, 139, 34] as [number, number, number]; // Explicit tuple

    // Set document properties
    doc.setProperties({
      title: `Customer Ledger - ${data.customerName}`,
      subject: `Lead ID: ${data.lead_id}`,
      author: "Customer Invoice System",
      creator: "Customer Invoice System",
    });

    // Format currency with Rs symbol
    const formatRupee = (amount: number) => {
      if (amount < 0) {
        return `Rs. -${Math.abs(amount).toLocaleString()}`;
      }
      return `Rs. ${amount.toLocaleString()}`;
    };

    // Add company header with darker green
    doc.setFillColor(...darkGreen);
    doc.rect(0, 0, 210, 20, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.text("Customer Ledger", 105, 13, { align: "center" });

    // Customer Information section
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);

    // Customer details table
    autoTable(doc, {
      startY: 25,
      body: [
        ["Phone No", data.phoneNo, "Customer Name", data.customerName],
        ["Booking Date", new Date(data.createdAt).toLocaleDateString("en-GB")],
      ],
      theme: "striped",
      styles: { fontSize: 10, cellPadding: 2 },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 30 },
        1: { cellWidth: 60 },
        2: { fontStyle: "bold", cellWidth: 30 },
        3: { cellWidth: 60 },
      },
    });

    const paidAmount = data.receiveCash + data.receiveOnline;
    // Calculate remaining amount
    const remainingAmount =
      data.totalProjectCost - (data.receiveCash + data.receiveOnline);

    // Financial Summary
    let yPos = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(14);
    doc.setTextColor(46, 204, 113); // Greenish color for heading
    doc.text("Financial Summary", 14, yPos);

    // Paid amount box (positioned at 100)
    doc.setFillColor(255, 255, 0); // Yellow background
    doc.rect(85, yPos - 5, 50, 8, "F");
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.text(`Paid: ${formatRupee(paidAmount)}`, 90, yPos + 0.5);

    // Balance box (positioned at 160 - right of paid amount)
    doc.setFillColor(255, 255, 0); // Yellow background
    doc.rect(145, yPos - 5, 50, 8, "F");
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.text(`Balance: ${formatRupee(remainingAmount)}`, 150, yPos + 0.5);

    autoTable(doc, {
      startY: yPos + 5,
      body: [
        ["Total Project Cost", formatRupee(data.totalProjectCost)],
        ["Cash Payments", formatRupee(data.receiveCash)],
        ["Bank Payments", formatRupee(data.receiveOnline)],
      ],
      theme: "plain",
      styles: { fontSize: 10, cellPadding: 2 },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 50 },
        1: { cellWidth: "auto" },
      },
    });

    // Booked Items
    yPos = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(14);
    doc.setTextColor(...darkGreen);
    doc.text("Booked Items", 14, yPos);

    if (data.ProvidedItems && data.ProvidedItems.length > 0) {
      autoTable(doc, {
        startY: yPos + 5,
        head: [["Area", "Brand", "Model", "Remark", "Total Amount"]],
        body: data.ProvidedItems.map((item) => [
          item.area || "-",
          item.brand || "-",
          item.model || "-",
          item.remark || "-",
          formatRupee(item.payInCash + item.payInOnline),
        ]),
        theme: "striped",
        headStyles: {
          fillColor: darkGreen,
          textColor: [255, 255, 255],
        },
        styles: { fontSize: 10, cellPadding: 2 },
      });
    } else {
      // Handle empty state by creating a mini table that indicates no items
      autoTable(doc, {
        startY: yPos + 5,
        body: [["No booked items found."]],
        theme: "plain",
        styles: { fontSize: 10, cellPadding: 4, textColor: [100, 100, 100] },
      });
    }

    // Additional Items
    // yPos = (doc as any).lastAutoTable.finalY + 15; // Increased spacing
    // doc.setFontSize(14);
    // doc.setTextColor(...darkGreen);
    // doc.text("Additional Items", 14, yPos);

    // if (data.additionalItems && data.additionalItems.length > 0) {
    //   autoTable(doc, {
    //     startY: yPos + 5,
    //     head: [["Category", "Product", "Model", "Make", "Price"]],
    //     body: data.additionalItems.map((item) => [
    //       item.category || "-",
    //       item.prodName || "-",
    //       item.model || "-",
    //       item.make || "-",
    //       formatRupee(item.custPrice),
    //     ]),
    //     theme: "striped",
    //     headStyles: {
    //       fillColor: darkGreen,
    //       textColor: [255, 255, 255],
    //     },
    //     styles: { fontSize: 10, cellPadding: 2 },
    //   });
    // } else {
    //   // Handle empty state with a proper table instead of just text
    //   autoTable(doc, {
    //     startY: yPos + 5,
    //     body: [["No additional items found."]],
    //     theme: "plain",
    //     styles: { fontSize: 10, cellPadding: 4, textColor: [100, 100, 100] },
    //   });
    // }

    // Transaction Notes (only CLIENT_PAYMENT)
    yPos = (doc as any).lastAutoTable.finalY + 15; // Increased spacing
    doc.setFontSize(14);
    doc.setTextColor(...darkGreen);
    doc.text("Client Payments", 14, yPos);

    const clientPayments = data.transactions?.filter(
      (t) => t.transactionName === "CLIENT_PAYMENT"
    );

    if (clientPayments && clientPayments.length > 0) {
      autoTable(doc, {
        startY: yPos + 5,
        head: [["Date", "Type", "Amount", "Method", "Description"]],
        body: clientPayments.map((note) => [
          new Date(note.transactionDate).toLocaleDateString("en-GB"),
          note.transactionType === "CASH_IN" ? "Payment In" : "Payment Out",
          formatRupee(note.amount),
          note.paymentMethod === "ONLINE" ? "Bank" : "Cash",
          note.remark || "-",
        ]),
        theme: "striped",
        headStyles: {
          fillColor: darkGreen,
          textColor: [255, 255, 255],
        },
        styles: { fontSize: 10, cellPadding: 2 },
        columnStyles: {
          2: { halign: "right" },
        },
      });
    } else {
      // Handle empty state with a proper table
      autoTable(doc, {
        startY: yPos + 5,
        body: [["No client payments found."]],
        theme: "plain",
        styles: { fontSize: 10, cellPadding: 4, textColor: [100, 100, 100] },
      });
    }

    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(
        `Page ${i} of ${pageCount} • Generated on ${new Date().toLocaleDateString(
          "en-GB"
        )}`,
        105,
        doc.internal.pageSize.height - 10,
        { align: "center" }
      );
    }

    // Save the PDF
    doc.save(`Invoice_${data.lead_id}_${data.customerName}.pdf`);
  };

  return (
    <Button onClick={generatePDF} className="gap-2">
      <Download className="h-4 w-4" />
    </Button>
  );
};

export default PDFDownloadButton;
