import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import AuthForm from "@/components/AuthForm";

export const metadata: Metadata = {
  title: "Create Account",
  description: "Create your Pravix account to start personalized wealth planning.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function CreateAccountPage() {
  return (
    <>
      <SiteHeader />
      <main className="min-h-screen bg-finance-bg pt-28 pb-16">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center px-6">
          <AuthForm mode="signup" />
        </div>
      </main>
    </>
  );
}