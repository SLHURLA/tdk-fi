"use client";
import React, { useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface User {
  userId: number;
  store: string;
}

// Fetcher function for SWR
const fetcher = (url: string) =>
  fetch(url)
    .then((res) => res.json())
    .then((res) => res.stores);

const UserManagement: React.FC = () => {
  // State for confirmation dialog
  const [confirmOpen, setConfirmOpen] = useState<boolean>(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const { toast } = useToast();

  // Fetch stores data using SWR
  const { data: stores, error, mutate } = useSWR("/api/getStores", fetcher);
  console.log("USER MANAGEMENT", stores);
  // Handle reset password
  const handleResetPassword = async (): Promise<void> => {
    if (!selectedUser) return;

    setIsResetting(true);
    try {
      const response = await fetch("/api/resetPassword", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: selectedUser.userId }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Success",
          description: data.message || "Password reset successfully",
        });
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to reset password",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsResetting(false);
      setConfirmOpen(false);
      setSelectedUser(null);
    }
  };

  // Show confirmation dialog
  const showResetConfirmation = (user: User): void => {
    setSelectedUser(user);
    setConfirmOpen(true);
  };

  if (error)
    return <div className="p-4 text-red-500">Failed to load user data</div>;
  if (!stores) return <div className="p-4">Loading user data...</div>;

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">User Management</h1>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">User ID</TableHead>
              <TableHead>Store</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stores &&
              stores.map((user: User) => (
                <TableRow key={user.userId}>
                  <TableCell className="font-medium">{user.userId}</TableCell>
                  <TableCell>{user.store}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => showResetConfirmation(user)}
                    >
                      Reset Password
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Are you sure you want to reset the password for user{" "}
              {selectedUser?.userId} ({selectedUser?.store})? 
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={isResetting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleResetPassword}
              disabled={isResetting}
              className="bg-red-500 hover:bg-red-600"
            >
              {isResetting ? "Resetting..." : "Reset Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagement;
