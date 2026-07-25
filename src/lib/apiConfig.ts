/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const getApiBaseUrl = (): string => {
  let savedUrl = localStorage.getItem('pallywear_api_url');

  if (savedUrl) {
    savedUrl = savedUrl.trim().replace(/\/$/, ''); // strip trailing slash

    // Auto-fix common typo: dot before port number (e.g. 118.139.167.81.3000 -> 118.139.167.81:3000)
    savedUrl = savedUrl.replace(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\.(\d{4,5})/, '$1:$2');

    // Auto-add protocol if missing
    if (!savedUrl.startsWith('http://') && !savedUrl.startsWith('https://')) {
      savedUrl = 'http://' + savedUrl;
    }

    return savedUrl;
  }
  
  const isCapacitor = typeof window !== 'undefined' && (window as any).Capacitor;
  const isLocalhostMobile = typeof window !== 'undefined' && 
                            window.location.hostname === 'localhost' && 
                            (!window.location.port || window.location.port === '80');

  // Auto-detect browser origin if available, unless we are in Capacitor / native mobile app environment
  if (
    typeof window !== 'undefined' && 
    window.location.origin && 
    window.location.origin !== 'null' && 
    window.location.protocol.startsWith('http') &&
    !isCapacitor &&
    !isLocalhostMobile
  ) {
    return window.location.origin;
  }
  
  // Default fallback API server IP for mobile / Capacitor app environment
  return 'https://pallywear.in';
};

export const getApiUrl = (path: string): string => {
  const base = getApiBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
};
