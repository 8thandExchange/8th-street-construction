"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { staffCanOpenPath, type StaffScope } from "@/lib/auth/staff-scope";

export function AdminPathGuard({
  staffScope,
  children,
}: {
  staffScope: StaffScope;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const allowed = staffCanOpenPath(staffScope, pathname);

  useEffect(() => {
    if (!allowed) router.replace("/admin");
  }, [allowed, router]);

  if (!allowed) return null;
  return <>{children}</>;
}
