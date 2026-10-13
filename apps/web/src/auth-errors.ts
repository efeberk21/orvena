import { isMeraError } from '@category-labs/mera';

export function authError(error: unknown): string {
  if (isMeraError(error)) {
    if (error.code === 'PRF_UNAVAILABLE') return 'This passkey provider did not return PRF output. For Windows Hello, use an up-to-date Chrome or Edge on the same Windows device/account where you saved the passkey. Your existing passkey has not been changed.';
    if (error.code === 'PASSKEY_OPERATION_FAILED') {
      const cause = error.cause as { name?: string } | undefined;
      if (cause?.name === 'InvalidStateError' || cause?.name === 'AbortError') return 'Another passkey request may be open or the request was interrupted. Complete or close the other prompt, then try again.';
      if (cause?.name === 'SecurityError') return 'The browser rejected the passkey domain or secure-context settings. Open the original Orvena site using HTTPS or localhost.';
      if (cause?.name === 'NotSupportedError') return 'This browser or authenticator does not support the requested passkey operation. Open Orvena in an up-to-date Chrome or Edge.';
      return `The browser did not complete passkey verification${cause?.name ? ` (${cause.name})` : ''}. If you use Windows Hello, open this same site in Chrome or Edge on the Windows account where you created the passkey, then choose that saved passkey. Cancellation or a timeout can also cause this error.`;
    }
    if (error.code === 'SESSION_ENDED') return 'Your signing session has ended. Sign in with your passkey again.';
  }
  return error instanceof Error ? error.message : 'The request could not complete. Please try again.';
}
