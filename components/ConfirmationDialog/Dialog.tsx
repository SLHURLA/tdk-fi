import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import React from "react";

interface ConfimartionDialogProps {
  title: string; // Title of the dialog
  description: string; // Description of the dialog
  triggerText?: string; // Text for the trigger button
  triggerVariant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link"; // Variant for the trigger button
  onConfirm: () => void; // Function to execute on confirmation
  onCancel?: () => void; // Function to execute on cancellation
  isOpen?: boolean; // Controlled state for dialog visibility
  setIsOpen?: (open: boolean) => void; // Function to control dialog visibility
}

export function ConfimartionDialog({
  title,
  description,
  triggerText = "Show Dialog",
  triggerVariant = "outline",
  onConfirm,
  onCancel,
  isOpen,
  setIsOpen,
}: ConfimartionDialogProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      {/* Trigger Button */}
      <AlertDialogTrigger asChild>
        <Button variant={triggerVariant}>{triggerText}</Button>
      </AlertDialogTrigger>

      {/* Dialog Content */}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          {/* Cancel Button */}
          <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
          {/* Confirm Button */}
          <AlertDialogAction onClick={onConfirm}>Continue</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
