/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const getApiBaseUrl = (): string => {
  const savedUrl = localStorage.getItem('pallywear_api_url');
  if (savedUrl) {
    return savedUrl.replace(/\/$/, ''); // strip trailing slash
  }
  return '';
};

export const getApiUrl = (path: string): string => {
  const base = getApiBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
};
