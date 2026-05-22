export const checkValidCdnUrl = (url: string): { success: boolean; message: string } => {
  try {
    const urlObj = new URL(url);

    // Check if it expires
    if (urlObj.searchParams.has("X-Amz-Expires")) {
      const issuedAtRaw = urlObj.searchParams.get("X-Amz-Date");

      if (!issuedAtRaw || !/^\d{8}T\d{6}Z$/.test(issuedAtRaw)) {
        throw new Error("Invalid issued at date format");
      }

      const issuedAt = new Date(issuedAtRaw).getTime();
      const expiresIn = parseInt(urlObj.searchParams.get("X-Amz-Expires")!, 10);
      const expiresAt = issuedAt + expiresIn * 1000;
      const now = Date.now();

      if (expiresAt < now) {
        return { success: false, message: "URL has expired" };
      }
    }

    return { success: true, message: "" };
  } catch {
    return { success: false, message: "URL is invalid" };
  }
};
