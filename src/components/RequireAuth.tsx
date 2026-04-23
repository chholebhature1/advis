"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type RequireAuthProps = {
  children: React.ReactNode;
  redirectTo?: string;
};

export default function RequireAuth({ children, redirectTo = "/login" }: RequireAuthProps) {
  const router = useRouter();
  const [isAllowed, setIsAllowed] = useState(false);
  const [isResolved, setIsResolved] = useState(false);

  useEffect(() => {
    let mounted = true;

    const supabase = (() => {
      try {
        return getSupabaseBrowserClient();
      } catch {
        return null;
      }
    })();

    if (!supabase) {
      router.replace(redirectTo);
      return;
    }

    async function verifySession() {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error || !session?.user) {
          router.replace(redirectTo);
          return;
        }

        if (mounted) {
          setIsAllowed(true);
        }
      } catch {
        router.replace(redirectTo);
      } finally {
        if (mounted) {
          setIsResolved(true);
        }
      }
    }

    void verifySession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) {
        return;
      }

      if (!session?.user) {
        setIsAllowed(false);
        router.replace(redirectTo);
        return;
      }

      setIsAllowed(true);
      setIsResolved(true);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [redirectTo, router]);

  if (!isResolved || !isAllowed) {
    return null;
  }

  return <>{children}</>;
}
