"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type AppRole =
  | "SUPER_ADMIN"
  | "BRANCH_ADMIN"
  | "FRONT_OFFICE"
  | "DOCTOR"
  | "NURSE"
  | "BILLING";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: AppRole;
  facilityId?: string;
  facilityName?: string;
};

type AuthState = {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean; // 1. Add this property to the type
  login: (user: AuthUser, token: string) => void;
  logout: () => void;
};

function setAuthCookie() {
  document.cookie = `excelcare_auth=1; Path=/; SameSite=Lax`;
}

function clearAuthCookie() {
  document.cookie = `excelcare_auth=; Max-Age=0; Path=/; SameSite=Lax`;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false, // 2. Initialize it here

      login: (user, token) => {
        setAuthCookie();
        // 3. Set it to true on login
        set({ user, token, isAuthenticated: true });
      },

      logout: async () => {
        try {
          await fetch('http://localhost:4000/api/auth/logout', { method: 'POST' });
        } finally {
          // Always clear local state even if backend fails
          localStorage.removeItem('access_token');
          clearAuthCookie(); // (Optional) Good practice to clear the cookie helper too
          
          // 4. Set it to false on logout (and ensure token is cleared)
          set({ user: null, token: null, isAuthenticated: false });
        }
      }
    }),
    {
      name: "excelcare-auth",
      storage: createJSONStorage(() => localStorage),
      // 5. Ensure it is persisted (optional, but consistent)
      partialize: (s) => ({ user: s.user, token: s.token, isAuthenticated: s.isAuthenticated }),
    }
  )
);