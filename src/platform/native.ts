import { Capacitor } from '@capacitor/core';

/** Build flag: the iOS/native build sets VITE_NATIVE=true. The public web build never does. */
export const NATIVE_BUILD = import.meta.env.VITE_NATIVE === 'true';
/** Debug tools (mock-purchase toggles). Hidden unless built/run with a dev flag. */
export const DEV_TOOLS = import.meta.env.DEV || import.meta.env.VITE_DEV_TOOLS === 'true';
/** True only inside the real Capacitor app (WKWebView), not in a browser. */
export const onDevice = () => Capacitor.isNativePlatform();
