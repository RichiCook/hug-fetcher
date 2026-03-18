import { BannerContent } from '@/hooks/useActivations';
import { Button } from '@/components/ui/button';

interface BannerModuleProps {
  content: BannerContent;
  hideTitle?: boolean;
}

export const BannerModule = ({ content, hideTitle = false }: BannerModuleProps) => {
  const {
    headline,
    subtext,
    buttonText,
    buttonLink,
    backgroundImage,
    backgroundColor,
    textColor,
  } = content;

  const style: React.CSSProperties = {
    backgroundColor: backgroundColor || undefined,
    backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    color: textColor || undefined,
  };

  return (
    <section
      className="py-16 px-8 rounded-lg text-center relative overflow-hidden"
      style={style}
    >
      {backgroundImage && (
        <div className="absolute inset-0 bg-black/40" />
      )}
      <div className="relative z-10 max-w-2xl mx-auto">
        {!hideTitle && headline && (
          <h2 
            className="text-3xl md:text-4xl font-light mb-4"
            style={{ color: textColor || (backgroundImage ? 'white' : undefined) }}
          >
            {headline}
          </h2>
        )}
        {subtext && (
          <p 
            className="text-lg mb-8 opacity-90"
            style={{ color: textColor || (backgroundImage ? 'white' : undefined) }}
          >
            {subtext}
          </p>
        )}
        {buttonText && buttonLink && (
          <Button
            asChild
            variant={backgroundImage ? 'secondary' : 'default'}
            size="lg"
          >
            <a href={buttonLink} target="_blank" rel="noopener noreferrer">
              {buttonText}
            </a>
          </Button>
        )}
      </div>
    </section>
  );
};
