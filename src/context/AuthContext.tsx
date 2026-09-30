import React, { createContext, useContext, useState, useEffect } from "react";

interface User {
  id: number;
  name: string;
  role: "admin" | "loja";
  email: string;
  avatar_url?: string;
}

interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  login: (token: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(() => {
    const storedUser = sessionStorage.getItem("user");
    if (!storedUser || storedUser === "undefined" || storedUser === "null") {
      return null;
    }
    try {
      return JSON.parse(storedUser);
    } catch {
      return null;
    }
  });
  useEffect(() => {
    // No longer needed, state is initialized synchronously
  }, []);

  const login = (token: string, user: User) => {
    sessionStorage.setItem("token", token);
    sessionStorage.setItem("user", JSON.stringify(user));
    setUser(user);
  };

  const logout = () => {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    setUser(null);
  };

  const updateUserInfo = (newUser: User | null) => {
    if (newUser) {
      sessionStorage.setItem("user", JSON.stringify(newUser));
    } else {
      sessionStorage.removeItem("user");
    }
    setUser(newUser);
  };

  return (
    <AuthContext.Provider
      value={{ user, setUser: updateUserInfo, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
