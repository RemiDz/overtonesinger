/**
 * Attempts to share a file via the Web Share API (native share sheet).
 * On iOS, this lets users "Save Image" / "Save Video" directly to Photos.
 * Falls back to a regular download if Web Share isn't available or fails.
 */
export async function shareOrDownload(blob: Blob, filename: string): Promise<'shared' | 'downloaded'> {
  const file = new File([blob], filename, { type: blob.type });

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return 'shared';
    } catch (err: unknown) {
      // User cancelled the share sheet — don't fall back to download
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw err;
      }
      // Any other error — fall through to download
    }
  }

  // Fallback: regular file download
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return 'downloaded';
}
