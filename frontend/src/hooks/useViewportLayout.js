import { useEffect } from 'react';
import { initViewportLayoutListeners } from '../utils/viewportLayout';

/** Keeps CSS viewport variables in sync with the device / keyboard. */
export default function useViewportLayout() {
  useEffect(() => initViewportLayoutListeners(), []);
}
