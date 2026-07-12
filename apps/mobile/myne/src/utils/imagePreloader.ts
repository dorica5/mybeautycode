import { Image, Platform } from "react-native";
import { useRef } from "react";


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
  const preloadedVisitRowAvatars = useRef(new Set()).current;
  const preloadedAvatars = useRef(new Set()).current;

  const validUrl = (url) => url && typeof url === "string" && url.startsWith("http");

  
  const preloadVisitRowAvatars = async (visitRows) => {
    if (!visitRows || visitRows.length === 0) return;

    const imagesToPreload = visitRows
      .map((row) => row.client_profile?.avatar_url)
      .filter((url) => validUrl(url) && !preloadedVisitRowAvatars.has(url))
      .map((url) => {
        preloadedVisitRowAvatars.add(url);
        return { path: url };
      });

    if (imagesToPreload.length === 0) return;

    console.log(`Preloading ${imagesToPreload.length} visit images`);
    try {
      await preloadImages(imagesToPreload);
      console.log(`Preloaded ${imagesToPreload.length} visit images`);
    } catch (error) {
      console.error("Error preloading visit images:", error);
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

  return { preloadVisitRowAvatars, preloadAvatarImages };
};
