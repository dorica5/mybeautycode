import { Image } from "react-native";
import * as ImageManipulator from "expo-image-manipulator";
import { api } from "./apiClient";

/** Longest edge in px; enough for sharp circles ~170pt @3x without giant files. */
const AVATAR_MAX_EDGE_PX = 512;
const AVATAR_JPEG_QUALITY = 0.82;

function getImageSize(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      reject
    );
  });
}

/**
 * Downscale and JPEG-compress a local image for avatar storage.
 * Does not upscale small images; still re-encodes to JPEG for smaller PNG uploads.
 */
export async function prepareAvatarForUpload(localUri: string): Promise<string> {
  const { width: w, height: h } = await getImageSize(localUri);
  const maxEdge = Math.max(w, h);
  const format = ImageManipulator.SaveFormat.JPEG;
  const opts = { compress: AVATAR_JPEG_QUALITY, format };

  if (maxEdge <= AVATAR_MAX_EDGE_PX) {
    const out = await ImageManipulator.manipulateAsync(localUri, [], opts);
    return out.uri;
  }

  const scale = AVATAR_MAX_EDGE_PX / maxEdge;
  const width = Math.round(w * scale);
  const height = Math.round(h * scale);
  const out = await ImageManipulator.manipulateAsync(
    localUri,
    [{ resize: { width, height } }],
    opts
  );
  return out.uri;
}

/** Upload a profile photo: resize/compress then store as JPEG in `avatars`. */
export async function uploadAvatarToStorage(localUri: string): Promise<string | null> {
  try {
    const prepared = await prepareAvatarForUpload(localUri);
    return await uploadToStorage(prepared, "avatars", undefined, "image/jpeg");
  } catch (error) {
    console.error("uploadAvatarToStorage:", error);
    return null;
  }
}

export async function uploadToStorage(
  uri: string,
  bucket: string,
  fileName?: string,
  contentType = "image/png"
): Promise<string | null> {
  try {
    const ext = contentType.includes("jpeg") ? "jpg" : "png";
    const formData = new FormData();
    formData.append("file", {
      uri,
      type: contentType,
      name: fileName ?? `${Date.now()}.${ext}`,
    } as unknown as Blob);
    formData.append("bucket", bucket);

    const result = await api.upload<{ path: string }>("/api/storage/upload", formData);
    return result?.path ?? null;
  } catch (error) {
    console.error("Upload error:", error);
    return null;
  }
}
