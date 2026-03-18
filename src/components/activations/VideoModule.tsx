import { VideoContent } from '@/hooks/useActivations';

interface VideoModuleProps {
  content: VideoContent;
  hideTitle?: boolean;
}

const getEmbedUrl = (url: string): string | null => {
  if (!url) return null;

  // YouTube - add autoplay, mute, and hide controls
  const youtubeMatch = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  if (youtubeMatch) {
    return `https://www.youtube.com/embed/${youtubeMatch[1]}?autoplay=1&mute=1&controls=0&loop=1&playlist=${youtubeMatch[1]}&showinfo=0&rel=0&modestbranding=1`;
  }

  // Vimeo - add autoplay, mute, and hide controls
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1&muted=1&controls=0&loop=1&background=1`;
  }

  // Already an embed URL - append autoplay params if not present
  if (url.includes('embed')) {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}autoplay=1&mute=1&muted=1&controls=0`;
  }

  return null;
};

export const VideoModule = ({ content, hideTitle = false }: VideoModuleProps) => {
  const { title, videoUrl, description } = content;
  const embedUrl = videoUrl ? getEmbedUrl(videoUrl) : null;

  return (
    <section className="py-12">
      {!hideTitle && title && (
        <h2 className="text-2xl font-light text-foreground mb-6">{title}</h2>
      )}
      {embedUrl ? (
        <div className="aspect-video w-full max-w-4xl mx-auto rounded-lg overflow-hidden bg-secondary">
          <iframe
            src={embedUrl}
            title={title || 'Video'}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : videoUrl ? (
        <div className="aspect-video w-full max-w-4xl mx-auto rounded-lg overflow-hidden">
          <video
            src={videoUrl}
            autoPlay
            muted
            loop
            playsInline
            className="w-full h-full object-cover"
          />
        </div>
      ) : null}
      {description && (
        <p className="text-muted-foreground mt-6 max-w-2xl mx-auto text-center">
          {description}
        </p>
      )}
    </section>
  );
};
