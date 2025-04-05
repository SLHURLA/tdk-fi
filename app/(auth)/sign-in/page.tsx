"use client";

import { useForm } from "react-hook-form";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { CircleAlert } from "lucide-react";
import { signIn } from "next-auth/react";
import { useState } from "react";

// Validation schema
const SignInSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

const SignIn = () => {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const form = useForm({
    resolver: zodResolver(SignInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof SignInSchema>) => {
    setIsLoading(true);
    try {
      const signInData = await signIn("credentials", {
        email: values.email,
        password: values.password,
        redirect: false,
      });

      if (!signInData || signInData.error) {
        toast({
          description: (
            <span className="flex items-center gap-2">
              <CircleAlert /> {signInData?.error || "Wrong Credentials!!!"}
            </span>
          ),
        });
        return;
      }

      router.push("/");
    } catch (error) {
      console.error("Sign-in error:", error);
      toast({
        description: (
          <span className="flex items-center gap-2">
            <CircleAlert /> An unexpected error occurred!
          </span>
        ),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="w-full">
        <div className="lg:w-[45%] w-[80%] flex flex-col gap-3 mx-auto">
          <h2 className="text-xl text-center font-semibold">
            Sign In to Your Account
          </h2>
          <p className="text-sm text-center text-[#737373]">
            Enter your email and password to login.
          </p>

          <div className="space-y-2">
            <div className="">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="mail@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 gap-4">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Enter your password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button className="w-full mt-4" type="submit" disabled={isLoading}>
              {isLoading ? "Signing In" : "SignIn"}
            </Button>
          </div>

          {/* <div className="flex items-center gap-2 my-1">
            <hr className="flex-1 border-gray-300" />
            <span className="text-sm text-gray-600">Or</span>
            <hr className="flex-1 border-gray-300" />
          </div> */}

          {/* <p className="text-center text-sm text-gray-600">
            <Link href="/otp-signin" className="text-blue-500 hover:underline">
              Login using OTP
            </Link>
          </p> */}

          <div className="flex items-center gap-2 my-1">
            <hr className="flex-1 border-gray-300" />
            <span className="text-sm text-gray-600">Or</span>
            <hr className="flex-1 border-gray-300" />
          </div>

          <p className="text-center text-sm text-gray-600">
            Don&apos;t have an account?{" "}
            <Link href="/sign-up" className="text-blue-500 hover:underline">
              Sign Up
            </Link>
          </p>
        </div>
      </form>
    </Form>
  );
};

export default SignIn;
