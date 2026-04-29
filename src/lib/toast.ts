type ToastType = "success" | "error" | "warning";

export function toast(message: string, type: ToastType = "success") {
  window.dispatchEvent(new CustomEvent("app-toast", { detail: { message, type } }));
}
