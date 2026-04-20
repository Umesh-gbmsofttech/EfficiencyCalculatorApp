import React, { useEffect, useState } from "react";
import { Image } from "react-native";

const RemoteImage = ({ uri, fallbackSource, style, resizeMode = "cover" }) => {
  const [failed, setFailed] = useState(false);
  const safeUri = String(uri || "").trim();
  const shouldUseFallback = !safeUri || failed;

  useEffect(() => {
    setFailed(false);
  }, [safeUri]);

  return (
    <Image
      source={shouldUseFallback ? fallbackSource : { uri: safeUri }}
      style={style}
      resizeMode={resizeMode}
      onError={() => setFailed(true)}
    />
  );
};

export default React.memo(RemoteImage);
