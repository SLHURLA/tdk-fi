"use client";

import React, { useEffect, useState } from "react";
import { Bell, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useSession } from "next-auth/react";
import useSWR, { mutate } from "swr";
import { Separator } from "@radix-ui/react-dropdown-menu";

interface Notification {
  notiId: number;
  type: string;
  message: string;
  createdAt: string;
  read: boolean;
}

// Utility function to format createdAt timestamp
const formatTimestamp = (createdAt: string) => {
  const now = new Date();
  const notificationDate = new Date(createdAt);

  // Handle invalid dates
  if (isNaN(notificationDate.getTime())) {
    return "Invalid date";
  }

  const diffInMilliseconds = now.getTime() - notificationDate.getTime();
  const diffInHours = Math.abs(
    Math.floor(diffInMilliseconds / (1000 * 60 * 60))
  );

  if (diffInHours < 24 && notificationDate.getDate() === now.getDate()) {
    return `${diffInHours} hour${diffInHours !== 1 ? "s" : ""} ago`;
  } else {
    return notificationDate.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    });
  }
};

const CardDemo = ({
  notifications,
  isLoading,
  error,
  onMarkAsRead,
}: {
  notifications: Notification[];
  isLoading: boolean;
  error: string | null;
  onMarkAsRead: (notiId: number | "all") => void;
}) => {
  const unreadCount = notifications?.filter((noti) => !noti.read).length || 0;

  return (
    <Card className="lg:w-[380px] w-[300px]">
      <CardHeader>
        <CardTitle>Notifications</CardTitle>
        <CardDescription>
          You have {unreadCount} unread message{unreadCount !== 1 ? "s" : ""}.
        </CardDescription>
        {/* Separator */}
      </CardHeader>
      <CardContent className="grid gap-4 border-y -mt-4 pt-4">
        <div className="max-h-64 overflow-y-auto">
          {isLoading ? (
            <p>Loading...</p>
          ) : error ? (
            <p className="text-red-500">{error}</p>
          ) : (
            notifications?.map((notification) => (
              <div
                key={notification.notiId}
                className="mb-4 flex items-center justify-between pb-4 last:mb-0 last:pb-0 cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-2 w-2 rounded-full ${
                      notification.read ? "bg-gray-500" : "bg-sky-500"
                    }`}
                  />
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {notification.message}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatTimestamp(notification.createdAt)}
                    </p>
                  </div>
                </div>
                {!notification.read && (
                  <div
                    className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                    onClick={() => onMarkAsRead(notification.notiId)}
                  >
                    <Check className="h-4 w-4 text-gray-500 dark:text-gray-400 hover:text-green-500 dark:hover:text-green-400" />
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Button className="w-full mt-4" onClick={() => onMarkAsRead("all")}>
          <Check className="mr-2 h-4 w-4" /> Mark all as read
        </Button>
      </CardFooter>
    </Card>
  );
};

const fetcher = async (url: string) => {
  const response = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) throw new Error("Failed to fetch Notifications");

  const data = await response.json();
  console.log("Notifications", data);
  return data.notification; // Return the notifications array
};

const NotificationButton = () => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { data: session } = useSession();

  const { data, isLoading, error } = useSWR(
    session?.user?.id ? `/api/getNotification/${session.user.id}` : null,
    fetcher
  );

  const unreadCount =
    data?.filter((noti: Notification) => !noti.read).length || 0;

  const markAsRead = async (notiId: number | "all") => {
    try {
      if (notiId === "all") {
        // Mark all unread notifications as read
        const unreadNotifications =
          data?.filter((noti: Notification) => !noti.read) || [];
        await Promise.all(
          unreadNotifications.map((noti: Notification) =>
            fetch(`/api/setNotification/${noti.notiId}`, {
              method: "GET",
            })
          )
        );
      } else {
        // Mark a single notification as read
        await fetch(`/api/setNotification/${notiId}`, {
          method: "GET",
        });
      }

      // Optimistically update the UI
      mutate(
        `/api/getNotification/${session?.user.id}`,
        (prevData?: Notification[]) => {
          if (!prevData) return []; // Ensure `prevData` is not undefined
          return prevData.map((noti) =>
            notiId === "all" || noti.notiId === notiId
              ? { ...noti, read: true }
              : noti
          );
        },
        false
      );
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  return (
    <DropdownMenu>
      {mounted && (
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" className="relative">
            <Bell className="h-[1.4rem] w-[1.4rem] transition-all" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-2 h-3 w-3 flex items-center justify-center rounded-full bg-[red] text-[8px] p-1 text-white">
                {unreadCount}
              </span>
            )}
            <span className="sr-only">Toggle notifications</span>
          </Button>
        </DropdownMenuTrigger>
      )}
      <DropdownMenuContent align="end" className="p-0 w-auto">
        <CardDemo
          notifications={data || []}
          isLoading={isLoading}
          error={error?.message}
          onMarkAsRead={markAsRead}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationButton;
