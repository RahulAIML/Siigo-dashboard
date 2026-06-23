import { useState, useEffect } from 'react';

export function useIntersectionObserver(
  ref: React.RefObject<Element>,
  options: IntersectionObserverInit = { threshold: 0.1, rootMargin: '50px' }
): boolean {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      });
    }, options);

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [ref, options]);

  return isVisible;
}
