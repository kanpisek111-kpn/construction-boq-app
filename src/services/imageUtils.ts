/**
 * Utilities for image compression and robust clipboard copying
 */

export function compressImage(
  file: File,
  maxWidth = 800,
  maxHeight = 800,
  quality = 0.75
): Promise<string> {
  return new Promise((resolve, reject) => {
    // If not an image, reject
    if (!file.type.startsWith('image/')) {
      reject(new Error('File is not an image'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = (err) => reject(err);
    reader.onload = (event) => {
      const img = new Image();
      img.onerror = () => {
        // Fallback to raw base64 if image decoding fails
        resolve(event.target?.result as string);
      };
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Resize proportionally if exceeds maxWidth or maxHeight
        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        // Use JPEG for optimal file size reduction (usually 10x-30x smaller than raw PNG/JPEG from phones)
        const mime = file.type === 'image/png' && file.size < 300 * 1024 ? 'image/png' : 'image/jpeg';
        const compressedBase64 = canvas.toDataURL(mime, quality);
        resolve(compressedBase64);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export async function copyToClipboardWithFallback(text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Continue to fallback
    }
  }

  // Fallback using textarea + execCommand for iframes / WebViews
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '-9999px';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textarea);
    return successful;
  } catch (err) {
    console.error('Clipboard copy failed:', err);
    return false;
  }
}
