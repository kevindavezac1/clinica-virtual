"use client";
import { toast } from "@/lib/toast";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

interface Props {
  children: React.ReactNode;
  allowedRole?: string | string[];
}

export default function ProtectedRoute({ children, allowedRole }: Props) {
  const { isLoggedIn, isReady, user } = useAuth();
  const router = useRouter();

  const allowed = !allowedRole || (
    Array.isArray(allowedRole)
      ? allowedRole.includes(user?.rol ?? "")
      : user?.rol === allowedRole
  );

  useEffect(() => {
    if (!isReady) return;
    if (!isLoggedIn) {
      router.push("/");
      return;
    }
    if (!allowed) {
      toast("No tenés permisos para acceder a esta página", "error");
      router.push("/");
    }
  }, [isReady, isLoggedIn, allowed, router]);

  if (!isReady) return null;
  if (!isLoggedIn || !allowed) return null;

  return <>{children}</>;
}
