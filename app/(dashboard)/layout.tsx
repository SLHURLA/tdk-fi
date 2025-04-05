import Navbar from "@/components/Navbar/Navbar";
import { AppSidebar } from "@/components/Sidebar/Sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/toaster";
import auth_wallppr from "@/public/auth.webp";
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SidebarProvider>
        <AppSidebar />
        <div className="w-full">
          <Navbar />
          <div className="min-h-screen flex mt-24 lg:px-12 px-4 justify-center">
            {children}
          </div>
          <Toaster />
        </div>
      </SidebarProvider>
    </>
  );
}
