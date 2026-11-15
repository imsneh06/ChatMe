/**
 * Downloads a media file (image, video, audio) directly to the user's device.
 */
export const downloadMedia = async (url, customName = "chatme-media") => {
  if (!url) return;

  try {
    // If data URL, convert to Blob directly
    if (url.startsWith("data:")) {
      const parts = url.split(",");
      const mime = parts[0].match(/:(.*?);/)[1];
      const ext = mime.split("/")[1] || "png";
      const bstr = atob(parts[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      const blob = new Blob([u8arr], { type: mime });
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = customName.includes(".") ? customName : `${customName}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
      return;
    }

    // Remote URL
    const response = await fetch(url, { mode: "cors" });
    if (!response.ok) throw new Error("Network fetch failed");

    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;

    // Detect extension from contentType or url
    let ext = "";
    const contentType = response.headers.get("content-type");
    if (contentType?.includes("video/mp4")) ext = ".mp4";
    else if (contentType?.includes("video/webm")) ext = ".webm";
    else if (contentType?.includes("image/jpeg")) ext = ".jpg";
    else if (contentType?.includes("image/png")) ext = ".png";
    else if (contentType?.includes("image/webp")) ext = ".webp";
    else if (contentType?.includes("image/gif")) ext = ".gif";
    else if (url.includes(".")) {
      const match = url.match(/\.([a-zA-Z0-9]+)(\?|$)/);
      if (match) ext = `.${match[1]}`;
    }

    const finalName = customName.includes(".") ? customName : `${customName}${ext || ".bin"}`;
    a.download = finalName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  } catch (err) {
    // Fallback: direct window anchor trigger
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.download = customName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
};
