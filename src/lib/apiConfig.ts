/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const getApiBaseUrl = (): string => {
  const savedUrl = localStorage.getItem('pallywear_api_url');
  if (savedUrl) {
    return savedUrl.replace(/\/$/, ''); // strip trailing slash
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
