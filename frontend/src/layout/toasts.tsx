import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/outline";
import { Toaster } from "react-hot-toast";

const iconClasses = "stroke-current shrink-0 h-8 w-8";

export function Toasts() {
  return (
    <Toaster
      position="bottom-right"
      toastOptions={{
        duration: 5000,
        error: { className: "!alert !alert-error", icon: <XCircleIcon className={iconClasses} /> },
        success: { className: "!alert !alert-success", icon: <CheckCircleIcon className={iconClasses} /> },
      }}
    />
  );
}
