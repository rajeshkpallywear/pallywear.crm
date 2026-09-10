/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Universal browser file download helper.
 * Solves Google Chrome cross-origin download restrictions, Base64 data URI limits,
 * Blob creation, and canvas fallbacks for lossless PNG/image/file downloads.
 */
export async function downloadFile(url: string | null | undefined, defaultFilename: string = 'download.png'): Promise<void> {
  if (!url || typeof url !== 'string' || !url.trim()) {
    console.warn('downloadFile called with empty url');
    return;
  }

  const cleanUrl = url.trim();
  const cleanFilename = sanitizeFilename(defaultFilename);

  try {
    // 1. If it's a data URL (e.g. data:image/png;base64,... or data:application/pdf;base64,...)
    if (cleanUrl.startsWith('data:')) {
      const blob = dataUrlToBlob(cleanUrl);
      const blobUrl = URL.createObjectURL(blob);
      triggerDownloadLink(blobUrl, cleanFilename);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 3000);
      return;
    }

    // 2. If it's already a blob URL (blob:http...)
    if (cleanUrl.startsWith('blob:')) {
      triggerDownloadLink(cleanUrl, cleanFilename);
      return;
    }

    // 3. For remote HTTP/HTTPS URLs (Cloudinary, backend storage, external CDNs):
    // Fetching as Blob forces Google Chrome to treat it as same-origin Blob,
    // thereby honoring the download filename and downloading directly to the user's Downloads folder!
    try {
      const res = await fetch(cleanUrl, { mode: 'cors' });
      if (res.ok) {
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        triggerDownloadLink(blobUrl, cleanFilename);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 3000);
        return;
      }
    } catch (fetchErr) {
      console.warn('Direct fetch download failed (CORS or network), trying canvas / link fallback:', fetchErr);
    }

    // 4. If image file and fetch was blocked by CORS, try loading in an offscreen Image and rendering to Canvas
    if (isImageExtension(cleanUrl) || isImageExtension(cleanFilename)) {
      try {
        await downloadImageViaCanvas(cleanUrl, cleanFilename);
        return;
      } catch (canvasErr) {
        console.warn('Canvas export download fallback failed:', canvasErr);
      }
    }

    // 5. Ultimate fallback: Trigger link with target="_blank"
    triggerDownloadLink(cleanUrl, cleanFilename, true);
  } catch (err) {
    console.error('Download failed:', err);
    // Final emergency fallback: open in new tab
    window.open(cleanUrl, '_blank', 'noopener,noreferrer');
  }
}

/**
 * Converts a base64 data URI to a native Blob object.
 * This fixes Chrome's > 2MB data URI navigation limit and net::ERR_INVALID_URL errors.
 */
function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',');
  const mimeMatch = parts[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
  const b64 = parts[1] || '';
  const binaryStr = atob(b64);
  const len = binaryStr.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

function sanitizeFilename(filename: string): string {
  let clean = filename.replace(/[<>:"/\\|?*]+/g, '_').trim();
  if (!clean) clean = 'download.png';
  return clean;
}

function isImageExtension(str: string): boolean {
  return /\.(png|jpe?g|webp|gif|svg)($|\?)/i.test(str);
}

function downloadImageViaCanvas(url: string, filename: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          triggerDownloadLink(url, filename, true);
          return resolve();
        }
        ctx.drawImage(img, 0, 0);
        const mimeType = filename.toLowerCase().endsWith('.jpg') || filename.toLowerCase().endsWith('.jpeg') 
          ? 'image/jpeg' 
          : 'image/png';
        canvas.toBlob((blob) => {
          if (blob) {
            const blobUrl = URL.createObjectURL(blob);
            triggerDownloadLink(blobUrl, filename);
            setTimeout(() => URL.revokeObjectURL(blobUrl), 3000);
            resolve();
          } else {
            triggerDownloadLink(url, filename, true);
            resolve();
          }
        }, mimeType);
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = (e) => reject(e);
    img.src = url;
  });
}

function triggerDownloadLink(href: string, filename: string, openInNewTab = false) {
  const link = document.createElement('a');
  link.href = href;
  link.download = filename;
  if (openInNewTab) {
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
  }
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
