"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

const FB_PIXEL_ID = process.env.NEXT_PUBLIC_FB_PIXEL_ID || "1174901340768236";

declare global {
  interface Window {
    fbq: any;
    _fbq: any;
  }
}

export default function FacebookPixel() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Initialize Facebook Pixel
    if (typeof window !== 'undefined') {
      const pixelId = FB_PIXEL_ID;
      console.log("Initializing Facebook Pixel with ID:", pixelId);

      // Standard Facebook Pixel initialization code
      if (!(window as any).fbq) {
        (function (f: any, b: any, e: any, v: any, n: any, t: any, s: any) {
          if (f.fbq) return;
          n = f.fbq = function () {
            n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
          };
          if (!f._fbq) f._fbq = n;
          n.push = n;
          n.loaded = !0;
          n.version = '2.0';
          n.queue = [];
          t = b.createElement(e);
          t.async = !0;
          t.src = v;
          s = b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t, s);
        })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js', 'fbq', null, null);

        (window as any).fbq('init', pixelId);
      }

      // Track PageView
      (window as any).fbq('track', 'PageView');
      console.log("FacebookPixel initialized and PageView tracked");
    }
  }, [pathname, searchParams]);

  return null;
}
