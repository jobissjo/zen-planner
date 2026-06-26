import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { ApiResponse, AuthSession } from "../types";
import { api, registerAuthFailureListener } from "./api";
import AsyncStorage from "@react-native-async-storage/async-storage";

const SESSION_KEY = "weekly_planner_session_v1";

interface AuthCtx {
  session: AuthSession | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<ApiResponse<AuthSession>>;
  loginWithGoogle: (credential: string) => Promise<ApiResponse<AuthSession>>;
  logout: () => void;
  register: (params: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    otp: string;
  }) => Promise<AuthSession>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load session from AsyncStorage
    AsyncStorage.getItem(SESSION_KEY)
      .then((raw) => {
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === "object") {
              if ("status" in parsed && parsed.status === "success" && "data" in parsed) {
                setSession(parsed.data);
                api.setAuthToken(parsed.data.access_token);
              } else {
                setSession(parsed);
                api.setAuthToken(parsed.access_token);
              }
            }
          } catch {}
        }
      })
      .catch((err) => {
        console.warn("Failed to load session from AsyncStorage:", err);
      })
      .finally(() => {
        setLoading(false);
      });

    // Listen to token refresh failures
    registerAuthFailureListener(() => {
      setSession(null);
    });
  }, []);

  const login = async (email: string, password: string) => {
    const s = await api.login(email, password);
    try {
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(s.data));
    } catch (err) {
      console.warn("Failed to save session to AsyncStorage:", err);
    }
    setSession(s.data);
    api.setAuthToken(s.data.access_token);
    return s;
  };

  const loginWithGoogle = async (credential: string) => {
    const s = await api.loginWithGoogle(credential);
    try {
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(s.data));
    } catch (err) {
      console.warn("Failed to save session to AsyncStorage:", err);
    }
    setSession(s.data);
    api.setAuthToken(s.data.access_token);
    return s;
  };

  const register = async (params: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    otp: string;
  }) => {
    const s = await api.register(params);
    try {
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(s));
    } catch (err) {
      console.warn("Failed to save session to AsyncStorage:", err);
    }
    setSession(s);
    api.setAuthToken(s.access_token);
    return s;
  };

  const logout = () => {
    AsyncStorage.removeItem(SESSION_KEY).catch((err) => {
      console.warn("Failed to remove session from AsyncStorage:", err);
    });
    setSession(null);
    api.setAuthToken("");
  };


  return (
    <Ctx.Provider value={{ session, loading, login, loginWithGoogle, logout, register }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used within AuthProvider");
  return c;
}
