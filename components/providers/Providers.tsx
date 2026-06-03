"use client";

import { SessionProvider } from "next-auth/react";
import { ContentProvider } from "@/components/providers/ContentProvider";
import { EditProvider } from "@/components/providers/EditProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ContentProvider>
        <EditProvider>{children}</EditProvider>
      </ContentProvider>
    </SessionProvider>
  );
}
