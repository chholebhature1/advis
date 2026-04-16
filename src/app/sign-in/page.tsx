import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import AuthForm from "@/components/AuthForm";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Access your Pravix account.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function SignInPage() {
  return (
    <>
      <SiteHeader />
      <main className="min-h-screen bg-finance-bg pt-28 pb-16">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center px-6">
          <AuthForm mode="signin" />
        </div>
      </main>
    </>
  );
}