import React from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastOptions {
  type: ToastType;
  message: string;
}

export interface ToastContextType {
  showToast: (options: ToastOptions) => void;
}

export const ToastContext = React.createContext<ToastContextType | undefined>(undefined);
