'use client';

import { createContext, useContext } from 'react';

export interface AdminContextType {
  token: string | null;
  logout: () => void;
}

export const AdminContext = createContext<AdminContextType>({
  token: null,
  logout: () => {},
});

export const useAdmin = () => useContext(AdminContext);
