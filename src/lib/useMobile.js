import { useState, useEffect } from "react";

export function useMobile(bp = 768) {
  const [mobile, setMobile] = useState(() => window.innerWidth < bp);
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < bp);
    window.addEventListener("resize", fn, { passive: true });
    return () => window.removeEventListener("resize", fn);
  }, [bp]);
  return mobile;
}
