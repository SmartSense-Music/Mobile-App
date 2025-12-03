import {
  useAuth as useClerkAuth,
  useUser as useClerkUser,
} from "@clerk/clerk-expo";
import React, { createContext, useContext } from "react";

// Simple User Type (Mapped from Clerk)
export type UserData = {
  id: string;
  name: string;
  email?: string;
  imageUrl?: string;
};

type AuthContextType = {
  user: UserData | null;
  signIn: () => void;
  signOut: () => void;
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { signOut, isLoaded } = useClerkAuth();
  const { user: clerkUser, isLoaded: isUserLoaded } = useClerkUser();

  const isLoading = !isLoaded || !isUserLoaded;

  const user: UserData | null = clerkUser
    ? {
        id: clerkUser.id,
        name: clerkUser.fullName || clerkUser.firstName || "User",
        email: clerkUser.primaryEmailAddress?.emailAddress,
        imageUrl: clerkUser.imageUrl,
      }
    : null;

  const signIn = () => {
    // This function is kept for compatibility.
    // With Clerk, you typically navigate to a dedicated Sign In screen
    // or use the <SignIn /> component directly.
    console.log("Navigate to Sign In Screen");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        signIn,
        signOut: () => signOut(),
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
