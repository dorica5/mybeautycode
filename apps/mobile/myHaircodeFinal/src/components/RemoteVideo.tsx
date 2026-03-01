import React, { ComponentProps } from "react";
import { Video } from "expo-av";
import { getStorageUrl } from "../utils/supabaseHelpers";

type RemoteVideoProps = {
  path?: string | null;
  storage?: string;
} & Omit<ComponentProps<typeof Video>, "source">;

const RemoteVideo = ({
  path,
  storage = "avatars",
  ...videoProps
}: RemoteVideoProps) => {
  const uri = path ? getStorageUrl(storage, path) : undefined;
  return <Video source={{ uri }} {...videoProps} />;
};

export default RemoteVideo;
