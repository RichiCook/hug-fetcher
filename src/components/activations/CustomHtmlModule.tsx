import { CustomHtmlContent } from '@/hooks/useActivations';
import { useEffect, useRef } from 'react';

interface CustomHtmlModuleProps {
  content: CustomHtmlContent;
}

export const CustomHtmlModule = ({ content }: CustomHtmlModuleProps) => {
  const { html, css } = content;
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (css && containerRef.current) {
      const styleId = `custom-css-${Math.random().toString(36).substr(2, 9)}`;
      const existingStyle = document.getElementById(styleId);
      if (existingStyle) {
        existingStyle.remove();
      }

      const styleElement = document.createElement('style');
      styleElement.id = styleId;
      styleElement.textContent = css;
      document.head.appendChild(styleElement);

      return () => {
        const style = document.getElementById(styleId);
        if (style) {
          style.remove();
        }
      };
    }
  }, [css]);

  if (!html) return null;

  return (
    <section className="py-12">
      <div
        ref={containerRef}
        className="custom-html-content"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </section>
  );
};
