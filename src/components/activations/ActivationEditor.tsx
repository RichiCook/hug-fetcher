import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ActivationType, ActivationContent, TextImageContent, VideoContent, BannerContent, CustomHtmlContent, LeadCaptureContent, ImageCarouselContent } from '@/hooks/useActivations';
import { LeadCaptureEditor } from './LeadCaptureEditor';
import { Plus, X, Eye, EyeOff, Pencil } from 'lucide-react';
import { GroupedCategoryPicker } from './GroupedCategoryPicker';
import { CollectionPicker } from './CollectionPicker';
import { PriceRangeSelector } from './PriceRangeSelector';
import { TimingSelector } from './TimingSelector';
import { CategoryData } from '@/hooks/useProductCategories';
import { CollectionData } from '@/hooks/useProductCollections';

interface ActivationEditorProps {
  initialName?: string;
  initialType?: ActivationType;
  initialContent?: ActivationContent;
  initialCategories?: string[];
  initialCollections?: string[];
  initialPriceMin?: number | null;
  initialPriceMax?: number | null;
  initialStartDate?: Date | null;
  initialEndDate?: Date | null;
  initialHideTitle?: boolean;
  initialFullWidth?: boolean;
  productCategories?: CategoryData[];
  productCollections?: CollectionData[];
  onSave: (
    name: string, 
    type: ActivationType, 
    content: ActivationContent, 
    categories?: string[],
    collections?: string[],
    priceMin?: number | null,
    priceMax?: number | null,
    startDate?: Date | null,
    endDate?: Date | null,
    hideTitle?: boolean,
    fullWidth?: boolean
  ) => void;
  onCancel: () => void;
  isEditing?: boolean;
}

