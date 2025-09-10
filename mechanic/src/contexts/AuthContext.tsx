import React, {
  createContext,
  useContext,
  useState,
  useEffect,

} from 'react';
import { authAPI } from '../services/api';
import type { User } from '../types';
import type {ReactNode} from "react"
interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (
    identifier: string,
    password: string,
    role: string,
    loginMethod: 'email' | 'phone'
  ) => Promise<void>;
  updateProfile: (
    updatedData: { name?: string; email?: string; password?: string }
  ) => Promise<void>;
  logout: () => Promise<void>;
  garageId: string;
  getDetail: () => Promise<unknown>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children
}) => {
  const [garageId] = useState<string>('Guest');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const userData = await authAPI.getCurrentUser();
        setUser(userData);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    checkSession();
  }, []);

  const login = async (
    identifier: string,
    password: string,
    role: string,
    loginMethod: 'email' | 'phone'
  ) => {
    await authAPI.login(identifier, password, role, loginMethod);
    const userData = await authAPI.getCurrentUser();
    setUser(userData);
  };

  const updateProfile = async (updatedData: {
    name?: string;
    email?: string;
    password?: string;
  }) => {
    try {
      const updatedUser = await authAPI.updateProfile(updatedData);
      setUser(updatedUser); // update the context
    } catch (error) {
      console.error('Profile update failed:', error);
      throw error;
    }
  };

  const getDetail = async () => {
    try {
      const data = await fetch(`${import.meta.env.VITE_API_URL}/api/garage`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        method: 'GET'
      });
      const response = await data.json();
      console.log(response);
      return response;
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.log(error.message);
      }
      throw error;
    }
  };

  const logout = async () => {
    await authAPI.logout(); // remove session from backend
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        updateProfile,
        logout,
        garageId,
        getDetail
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
