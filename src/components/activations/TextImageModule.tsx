import { TextImageContent } from '@/hooks/useActivations';

interface TextImageModuleProps {
  content: TextImageContent;
  hideTitle?: boolean;
}

export const TextImageModule = ({ content, hideTitle = false }: TextImageModuleProps) => {
  const { title, body, images = [], layout = 'left' } = content;

  if (layout === 'grid') {
    return (
      <section className="py-12">
        {!hideTitle && title && (
          <h2 className="text-2xl font-light text-foreground mb-6">{title}</h2>
        )}
        {body && (
          <p className="text-muted-foreground mb-8 max-w-2xl">{body}</p>
        )}
        {images.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {images.map((img, idx) => (
              <img
                key={idx}
                src={img}
                alt=""
                className="w-full aspect-square object-cover rounded-lg"
              />
            ))}
          </div>
        )}
      </section>
    );
  }

  if (layout === 'center') {
    return (
      <section className="py-12 text-center">
        {!hideTitle && title && (
          <h2 className="text-2xl font-light text-foreground mb-6">{title}</h2>
        )}
        {images.length > 0 && (
          <div className="flex justify-center mb-6">
            <img
              src={images[0]}
              alt=""
              className="max-w-md w-full rounded-lg"
            />
          </div>
        )}
        {body && (
          <p className="text-muted-foreground max-w-xl mx-auto">{body}</p>
        )}
      </section>
    );
  }

  // Left or right layout
  const imageFirst = layout === 'left';

  return (
    <section className="py-12">
      <div className={`flex flex-col md:flex-row gap-8 items-center ${!imageFirst ? 'md:flex-row-reverse' : ''}`}>
        {images.length > 0 && (
          <div className="w-full md:w-1/2">
            <img
              src={images[0]}
              alt=""
              className="w-full rounded-lg"
            />
          </div>
        )}
        <div className="w-full md:w-1/2">
          {!hideTitle && title && (
            <h2 className="text-2xl font-light text-foreground mb-4">{title}</h2>
          )}
          {body && (
            <p className="text-muted-foreground leading-relaxed">{body}</p>
          )}
        </div>
      </div>
    </section>
  );
};
