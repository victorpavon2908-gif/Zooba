import { useState, useEffect } from 'react';

export type DeviceCategory = 'small-phone' | 'phone' | 'large-phone' | 'tablet' | 'desktop';

export interface ResponsiveInfo {
  width: number;
  height: number;
  aspectRatio: number;
  isLandscape: boolean;
  deviceCategory: DeviceCategory;
  isSmallPhone: boolean;
  isPhone: boolean;
  isTablet: boolean;
  isTouch: boolean;
  scale: number;
  radarSize: number;
  primaryButtonSize: number;
  secondaryButtonSize: number;
}

function getDeviceInfo(w: number, h: number): ResponsiveInfo {
  const minDim = Math.min(w, h);
  const maxDim = Math.max(w, h);
  const isLandscape = w >= h;
  const aspectRatio = maxDim / Math.max(1, minDim);

  // In landscape mode, height is the limiting factor for mobile thumbs
  const landscapeH = isLandscape ? h : w;
  const landscapeW = isLandscape ? w : h;

  let deviceCategory: DeviceCategory = 'phone';
  let isSmallPhone = false;
  let isTablet = false;

  // Touch device detection
  const isTouch = 
    typeof window !== 'undefined' &&
    ('ontouchstart' in window || navigator.maxTouchPoints > 0);

  if (landscapeH < 380 || landscapeW < 670) {
    deviceCategory = 'small-phone';
    isSmallPhone = true;
  } else if (landscapeH >= 580 || (minDim >= 580 && maxDim >= 800)) {
    deviceCategory = 'tablet';
    isTablet = true;
  } else if (landscapeH >= 430 && landscapeW >= 920) {
    deviceCategory = 'large-phone';
  } else if (!isTouch && landscapeW > 1024 && landscapeH > 680) {
    deviceCategory = 'desktop';
  } else {
    deviceCategory = 'phone';
  }

  // Adaptive scale factor based on screen ergonomics
  let scale = 1.0;
  if (deviceCategory === 'small-phone') {
    scale = 0.86;
  } else if (deviceCategory === 'large-phone') {
    scale = 1.05;
  } else if (deviceCategory === 'tablet') {
    scale = 1.18;
  } else if (deviceCategory === 'desktop') {
    scale = 1.1;
  }

  // Specific element dimension tuning
  const radarSize = isSmallPhone ? 80 : isTablet ? 116 : 94;
  const primaryButtonSize = isSmallPhone ? 56 : isTablet ? 76 : 64; // px
  const secondaryButtonSize = isSmallPhone ? 42 : isTablet ? 54 : 46; // px

  return {
    width: w,
    height: h,
    aspectRatio,
    isLandscape,
    deviceCategory,
    isSmallPhone,
    isPhone: deviceCategory === 'phone' || deviceCategory === 'small-phone' || deviceCategory === 'large-phone',
    isTablet,
    isTouch,
    scale,
    radarSize,
    primaryButtonSize,
    secondaryButtonSize,
  };
}

export function useResponsiveLayout(): ResponsiveInfo {
  const [info, setInfo] = useState<ResponsiveInfo>(() => {
    if (typeof window === 'undefined') {
      return getDeviceInfo(844, 390);
    }
    return getDeviceInfo(window.innerWidth, window.innerHeight);
  });

  useEffect(() => {
    const handleResize = () => {
      setInfo(getDeviceInfo(window.innerWidth, window.innerHeight));
    };

    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('orientationchange', handleResize, { passive: true });

    // Also listen to visualViewport if available (vital for iOS Safari URL bar collapsing)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize, { passive: true });
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
      }
    };
  }, []);

  return info;
}