export const ActivationEditor = ({
  initialName = '',
  initialType = 'text_image',
  initialContent = {},
  initialCategories = [],
  initialCollections = [],
  initialPriceMin = null,
  initialPriceMax = null,
  initialStartDate = null,
  initialEndDate = null,
  initialHideTitle = false,
  initialFullWidth = false,
  productCategories = [],
  productCollections = [],
  onSave,
  onCancel,
  isEditing = false,
}: ActivationEditorProps) => {
  const [name, setName] = useState(initialName);
  const [type, setType] = useState<ActivationType>(initialType);
  const [content, setContent] = useState<ActivationContent>(initialContent);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(initialCategories);
  const [selectedCollections, setSelectedCollections] = useState<string[]>(initialCollections);
  const [priceMin, setPriceMin] = useState<number | null>(initialPriceMin);
  const [priceMax, setPriceMax] = useState<number | null>(initialPriceMax);
  const [startDate, setStartDate] = useState<Date | null>(initialStartDate);
  const [endDate, setEndDate] = useState<Date | null>(initialEndDate);
  const [hideTitle, setHideTitle] = useState(initialHideTitle);
  const [fullWidth, setFullWidth] = useState(initialFullWidth);

  const toggleCategory = (cat: string) => {
    setSelectedCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const removeCategory = (cat: string) => {
    setSelectedCategories(prev => prev.filter(c => c !== cat));
  };

  const toggleCollection = (col: string) => {
    setSelectedCollections(prev =>
      prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]
    );
  };

  const removeCollection = (col: string) => {
    setSelectedCollections(prev => prev.filter(c => c !== col));
  };

  const handlePriceChange = (min: number | null, max: number | null) => {
    setPriceMin(min);
    setPriceMax(max);
  };

  const handleTimingChange = (start: Date | null, end: Date | null) => {
    setStartDate(start);
    setEndDate(end);
  };

  const updateContent = (updates: Partial<ActivationContent>) => {
    setContent(prev => ({ ...prev, ...updates }));
  };

  const handleTypeChange = (newType: ActivationType) => {
    setType(newType);
    if (newType === 'lead_capture') {
      setContent({ rewardType: 'code_screen' } as LeadCaptureContent);
    } else {
      setContent({});
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave(
      name, 
      type, 
      content, 
      selectedCategories.length > 0 ? selectedCategories : undefined,
      selectedCollections.length > 0 ? selectedCollections : undefined,
      priceMin,
      priceMax,
      startDate,
      endDate,
      hideTitle,
      fullWidth
    );
  };

  const renderTextImageEditor = () => {
    const textContent = content as TextImageContent;
    return (
      <div className="space-y-4">
        <div>
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={textContent.title || ''}
            onChange={(e) => updateContent({ title: e.target.value })}
            placeholder="Section title"
          />
        </div>
        <div>
          <Label htmlFor="body">Body Text</Label>
          <Textarea
            id="body"
            value={textContent.body || ''}
            onChange={(e) => updateContent({ body: e.target.value })}
            placeholder="Content text..."
            rows={4}
          />
        </div>
        <div>
          <Label htmlFor="layout">Layout</Label>
          <Select
            value={textContent.layout || 'left'}
            onValueChange={(v) => updateContent({ layout: v as TextImageContent['layout'] })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="left">Image Left</SelectItem>
              <SelectItem value="right">Image Right</SelectItem>
              <SelectItem value="center">Centered</SelectItem>
              <SelectItem value="grid">Image Grid</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Images</Label>
          <div className="space-y-2">
            {(textContent.images || []).map((img, idx) => (
              <div key={idx} className="flex gap-2">
                <Input
                  value={img}
                  onChange={(e) => {
                    const newImages = [...(textContent.images || [])];
                    newImages[idx] = e.target.value;
                    updateContent({ images: newImages });
                  }}
                  placeholder="Image URL"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    const newImages = (textContent.images || []).filter((_, i) => i !== idx);
                    updateContent({ images: newImages });
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => updateContent({ images: [...(textContent.images || []), ''] })}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Image
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const renderVideoEditor = () => {
    const videoContent = content as VideoContent;
    return (
      <div className="space-y-4">
        <div>
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={videoContent.title || ''}
            onChange={(e) => updateContent({ title: e.target.value })}
            placeholder="Video title"
          />
        </div>
        <div>
          <Label htmlFor="videoUrl">Video URL</Label>
          <Input
            id="videoUrl"
            value={videoContent.videoUrl || ''}
            onChange={(e) => updateContent({ videoUrl: e.target.value })}
            placeholder="YouTube, Vimeo, or direct video URL"
          />
        </div>
        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={videoContent.description || ''}
            onChange={(e) => updateContent({ description: e.target.value })}
            placeholder="Video description..."
            rows={3}
          />
        </div>
      </div>
    );
  };

  const renderBannerEditor = () => {
    const bannerContent = content as BannerContent;
    return (
      <div className="space-y-4">
        <div>
          <Label htmlFor="headline">Headline</Label>
          <Input
            id="headline"
            value={bannerContent.headline || ''}
            onChange={(e) => updateContent({ headline: e.target.value })}
            placeholder="Main headline"
          />
        </div>
        <div>
          <Label htmlFor="subtext">Subtext</Label>
          <Textarea
            id="subtext"
            value={bannerContent.subtext || ''}
            onChange={(e) => updateContent({ subtext: e.target.value })}
            placeholder="Supporting text..."
            rows={2}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="buttonText">Button Text</Label>
            <Input
              id="buttonText"
              value={bannerContent.buttonText || ''}
              onChange={(e) => updateContent({ buttonText: e.target.value })}
              placeholder="Shop Now"
            />
          </div>
          <div>
            <Label htmlFor="buttonLink">Button Link</Label>
            <Input
              id="buttonLink"
              value={bannerContent.buttonLink || ''}
              onChange={(e) => updateContent({ buttonLink: e.target.value })}
              placeholder="https://..."
            />
          </div>
        </div>
        <div>
          <Label htmlFor="backgroundImage">Background Image URL</Label>
          <Input
            id="backgroundImage"
            value={bannerContent.backgroundImage || ''}
            onChange={(e) => updateContent({ backgroundImage: e.target.value })}
            placeholder="https://..."
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="backgroundColor">Background Color</Label>
            <Input
              id="backgroundColor"
              type="color"
              value={bannerContent.backgroundColor || '#000000'}
              onChange={(e) => updateContent({ backgroundColor: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="textColor">Text Color</Label>
            <Input
              id="textColor"
              type="color"
              value={bannerContent.textColor || '#ffffff'}
              onChange={(e) => updateContent({ textColor: e.target.value })}
            />
          </div>
        </div>
      </div>
    );
  };

  const [showHtmlPreview, setShowHtmlPreview] = useState(false);
  const [editablePreview, setEditablePreview] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const htmlContentForPreview = content as CustomHtmlContent;

  const setupIframeContent = () => {
    if (!iframeRef.current) return;
    const doc = iframeRef.current.contentDocument;
    if (!doc) return;

    doc.open();
    doc.write(`<!DOCTYPE html><html><head>
      <style>
        ${htmlContentForPreview.css || ''}
        ${editablePreview ? `
          body { cursor: text; }
          [contenteditable="true"]:focus { outline: 2px solid #3b82f6; outline-offset: 2px; border-radius: 2px; }
          img { cursor: pointer; transition: outline 0.15s; }
          img:hover { outline: 3px dashed #3b82f6; outline-offset: 2px; }
          .img-replace-tooltip { position: absolute; background: #3b82f6; color: white; font-size: 11px; padding: 2px 8px; border-radius: 4px; pointer-events: none; font-family: sans-serif; z-index: 999; }
        ` : ''}
      </style>
    </head><body ${editablePreview ? 'contenteditable="true"' : ''}>${htmlContentForPreview.html || ''}</body></html>`);
    doc.close();

    if (editablePreview && doc.body) {
      doc.querySelectorAll('img').forEach((img) => {
        img.setAttribute('contenteditable', 'false');
        img.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const currentSrc = img.getAttribute('src') || '';
          const newSrc = prompt('Enter new image URL:', currentSrc);
          if (newSrc !== null && newSrc !== currentSrc) {
            img.setAttribute('src', newSrc);
            syncFromPreview();
          }
        });
        img.addEventListener('mouseenter', () => {
          const tooltip = doc.createElement('div');
          tooltip.className = 'img-replace-tooltip';
          tooltip.textContent = 'Click to replace image';
          tooltip.style.left = `${img.offsetLeft}px`;
          tooltip.style.top = `${img.offsetTop - 24}px`;
          img.parentElement?.appendChild(tooltip);
          img.addEventListener('mouseleave', () => tooltip.remove(), { once: true });
        });
      });

      doc.body.addEventListener('input', () => {
        syncFromPreview();
      });
    }
  };

  const syncFromPreview = () => {
    if (!iframeRef.current) return;
    const doc = iframeRef.current.contentDocument;
    if (!doc?.body) return;
    doc.querySelectorAll('.img-replace-tooltip').forEach(t => t.remove());
    const newHtml = doc.body.innerHTML;
    updateContent({ html: newHtml });
  };

  useEffect(() => {
    if (showHtmlPreview) {
      const timer = setTimeout(setupIframeContent, 50);
      return () => clearTimeout(timer);
    }
  }, [showHtmlPreview, htmlContentForPreview.html, htmlContentForPreview.css, editablePreview]);

  const renderCustomHtmlEditor = () => {
    const htmlContent = content as CustomHtmlContent;
    return (
      <div className="space-y-4">
        <div>
          <Label htmlFor="html">HTML</Label>
          <Textarea
            id="html"
            value={htmlContent.html || ''}
            onChange={(e) => updateContent({ html: e.target.value })}
            placeholder="<div>Your custom HTML...</div>"
            rows={8}
            className="font-mono text-sm"
          />
        </div>
        <div>
          <Label htmlFor="css">CSS (optional)</Label>
          <Textarea
            id="css"
            value={htmlContent.css || ''}
            onChange={(e) => updateContent({ css: e.target.value })}
            placeholder=".custom-class { ... }"
            rows={4}
            className="font-mono text-sm"
          />
        </div>

        <div className="border rounded-lg overflow-hidden">
          <div className="flex items-center border-b">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1 rounded-none border-0"
              onClick={() => setShowHtmlPreview(!showHtmlPreview)}
            >
              {showHtmlPreview ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
              {showHtmlPreview ? 'Hide Preview' : 'Show Live Preview'}
            </Button>
            {showHtmlPreview && (
              <Button
                type="button"
                variant={editablePreview ? 'default' : 'ghost'}
                size="sm"
                className="rounded-none border-l"
                onClick={() => setEditablePreview(!editablePreview)}
              >
                <Pencil className="w-4 h-4 mr-2" />
                {editablePreview ? 'Editing On' : 'Edit in Preview'}
              </Button>
            )}
          </div>
          {showHtmlPreview && (
            <>
              {editablePreview && (
                <div className="bg-blue-50 text-blue-700 text-xs px-3 py-1.5 flex items-center gap-2">
                  <Pencil className="w-3 h-3" />
                  Click text to edit directly · Click images to replace URL · Changes sync to code automatically
                </div>
              )}
              <div className="bg-white">
                <iframe
                  ref={iframeRef}
                  title="HTML Preview"
                  className="w-full min-h-[300px] border-0"
                  sandbox="allow-same-origin"
                />
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEditing ? 'Edit Activation' : 'Create Activation'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Activation name"
                required
              />
            </div>
            <div>
              <Label htmlFor="type">Type</Label>
              <Select value={type} onValueChange={handleTypeChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text_image">Text & Image</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="banner">Banner / CTA</SelectItem>
                  <SelectItem value="custom_html">Custom HTML</SelectItem>
                  <SelectItem value="lead_capture">Lead Capture</SelectItem>
                </SelectContent>
              </Select>
            </div>

          <div className="flex items-center gap-3">
            <Switch
              id="hideTitle"
              checked={hideTitle}
              onCheckedChange={setHideTitle}
            />
            <Label htmlFor="hideTitle" className="text-sm">
              Hide activation name on scan landing page
            </Label>
          </div>

          <div className="flex items-center gap-3">
            <Switch
              id="fullWidth"
              checked={fullWidth}
              onCheckedChange={setFullWidth}
            />
            <Label htmlFor="fullWidth" className="text-sm">
              Full width (edge-to-edge display)
            </Label>
          </div>
          </div>

          {/* Collection Targeting */}
          <div className="border rounded-lg p-4 bg-secondary/10">
            <Label className="text-base font-medium">Stream to Collections (optional)</Label>
            <p className="text-sm text-muted-foreground mb-4">
              Target products from specific collections (e.g., SHAPE-ALLURE)
            </p>
            <CollectionPicker
              collections={productCollections}
              selectedCollections={selectedCollections}
              onToggleCollection={toggleCollection}
              onRemoveCollection={removeCollection}
            />
          </div>

          {/* Price Range Targeting */}
          <div className="border rounded-lg p-4 bg-secondary/10">
            <Label className="text-base font-medium">Stream to Price Range (optional)</Label>
            <p className="text-sm text-muted-foreground mb-4">
              Target products within a specific price range
            </p>
            <PriceRangeSelector
              priceMin={priceMin}
              priceMax={priceMax}
              onChange={handlePriceChange}
            />
          </div>

          {/* Timing/Scheduling */}
          <div className="border rounded-lg p-4 bg-secondary/10">
            <Label className="text-base font-medium">Scheduling (optional)</Label>
            <p className="text-sm text-muted-foreground mb-4">
              Set when this activation should be active
            </p>
            <TimingSelector
              startDate={startDate}
              endDate={endDate}
              onChange={handleTimingChange}
            />
          </div>

          <div className="border-t border-border pt-6">
            {type === 'text_image' && renderTextImageEditor()}
            {type === 'video' && renderVideoEditor()}
            {type === 'banner' && renderBannerEditor()}
            {type === 'custom_html' && renderCustomHtmlEditor()}
            {type === 'lead_capture' && (
              <LeadCaptureEditor 
                content={content as LeadCaptureContent} 
                onChange={(c) => setContent(c)} 
              />
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit">{isEditing ? 'Save Changes' : 'Create Activation'}</Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};