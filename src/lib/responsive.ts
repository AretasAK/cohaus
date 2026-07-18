import { useWindowDimensions } from 'react-native';

export function useDeviceLayout() {
  const { width, height } = useWindowDimensions();
  const isTablet = Math.min(width, height) >= 600;
  const showSplitView = isTablet && width >= 800;
  return { isTablet, showSplitView, width, height };
}
