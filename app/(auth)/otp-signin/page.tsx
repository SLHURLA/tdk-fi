"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Input } from "@/components/ui/input"; // Import the normal Input component
import { useRouter } from "next/navigation";
import { CircleAlert } from "lucide-react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useIsMobile } from "@/hooks/use-mobile"; // Import the custom hook

const FormSchema = z.object({
  mobileNo: z.string().length(10, {
    message: "Enter a valid Phone Number",
  }),
  otp: z.string().length(6, {
    message: "The OTP must be exactly 6 digits.",
  }),
});

export default function OTPLoginForm() {
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      mobileNo: "",
      otp: "",
    },
  });

  const { toast } = useToast();
  const router = useRouter();
  const [otpSent, setOtpSent] = useState<boolean>(false);
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const isMobile = useIsMobile(); // Use the custom hook

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const onSubmit = async (data: z.infer<typeof FormSchema>) => {
    const result = await signIn("credentials", {
      redirect: false,
      mobileNo: data.mobileNo,
      otp: data.otp,
    });

    if (result?.error) {
      toast({
        description: (
          <span className="flex items-center gap-2">
            <CircleAlert /> {result.error}
          </span>
        ),
      });
    } else {
      router.push("/");
    }
  };

  const handleSendOtp = async () => {
    const isValid = await form.trigger("mobileNo");
    if (isValid) {
      try {
        const response = await fetch("/api/auth/sendOtp", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            mobileNo: form.getValues("mobileNo"),
          }),
        });

        if (response.ok) {
          setOtpSent(true);
          toast({
            title: "OTP Sent",
            description: "Check your phone for the OTP.",
          });
        } else {
          toast({
            title: "Failed to Send OTP",
            description: "Please try again later.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Error sending OTP:", error);
        toast({
          title: "Error",
          description: "Something went wrong. Please try again.",
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "Invalid Phone Number",
        description: "Please enter a valid 10-digit phone number.",
        variant: "destructive",
      });
    }
  };

  if (!isMounted) {
    return null;
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="lg:w-2/3 w-[80%] space-y-6"
      >
        <div className="flex flex-col gap-3">
          <h2 className="text-xl text-center font-semibold">
            Sign In with OTP
          </h2>
          <p className="text-sm text-center text-[#737373]">
            Enter your phone number to receive an OTP for login.
          </p>
        </div>

        <FormField
          control={form.control}
          name="mobileNo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone Number</FormLabel>
              <FormControl>
                {isMobile ? (
                  <Input
                    type="text"
                    placeholder="Enter your phone number"
                    maxLength={10}
                    {...field}
                  />
                ) : (
                  <InputOTP maxLength={10} {...field}>
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSeparator />
                    </InputOTPGroup>
                    <InputOTPGroup>
                      <InputOTPSlot index={5} />
                      <InputOTPSlot index={6} />
                      <InputOTPSlot index={7} />
                      <InputOTPSlot index={8} />
                      <InputOTPSlot index={9} />
                    </InputOTPGroup>
                  </InputOTP>
                )}
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {!otpSent && (
          <Button type="button" onClick={handleSendOtp} className="lg:w-[80%] w-full">
            Verify and Send Otp
          </Button>
        )}

        {otpSent && (
          <>
            <FormField
              control={form.control}
              name="otp"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>OTP</FormLabel>
                  <FormControl>
                    {isMobile ? (
                      <Input
                        type="text"
                        placeholder="Enter OTP"
                        maxLength={6}
                        {...field}
                      />
                    ) : (
                      <InputOTP maxLength={6} {...field}>
                        <InputOTPGroup>
                          <InputOTPSlot index={0} />
                          <InputOTPSlot index={1} />
                          <InputOTPSlot index={2} />
                          <InputOTPSlot index={3} />
                          <InputOTPSlot index={4} />
                          <InputOTPSlot index={5} />
                        </InputOTPGroup>
                      </InputOTP>
                    )}
                  </FormControl>
                  <FormDescription>
                    Please enter the OTP sent to your phone.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-[80%]">
              Submit
            </Button>
          </>
        )}

        <div className="flex items-center gap-2 my-1">
          <hr className="flex-1 border-gray-300" />
          <span className="text-sm text-gray-600">Or</span>
          <hr className="flex-1 border-gray-300" />
        </div>

        <p className="text-center text-sm text-gray-600">
          <Link href="/sign-in" className="text-blue-500 hover:underline">
            Login with email
          </Link>
        </p>

        <div className="flex items-center gap-2 my-1">
          <hr className="flex-1 border-gray-300" />
          <span className="text-sm text-gray-600">Or</span>
          <hr className="flex-1 border-gray-300" />
        </div>

        <p className="text-center text-sm text-gray-600">
          Don&apos;t have an account?
          <Link href="/sign-up" className="text-blue-500 hover:underline">
            Sign Up
          </Link>
        </p>
      </form>
    </Form>
  );
}
