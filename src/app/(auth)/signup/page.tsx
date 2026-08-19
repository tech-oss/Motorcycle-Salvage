import type { Metadata } from "next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata: Metadata = { title: "Create account — Motorcycle Salvage" };

export default function SignupPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Create account</CardTitle>
        <CardDescription>
          New accounts start with read-only access until an administrator
          assigns a role.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <SignupForm />
      </CardContent>
    </Card>
  );
}
