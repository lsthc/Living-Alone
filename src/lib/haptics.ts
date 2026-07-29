// Lux(apps/web/src/lib/haptics.ts)에서 가져온 버튼 햅틱(진동) 지원.
// - iOS/iPadOS(WebKit): navigator.vibrate 를 지원하지 않으므로 no-op.
// - Android 등: navigator.vibrate 로 짧게 진동.

/** iOS / iPadOS (WebKit) 여부 */
export const isIOS: boolean =
  typeof navigator !== 'undefined' &&
  (/iP(hone|ad|od)/.test(navigator.userAgent) ||
    // iPadOS 13+ 는 데스크톱 UA 로 보고되므로 터치 포인트로 판별
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

/** navigator.vibrate 사용 가능 여부 (주로 Android) */
export const canVibrate: boolean =
  typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';

/** Android 등에서 짧은 진동 재생. iOS 에서는 no-op. */
export function vibrateTick(ms = 12): void {
  if (isIOS) return;
  if (!canVibrate) return;
  try {
    navigator.vibrate(ms);
  } catch {
    /* 무시 */
  }
}
