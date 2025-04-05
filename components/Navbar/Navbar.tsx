"use client";
import React from "react";
import ThemeButton from "../Buttons/ThemeButton";
import NotificationButton from "../Buttons/NotificationButton";
import { UserAvatar } from "../Buttons/Avatar";
import { usePathname } from "next/navigation";
import { useIsMobile } from "@/hooks/use-mobile";

import Image from "next/image";
import { SidebarTrigger } from "../ui/sidebar";
const Navbar = () => {
  const pathname = usePathname();
  const isMobile = useIsMobile();

  const noNavbarPages = ["/sign-in", "/sign-up", "/", "/otp-signin"];

  if (noNavbarPages.includes(pathname)) return null;

  if (isMobile) {
    return (
      <nav className="fixed top-0 right-0 w-full flex justify-between items-center  px-12 py-2 border-b backdrop-blur-sm z-40">
        <div>
          
        </div>
        <div className="flex flex-row gap-4 items-center">
          <ThemeButton />
          <NotificationButton />
          <UserAvatar />
          <SidebarTrigger/>
        </div>
      </nav>
    );
  }

  return (
    <nav className="fixed top-0 right-0 w-full flex justify-end items-end gap-2 px-12 py-2 border-b backdrop-blur-sm z-40">
      <ThemeButton />
      <NotificationButton />
      <UserAvatar />
    </nav>
  );
};

export default Navbar;
