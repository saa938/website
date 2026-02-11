"use client";

import { UserProvider } from "@/components/hooks/UserContext";
import CookieBanner from "@/components/global/CookieBanner";
import React from "react";

export default function RootLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <UserProvider>
      {children}
      <CookieBanner />
    </UserProvider>
  );
}
