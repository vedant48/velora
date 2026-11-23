import React, { createContext, useContext, useState } from 'react';
import { View } from 'react-native';
export const ViewportContext = createContext({ offset: 0, height: 800 });
/** Mount only within one small viewport margin. Once visible, retain state.
 * The explicit reserved height prevents content jumps while offscreen.
 */
export function LazySection({ children, height = 260 }: { children: React.ReactNode; height?: number }) {
  const viewport = useContext(ViewportContext);
  const [top, setTop] = useState<number | null>(null);
  const [retained, setRetained] = useState(false);
  const near = top !== null && top <= viewport.offset + viewport.height + 320;
  React.useEffect(() => { if (near) setRetained(true); }, [near]);
  return <View onLayout={event => setTop(event.nativeEvent.layout.y)} style={!retained && !near ? { height } : undefined}>{retained || near ? children : null}</View>;
}
