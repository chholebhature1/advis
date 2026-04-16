import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Profile",
  description: "Personal profile for signed-in Pravix users.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return children;
}
