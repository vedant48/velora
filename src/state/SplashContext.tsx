import { createContext, useContext } from 'react';

/**
 * True once the startup splash has fully finished (including its fade-out).
 * Screens use this to keep their own loading spinners hidden while the
 * splash is still visible, so the handoff never stacks two loaders.
 * Default true: outside startup (all normal rendering) nothing is gated.
 */
const SplashDoneContext = createContext(true);

export const SplashDoneProvider = SplashDoneContext.Provider;
export const useSplashDone = () => useContext(SplashDoneContext);
