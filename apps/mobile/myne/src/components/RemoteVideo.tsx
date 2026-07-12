import React, { ComponentProps, useEffect, useState } from "react";
import { Video } from "expo-av";
import { fetchSignedStorageUrl } from "../lib/storageSignedUrl";

type RemoteVideoProps = {
  path?: string | null;
  storage?: string;
} & Omit<ComponentProps<typeof Video>, "source">;

const RemoteVideo = ({
  path,
  storage = "avatars",
  ...videoProps
}: RemoteVideoProps) => {
  const [uri, setUri] = useState<string | undefined>();

  useEffect(() => {
    let cancelled = false;
    if (!path) {
      setUri(undefined);
      return () => {
        cancelled = true;
      };
    }
    if (path.startsWith("http")) {
      setUri(path);
      return () => {
        cancelled = true;
      };
    }
    void (async () => {
      const u = await fetchSignedStorageUrl(storage, path);
      if (!cancelled) setUri(u ?? undefined);
    })();
    return () => {
      cancelled = true;
    };
  }, [path, storage]);

  return <Video source={{ uri }} {...videoProps} />;
};

export default RemoteVideo;
