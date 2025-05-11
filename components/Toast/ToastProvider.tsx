import React, { useCallback, useState } from 'react';
import { ToastContext, ToastOptions } from './ToastContext';
import ToastContainer from './ToastContainer';

interface Props {
  children: React.ReactNode;
}

const ToastProvider: React.FC<Props> = ({ children }) => {
  const [toast, setToast] = useState<ToastOptions | null>(null);

  const showToast = useCallback((options: ToastOptions) => {
    setToast(null); // Reset first
    setTimeout(() => setToast(options), 50); // slight delay to re-trigger
  }, []);

  const hideToast = () => setToast(null);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ToastContainer toast={toast} onHide={hideToast} />
    </ToastContext.Provider>
  );
};

export default ToastProvider;
