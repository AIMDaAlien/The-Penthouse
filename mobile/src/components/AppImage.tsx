import React from 'react';
import { Image as ExpoImage, type ImageProps as ExpoImageProps } from 'expo-image';

type AppImageVariant = 'avatar' | 'media' | 'default';

type AppImageProps = Omit<ExpoImageProps, 'cachePolicy' | 'transition'> & {
  variant?: AppImageVariant;
  transitionMs?: number;
};

const getCachePolicy = (variant: AppImageVariant): ExpoImageProps['cachePolicy'] => {
  switch (variant) {
    case 'avatar':
      return 'memory-disk';
    case 'media':
      return 'disk';
    default:
      return 'disk';
  }
};

export function AppImage({
  variant = 'default',
  transitionMs = 150,
  ...props
}: AppImageProps) {
  return (
    <ExpoImage
      {...props}
      cachePolicy={getCachePolicy(variant)}
      transition={transitionMs}
    />
  );
}
