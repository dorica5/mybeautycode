/* eslint-disable @typescript-eslint/no-unused-vars */
import { Image } from "react-native";
import React, { ComponentProps, useEffect, useState } from "react";

type RemoteImageProps = {
  highResPath?: string | null;
  lowResPath?: string | null;
  lowMiddleResPath?: string | null;
  lowHighResPath?: string | null;
  fallback?: string;
  storage?: string;
  local?: boolean;
} & Omit<ComponentProps<typeof Image>, "source">;

const getImageFromCdn = (bucket: string, path: string) => 
  `https://cdn.my-haircode.com/${bucket}/${path}`;

const RemoteImage = ({
  highResPath,
  lowResPath,
  lowMiddleResPath,
  lowHighResPath,
  fallback,
  local = false,
  storage = "inspirations",
  style,
  ...imageProps
}: RemoteImageProps) => {
  const [image, setImage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchImage = async (path: string | null) => {
      if (!path) return null;

      if (path.startsWith("http")) {
        console.log("Absolute URL detected:", path);
        return path; 
      }

      try {
        const cdnUrl = getImageFromCdn(storage, path);
        console.log("CDN URL:", cdnUrl);
        return cdnUrl;
      } catch (error) {
        console.error("Error fetching image:", error);
        return fallback || null;
      }
    };

    const loadImages = async () => {
      if (isMounted && highResPath) {
        const url = await fetchImage(highResPath);
        if (url) setImage(url);
      }
    };

    loadImages();

    return () => {
      isMounted = false;
    };
  }, [highResPath, storage]);

  if (!image && !fallback) {
    return null;
  }

  return (
    <Image
      source={{ uri: image || fallback }}
      style={style}
      resizeMode="cover"
      {...imageProps}
    />
  );
};

export default RemoteImage;
