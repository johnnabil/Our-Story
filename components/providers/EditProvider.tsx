"use client";

import { signIn, useSession } from "next-auth/react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

interface EditContextValue {
  isEditing: boolean;
  toggleEdit: () => void;
  canEdit: boolean;
}

const EditContext = createContext<EditContextValue | undefined>(undefined);

export function EditProvider({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { status } = useSession();
  const [isEditing, setIsEditing] = useState(false);

  const canEdit = status === "authenticated";

  useEffect(() => {
    if (!canEdit && isEditing) {
      setIsEditing(false);
    }
  }, [canEdit, isEditing]);

  const toggleEdit = useCallback(() => {
    if (!canEdit) {
      void signIn("credentials");
      return;
    }

    setIsEditing((previous) => !previous);
  }, [canEdit]);

  const contextValue = useMemo<EditContextValue>(
    () => ({
      isEditing,
      toggleEdit,
      canEdit
    }),
    [isEditing, toggleEdit, canEdit]
  );

  return <EditContext.Provider value={contextValue}>{children}</EditContext.Provider>;
}

export function useEdit() {
  const context = useContext(EditContext);

  if (!context) {
    throw new Error("useEdit must be used within an EditProvider");
  }

  return context;
}
