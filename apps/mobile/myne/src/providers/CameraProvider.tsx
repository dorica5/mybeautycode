import React, { createContext, useContext, useState } from "react";

const CameraContext = createContext({
  onMediaCaptured: (media: any) => {},
  setOnMediaCaptured: (callback: (media: any) => void) => {},
});

export const useCameraContext = () => useContext(CameraContext);

export const CameraProvider = ({ children }: any) => {
  const [onMediaCaptured, setOnMediaCaptured] = useState<
    ((media: any) => void) | null
  >(null);

  return (
    <CameraContext.Provider value={{ onMediaCaptured, setOnMediaCaptured }}>
      {children}
    </CameraContext.Provider>
  );
};
