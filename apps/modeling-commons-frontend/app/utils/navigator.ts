export function copyTextToClipboard(text: string | null | undefined): Promise<void> {
  if (!text) {
    return Promise.reject(new Error("No text provided to copy"));
  }
  if (navigator.clipboard) {
    return navigator.clipboard.writeText(text);
  } else {
    return new Promise((resolve, reject) => {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.width = "0";
      textArea.style.height = "0";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        const successful = document.execCommand("copy");
        if (successful) {
          resolve();
        } else {
          reject(new Error("Failed to copy text"));
        }
      } catch (err) {
        reject(err);
      } finally {
        document.body.removeChild(textArea);
      }
    });
  }
}
