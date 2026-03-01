import { Image, Platform } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";


export const preloadImages = async (imagesToPreload: { path: string }[]) => {
  if (!imagesToPreload.length) return;

  if (Platform.OS !== "web") {
    await Promise.all(imagesToPreload.map((img) => Image.prefetch(img.path)));
  } else {
    imagesToPreload.forEach((img) => {
      const imgElement = new window.Image();
      imgElement.src = img.path;
    });
  }
};

export const useImagePreloader = () => {
  const queryClient = useQueryClient();
  const preloadedHaircodes = useRef(new Set()).current;
  const preloadedAvatars = useRef(new Set()).current;

  const validUrl = (url) => url && typeof url === "string" && url.startsWith("http");

  
  const preloadHaircodeImages = async (haircodes) => {
    if (!haircodes || haircodes.length === 0) return;

    const imagesToPreload = haircodes
      .map((haircode) => haircode.client_profile?.avatar_url)
      .filter((url) => validUrl(url) && !preloadedHaircodes.has(url))
      .map((url) => {
        preloadedHaircodes.add(url);
        return { path: url };
      });

    if (imagesToPreload.length === 0) return;

    console.log(`Preloading ${imagesToPreload.length} haircode images`);
    try {
      await preloadImages(imagesToPreload);
      console.log(`Preloaded ${imagesToPreload.length} haircode images`);
    } catch (error) {
      console.error("Error preloading haircode images:", error);
    }
  };

 
  const preloadAvatarImages = async (userProfiles) => {
    if (!userProfiles || userProfiles.length === 0) return;

    const imagesToPreload = userProfiles
      .filter((profile) => profile.avatar_url && !preloadedAvatars.has(profile.id))
      .map((profile) => {
        preloadedAvatars.add(profile.id);
        return { path: profile.avatar_url };
      });

    if (imagesToPreload.length === 0) return;

    console.log(`Preloading ${imagesToPreload.length} avatar images`);
    try {
      await preloadImages(imagesToPreload);
      console.log(`Preloaded ${imagesToPreload.length} avatar images`);
    } catch (error) {
      console.error("Error preloading avatar images:", error);
    }
  };

  return { preloadHaircodeImages, preloadAvatarImages };
};
