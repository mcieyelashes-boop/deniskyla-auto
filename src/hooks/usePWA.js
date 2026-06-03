import { useState, useEffect } from "react";

export function usePWA() {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [swReady, setSwReady] = useState(false);

  useEffect(() => {
    // Register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js")
        .then(() => setSwReady(true))
        .catch(e => console.warn("SW registration failed:", e));
    }
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }
    // Capture install prompt
    const handler = (e) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const install = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === "accepted") setIsInstalled(true);
    setInstallPrompt(null);
  };

  const requestNotifications = async () => {
    if (!("Notification" in window)) return false;
    const permission = await Notification.requestPermission();
    return permission === "granted";
  };

  return { installPrompt, isInstalled, swReady, install, requestNotifications };
}
