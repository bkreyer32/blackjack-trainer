import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { onDevice } from './native';

export type HapticKind = 'tap' | 'success' | 'error';
let enabled = true;
export const setHapticsEnabled = (on: boolean) => { enabled = on; };
export const hapticsEnabled = () => enabled;

/** Native haptics (iOS Taptic Engine). A no-op on the web and when the Settings toggle is off. */
export function haptic(kind: HapticKind): void {
  if (!enabled || !onDevice()) return;
  try {
    if (kind === 'tap') void Haptics.impact({ style: ImpactStyle.Light });
    else void Haptics.notification({ type: kind === 'success' ? NotificationType.Success : NotificationType.Error });
  } catch { /* haptics unavailable */ }
}
/** Success/error buzz for a graded answer. */
export const hapticResult = (correct: boolean) => haptic(correct ? 'success' : 'error');

/** One delegated listener: a light tap for every enabled button press in the app. */
export function installButtonHaptics() {
  document.addEventListener('click', (e) => {
    const b = (e.target as Element | null)?.closest?.('button');
    if (b && !(b as HTMLButtonElement).disabled && !b.hasAttribute('data-no-haptic')) haptic('tap');
  }, true);
}
