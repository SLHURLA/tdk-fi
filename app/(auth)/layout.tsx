import auth from "@/public/auth.jpg";
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex">
      {/* Left side with background image and overlay */}
      <div
        className="flex-1 relative bg-cover bg-center py-10 lg:flex hidden flex-col justify-between items-start text-white"
        style={{ backgroundImage: `url(${auth.src})` }}
      >
        {/* Black overlay */}
        <div className="absolute inset-0 bg-black/40 z-0"></div>

        {/* Content above the overlay */}
        <div className="relative z-10 mx-10">
        
        </div>

        <div className="relative z-10 mx-10 flex flex-col gap-1">
          <p className="text-lg">
            &quot;One place to manage all your data.&quot;
          </p>
          
        </div>
      </div>

      {/* Right side */}
      <div className="flex-1 flex items-center justify-center flex-col relative">
        {children}
      </div>
    </div>
  );
}
