import { Image, ImageProps } from 'expo-image';
import React, { memo, useState } from 'react';
import { Pressable, Text } from 'react-native';
import { motion } from './motion';

// Bounded identity cache prevents replaying first-load fades on tab re-entry.
// Actual pixels live in expo-image's native memory/disk caches, not React state.
const loaded = new Set<string>();
function sourceKey(source: ImageProps['source']): string {
  if (typeof source === 'string') return source;
  if (Array.isArray(source)) return sourceKey(source[0]);
  if (source && !Array.isArray(source) && typeof source === 'object' && 'uri' in source) return source.uri ?? '';
  return '';
}
export const CachedImage = memo(function CachedImage(props: ImageProps) {
  const uri = sourceKey(props.source);
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  if (uri && failedUri === uri) return <Pressable accessibilityRole="button" accessibilityLabel="Image unavailable. Tap to retry" onPress={() => { setFailedUri(null); setAttempt(n => n + 1); }} style={[props.style, { backgroundColor: '#202024', alignItems: 'center', justifyContent: 'center' }]}><Text style={{ color: '#A8A8AE', fontSize: 11 }}>Retry image</Text></Pressable>;
  return <Image {...props} key={`${uri}:${attempt}`} recyclingKey={uri || undefined} cachePolicy="memory-disk" placeholder={typeof props.placeholder === 'string' && !/^(https?:|data:|file:)/.test(props.placeholder) ? { blurhash: props.placeholder } : props.placeholder ?? { blurhash: "L67_}#WB00of~qofWBof00of~qof" }}
    transition={uri && loaded.has(uri) ? 0 : motion.firstImageMs}
    onLoad={event => { if (uri) { if (loaded.size > 800) loaded.delete(loaded.values().next().value!); loaded.add(uri); } props.onLoad?.(event); }}
    onError={event => { if (uri) setFailedUri(uri); props.onError?.(event); }} />;
});
