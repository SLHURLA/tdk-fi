"use client";
import * as React from "react";
import { usePathname } from "next/navigation";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  AppWindow,
  FilePlus,
  Settings,
  ClipboardList,
  UserRoundPlus,
  Loader,
  Plus,
  BoxIcon,
  Receipt,
  Users2,
} from "lucide-react";
import Image from "next/image";
import logo from "@/public/logo-light.webp";
import { useSession } from "next-auth/react";
import Signup from "../SignupForm/page";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "../ui/skeleton";
import AddVendor from "../VendorManagement/Vendors";

// Type definitions for navigation data
interface NavItem {
  title: string;
  url?: string;
  //@ts-ignore
  icon?: JSX.Element;
  dialog: boolean;
  //@ts-ignore
  dialogContent?: JSX.Element;
  requiredRole: string;
}

interface NavMain {
  title: string;
  url?: string;
  items: NavItem[];
  requiredRole: string;
}

interface Store {
  store: string;
  userId: number;
}

const roleHierarchy: { [key: string]: number } = {
  ADMIN: 3,
  SUPER_HEAD: 2,
  STORE_MANAGER: 1,
};

export function AppSidebar() {
  const pathname = usePathname();
  const noSidebarPages = ["/sign-in", "/sign-up", "/", "/otp-signin"];
  const { data: session, status } = useSession();
  const loading = status === "loading";
  const [stores, setStores] = React.useState<Store[]>([]);
  const [client, setClient] = React.useState(false);
  const [dialogOpen,setDialogOpen] = React.useState(false)
  console.log("Stores", stores);
  React.useEffect(() => {
    setClient(true); // Ensures the component only runs hydration on the client
  }, []);

   const closeDialog = () => {
     setDialogOpen(false);
   };
  React.useEffect(() => {
    if (session) {
      const fetchStores = async () => {
        try {
          const response = await fetch("/api/getStores");
          if (!response.ok) throw new Error("Failed to fetch stores");
          const data = await response.json();
          setStores(data.stores);
          console.log("here we go", data.stores);
        } catch (error) {
          console.error("Error fetching stores:", error);
        }
      };
      fetchStores();
    }
  }, [session]);

  const navigationData: NavMain[] = [
    {
      title: "Dashboard",
      url: "/tsmgowp",
      requiredRole: "STORE_MANAGER",
      items: [
        {
          title: "Dashboard",
          url: "/tsmgowp",
          icon: <AppWindow className="w-4 h-4" />,
          dialog: false,
          requiredRole: "STORE_MANAGER",
        },
      ],
    },
    {
      title: "Customer's Type",
      url: "/tsmgowp/leads",
      requiredRole: "STORE_MANAGER",
      items: [
        {
          title: "Live Customers",
          url: "/tsmgowp/leads/processing",
          icon: <Loader className="w-4 h-4" />,
          dialog: false,
          requiredRole: "STORE_MANAGER",
        },
        {
          title: "Fresh Customers",
          url: "/tsmgowp/leads/new",
          icon: <FilePlus className="w-4 h-4" />,
          dialog: false,
          requiredRole: "STORE_MANAGER",
        },
        {
          title: "All Customers",
          url: "/tsmgowp/leads/all",
          icon: <ClipboardList className="w-4 h-4" />,
          dialog: false,
          requiredRole: "STORE_MANAGER",
        },
      ],
    },
    {
      title: "Store Management",
      requiredRole: "SUPER_HEAD",
      items: [
        {
          title: "Create Store",
          icon: <Plus className="w-4 h-4" />,
          dialog: true,
          dialogContent: <Signup onClose={closeDialog} />,
          requiredRole: "ADMIN",
        },
      ],
    },
    {
      title: "Vendor Management",
      requiredRole: "STORE_MANAGER",
      items: [
        {
          title: "Add Vendor",
          icon: <Plus className="w-4 h-4" />,
          url: "/tsmgowp/vendor/addVendor",
          dialog: false,
          requiredRole: "STORE_MANAGER",
        },
        {
          title: "Vendor Dashboard",
          url: "/tsmgowp/vendor/dashboard",
          icon: <BoxIcon className="w-4 h-4" />,
          dialog: false,
          requiredRole: "STORE_MANAGER",
        },
      ],
    },
    {
      title: "Expense Management",
      requiredRole: "STORE_MANAGER",
      items: [
        {
          title: "Store Expenses",
          icon: <Receipt className="w-4 h-4" />, // Use the Receipt icon
          url: `/tsmgowp/expenses/${session && session?.user?.id}`, // Use userId from session
          dialog: false,
          requiredRole: "STORE_MANAGER",
        },
      ],
    },
    {
      title: "User Management",
      requiredRole: "ADMIN",
      items: [
        {
          title: "Users",
          icon: <Users2 className="w-4 h-4" />, // Use the Receipt icon
          url: `/tsmgowp/users`, // Use userId from session
          dialog: false,
          requiredRole: "ADMIN",
        },
      ],
    },
  ];

  React.useEffect(() => {
    console.log("Updated session:", session);
  }, [session]);

  if (typeof window === "undefined") return null;
  if (!client || noSidebarPages.includes(pathname)) return null; // Avoid hydration mismatch

  if (session) {
    console.log("session", session);
  }
  return (
    <Sidebar className="fixed inset-y-0 left-0 z-50 w-64 border-r ">
      {/* <div className="flex items-center justify-center px-4 border-b">
        <Image
          src={logo || "/placeholder.svg"}
          alt="Logo"
          width={120}
          className="h-auto"
        />
      </div> */}
      <ScrollArea className="flex-grow">
        <SidebarContent className="p-4">
          {navigationData.map((group) => {
            let items = group.items;
            const showGroup = session?.user?.role
              ? roleHierarchy[session.user.role] >=
                roleHierarchy[group.requiredRole]
              : group.title === "Dashboard" || group.title === "Leads"; // Always show Dashboard & Leads

            if (group.title === "Store Management") {
              if (!session?.user?.role) {
                return (
                  <SidebarGroup key={group.title} className="mb-2">
                    <SidebarGroupLabel className="text-sm font-semibold text-gray-500 mb-2">
                      {group.title}
                    </SidebarGroupLabel>
                    <SidebarGroupContent>
                      <SidebarMenu>
                        {[1, 2, 3].map((_, index) => (
                          <SidebarMenuItem key={index} className="mb-1">
                            <Skeleton className="h-6 w-40" />
                          </SidebarMenuItem>
                        ))}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </SidebarGroup>
                );
              }

              items = [
                ...group.items,
                ...stores.map((store) => ({
                  title: store.store,
                  url: `/tsmgowp/store-management/${store.userId}`,
                  icon: <BoxIcon className="w-4 h-4" />,
                  dialog: false,
                  requiredRole: "SUPER_HEAD",
                })),
              ];
            }

            return (
              showGroup && (
                <SidebarGroup key={group.title} className="mb-1">
                  <SidebarGroupLabel className="text-sm font-semibold text-gray-500 mb-1">
                    {group.title}
                  </SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {items.map((item) => {
                        const isActive = pathname === item.url;
                        const showItem =
                          !session ||
                          (session.user?.role &&
                            roleHierarchy[session.user.role] >=
                              roleHierarchy[item.requiredRole]);

                        return (
                          showItem && (
                            <SidebarMenuItem
                              key={item.url || item.title}
                              className="mb-1"
                            >
                              <SidebarMenuButton asChild isActive={isActive}>
                                {item.dialog ? (
                                  <Dialog
                                    open={dialogOpen}
                                    onOpenChange={setDialogOpen}
                                  >
                                    <DialogTrigger asChild>
                                      <button className="w-full text-left flex items-center px-3 py-2 text-sm rounded-md hover:bg-gray-300 dark:hover:bg-gray-800 transition-colors">
                                        {item.icon}
                                        <span className="ml-3">
                                          {item.title}
                                        </span>
                                      </button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-[425px]">
                                      {item.dialogContent}
                                    </DialogContent>
                                  </Dialog>
                                ) : (
                                  <a
                                    href={item.url}
                                    className="flex items-center px-3 py-2 text-sm rounded-md transition-colors"
                                  >
                                    {item.icon}
                                    <span className="ml-3">{item.title}</span>
                                  </a>
                                )}
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          )
                        );
                      })}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              )
            );
          })}
        </SidebarContent>
      </ScrollArea>
    </Sidebar>
  );
}
