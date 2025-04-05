"use client";

import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useSession } from "next-auth/react";

const cities = [
  "Dehradun",
  "Haridwar",
  "Patiala",
  "Haldwani",
  "Lucknow",
  "Jaipur",
];

const FormSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name cannot exceed 100 characters"),
  address: z
    .string()
    .min(1, "Address is required")
    .max(1000, "Address cannot exceed 1000 characters"),
  mobileNo: z
    .string()
    .min(10, "Mobile number must be exactly 10 digits")
    .max(10, "Mobile number must be exactly 10 digits")
    .regex(/^\d{10}$/, "Mobile number must contain only digits"),
  city: z.string().min(1, "City selection is required"),
});

const AddVendor = () => {
  const router = useRouter();
  const { toast } = useToast();
  const { data: session } = useSession();

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      name: "",
      address: "",
      mobileNo: "",
      city: session?.user?.role === "STORE_MANAGER" ? session.user.store : "", // Pre-fill city for STORE_MANAGER
    },
  });

  const onSubmit = async (values: z.infer<typeof FormSchema>) => {
    const response = await fetch("/api/addVendor", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(values),
    });

    if (response.ok) {
      toast({ description: "Vendor Added Successfully" });
      router.push("/tsmgowp/vendor/dashboard");
    } else {
      toast({ description: "Failed to create vendor" });
    }
  };

  return (
    <div className="w-[80%] mx-auto h-fit mt-10 p-6 border border-gray-300 rounded-lg">
      <h2 className="text-xl font-semibold text-center mb-4">Add a Vendor</h2>
      <div className="mx-auto h-fit p-6 border border-gray-300 rounded-lg">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Name Field */}
            <div className="flex flex-col items-center">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="w-[50%]">
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Vendor Name" {...field} />
                    </FormControl>
                    <FormMessage className="text-red-500 text-sm" />
                  </FormItem>
                )}
              />
            </div>

            {/* Address Field */}
            <div className="flex flex-col items-center">
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem className="w-[50%]">
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input placeholder="Vendor Address" {...field} />
                    </FormControl>
                    <FormMessage className="text-red-500 text-sm" />
                  </FormItem>
                )}
              />
            </div>

            {/* Mobile Number Field */}
            <div className="flex flex-col items-center">
              <FormField
                control={form.control}
                name="mobileNo"
                render={({ field }) => (
                  <FormItem className="w-[50%]">
                    <FormLabel>Mobile No.</FormLabel>
                    <FormControl>
                      <Input
                        type="text" // Changed to text to avoid number input issues
                        placeholder="Mobile No."
                        {...field}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, ""); // Allow only digits
                          field.onChange(value);
                        }}
                      />
                    </FormControl>
                    <FormMessage className="text-red-500 text-sm" />
                  </FormItem>
                )}
              />
            </div>

            {/* City Field */}
            <div className="flex flex-col items-center">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem className="w-[50%]">
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      {session?.user?.role === "STORE_MANAGER" ? (
                        // Uneditable input for STORE_MANAGER
                        <Input
                          value={session.user.store}
                          readOnly
                          className="cursor-not-allowed"
                        />
                      ) : (
                        // Editable dropdown for other roles
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a City" />
                          </SelectTrigger>
                          <SelectContent>
                            {cities.map((city) => (
                              <SelectItem key={city} value={city}>
                                {city}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </FormControl>
                    <FormMessage className="text-red-500 text-sm" />
                  </FormItem>
                )}
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-center">
              <Button className="w-[50%]" type="submit">
                Add Vendor
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
};

export default AddVendor;
