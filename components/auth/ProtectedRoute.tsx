"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type UserRole = "admin" | "cliente";

type ProtectedRouteProps = {
  allowedRole: UserRole;
  redirectTo?: string;
  children: ReactNode;
};

export function ProtectedRoute({
  allowedRole,
  redirectTo = "/login",
  children,
}: ProtectedRouteProps) {
  const router = useRouter();
  const [isAllowed, setIsAllowed] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const checkAccess = async () => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        if (isMounted) router.replace(redirectTo);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError || profile?.role !== allowedRole) {
        if (isMounted) router.replace(redirectTo);
        return;
      }

      if (isMounted) {
        setIsAllowed(true);
        setIsChecking(false);
      }
    };

    void checkAccess();

    return () => {
      isMounted = false;
    };
  }, [allowedRole, redirectTo, router]);

  if (isChecking || !isAllowed) return null;
  return <>{children}</>;
}
