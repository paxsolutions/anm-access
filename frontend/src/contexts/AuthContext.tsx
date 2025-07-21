import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import axios, { AxiosError } from 'axios';
import { UserProfile, AuthProviderProps } from '../types/auth';
import { api } from '../api';

interface AuthState {
  user: UserProfile | null;
  loading: boolean;
  error: string | null;
}

interface AuthContextType extends AuthState {
  isAuthenticated: boolean;
  login: () => void;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null
  });

  const setAuthState = useCallback((newState: Partial<AuthState>) => {
    setState(prev => ({ ...prev, ...newState }));
  }, []);

  const checkUserLoggedIn = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      const { data } = await api.get<UserProfile>('/auth/current_user');

      // Check if the response is an empty object or has no user data
      const isValidUser = data && typeof data === 'object' && Object.keys(data).length > 0 && data.id;

      if (isValidUser) {
        setState({ user: data, loading: false, error: null });
        return data;
      } else {
        setState({ user: null, loading: false, error: null });
        return null;
      }
    } catch (error) {
      const axiosError = error as AxiosError;
      // Don't treat 401 as an error - it just means user is not logged in
      if (axiosError.response?.status !== 401) {
        console.error('Authentication check failed:', axiosError.message);
        setState(prev => ({
          ...prev,
          loading: false,
          error: 'Failed to check authentication status'
        }));
      } else {
        setState({ user: null, loading: false, error: null });
      }
      return null;
    }
  }, []);

  const login = useCallback(() => {
    // Store the current path to redirect back after login
    const returnTo = window.location.pathname;
    const backendUrl = process.env.REACT_APP_API_URL || 'http://localhost:5001';
    const authUrl = `${backendUrl}/auth/google?returnTo=${encodeURIComponent(returnTo)}`;
    window.location.href = authUrl;
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    try {
      setState(prev => ({ ...prev, loading: true }));
      await axios.post('/auth/logout');
      setState({ user: null, loading: false, error: null });
      // Don't redirect here - let the component handle the redirect
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error('Logout failed:', axiosError.message);
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to log out. Please try again.'
      }));
      // Even if logout fails, clear the user from state
      setState(prev => ({ ...prev, user: null }));
    }
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Initial auth check
  useEffect(() => {
    checkUserLoggedIn();
  }, [checkUserLoggedIn]);

  const value: AuthContextType = {
    ...state,
    isAuthenticated: !!(state.user && typeof state.user === 'object' && Object.keys(state.user).length > 0),
    login,
    logout,
    clearError
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};