/**
 * Toast notification component for Lumerisca
 * Shows temporary notifications to users
 */

import { useState, useEffect } from "react";

export type ToastType = "info" | "success" | "warning" | "error";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

/**
 * Toast container component
 */
export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  return (
    <div
      style={{
        position: "fixed",
        bottom: "20px",
        right: "20px",
        zIndex: 10000,
        display: "flex",
        flexDirection: "column",
        gap: "10px",
      }}
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}

/**
 * Individual toast item
 */
function ToastItem({
  toast,
  onRemove,
}: {
  toast: Toast;
  onRemove: (id: string) => void;
}) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove(toast.id);
    }, toast.duration || 4000);

    return () => clearTimeout(timer);
  }, [toast, onRemove]);

  const colors = {
    info: { bg: "#1f2937", border: "#3b82f6", icon: "ℹ️" },
    success: { bg: "#065f46", border: "#10b981", icon: "✓" },
    warning: { bg: "#92400e", border: "#f59e0b", icon: "⚠️" },
    error: { bg: "#7f1d1d", border: "#ef4444", icon: "✕" },
  };

  const color = colors[toast.type];

  return (
    <div
      style={{
        background: color.bg,
        borderLeft: `4px solid ${color.border}`,
        borderRadius: "6px",
        padding: "12px 16px",
        minWidth: "300px",
        maxWidth: "400px",
        color: "#e5e7eb",
        fontSize: "14px",
        display: "flex",
        alignItems: "center",
        gap: "12px",
        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.3)",
        animation: "slideIn 0.3s ease-out",
      }}
    >
      <span style={{ fontSize: "18px" }}>{color.icon}</span>
      <span style={{ flex: 1 }}>{toast.message}</span>
      <button
        onClick={() => onRemove(toast.id)}
        style={{
          background: "transparent",
          border: "none",
          color: "#9ca3af",
          cursor: "pointer",
          fontSize: "16px",
          padding: "0 4px",
        }}
      >
        ×
      </button>
    </div>
  );
}

/**
 * Hook for managing toasts
 */
export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (message: string, type: ToastType = "info", duration?: number) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, type, duration }]);
    return id;
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const toast = {
    info: (message: string, duration?: number) => addToast(message, "info", duration),
    success: (message: string, duration?: number) => addToast(message, "success", duration),
    warning: (message: string, duration?: number) => addToast(message, "warning", duration),
    error: (message: string, duration?: number) => addToast(message, "error", duration),
  };

  return { toasts, toast, removeToast };
}
