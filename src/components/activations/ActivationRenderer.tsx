import { Activation, TextImageContent, VideoContent, BannerContent, CustomHtmlContent, LeadCaptureContent } from '@/hooks/useActivations';
import { TextImageModule } from './TextImageModule';
import { VideoModule } from './VideoModule';
import { BannerModule } from './BannerModule';
import { CustomHtmlModule } from './CustomHtmlModule';
import { LeadCaptureModule } from './LeadCaptureModule';

interface ActivationRendererProps {
  activation: Activation;
  productId?: string;
}

export const ActivationRenderer = ({ activation, productId }: ActivationRendererProps) => {
  const hideTitle = activation.hide_title || false;

  switch (activation.type) {
    case 'text_image':
      return <TextImageModule content={activation.content as TextImageContent} hideTitle={hideTitle} />;
    case 'video':
      return <VideoModule content={activation.content as VideoContent} hideTitle={hideTitle} />;
    case 'banner':
      return <BannerModule content={activation.content as BannerContent} hideTitle={hideTitle} />;
    case 'custom_html':
      return <CustomHtmlModule content={activation.content as CustomHtmlContent} />;
    case 'lead_capture':
      return <LeadCaptureModule content={activation.content as LeadCaptureContent} activationId={activation.id} productId={productId} hideTitle={hideTitle} />;
    default:
      return null;
  }
};
