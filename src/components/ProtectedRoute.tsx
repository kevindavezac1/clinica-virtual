"use client";
import { toast } from "@/lib/toast";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

interface Props {
  children: React.ReactNode;
  allowedRole?: string;
}

export default function ProtectedRoute({ children, allowedRole }: Props) {
  const { isLoggedIn, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoggedIn) {
      router.push("/");
      return;
    }
    if (allowedRole && user?.rol !== allowedRole) {
      toast("No tenés permisos para acceder a esta página", "error");
      router.push("/");
    }
  }, [isLoggedIn, user, allowedRole, router]);

  if (!isLoggedIn || (allowedRole && user?.rol !== allowedRole)) {
    return null;
  }

  return <>{children}</>;
}
