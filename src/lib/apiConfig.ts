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
  
  // If running in Capacitor/Android native app environment, default to production API server
  if (
    (window as any).Capacitor || 
    window.location.protocol === 'file:' || 
    (window.location.hostname === 'localhost' && !window.location.port) ||
    window.location.hostname === ''
  ) {
    return 'https://pallywear.in';
  }
  
  return '';
};

export const getApiUrl = (path: string): string => {
  const base = getApiBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
};
