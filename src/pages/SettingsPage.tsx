import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Upload, Palette, Type, Image, Save, Loader2, User, X, Tag, Wrench } from 'lucide-react';
import RepairServiceSettings from '@/components/repair/RepairServiceSettings';
import FeaturedCarouselSettings from '@/components/settings/FeaturedCarouselSettings';
import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { usePlatformSettingsContext } from '@/contexts/PlatformSettingsContext';
import { supabase } from '@/integrations/supabase/client';
import defaultLogo from '@/assets/logo.png';

const SettingsPage = () => {
  const { settings, loading, saving, updateSettings, uploadLogo, uploadFavicon } = usePlatformSettings();
  const { refetch: refetchContext } = usePlatformSettingsContext();
  const { toast } = useToast();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);
  const modelRefInputRef = useRef<HTMLInputElement>(null);

  const [brandName, setBrandName] = useState('');
  const [modelReferenceImage, setModelReferenceImage] = useState<string | null>(null);
  const [uploadingModelRef, setUploadingModelRef] = useState(false);
  const [pageTitle, setPageTitle] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#000000');
  const [secondaryColor, setSecondaryColor] = useState('#f5f5f5');
  const [accentColor, setAccentColor] = useState('#3b82f6');
  const [resaleSharingEnabled, setResaleSharingEnabled] = useState(false);

  // Sync state when settings load
  useEffect(() => {
    if (!loading) {
      setBrandName(settings.brand_name);
      setPageTitle(settings.page_title || '');
      setPrimaryColor(settings.primary_color);
      setSecondaryColor(settings.secondary_color);
      setAccentColor(settings.accent_color);
    }
  }, [settings, loading]);

  // Load resale sharing setting
  useEffect(() => {
    const fetchResaleSetting = async () => {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('id', 'resale_sharing_enabled')
        .single();
      if (data?.value) {
        const val = data.value as { enabled?: boolean };
        setResaleSharingEnabled(val.enabled ?? false);
      }
    };
    fetchResaleSetting();
  }, []);

  // Load model reference image from app_settings
  useEffect(() => {
    const fetchModelRef = async () => {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('id', 'model_reference_image')
        .single();
      
      if (data?.value) {
        const value = data.value as { url?: string };
        setModelReferenceImage(value.url || null);
      }
    };
    fetchModelRef();
  }, []);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const { url, error } = await uploadLogo(file);
    if (error) {
      toast({ title: 'Upload failed', description: error, variant: 'destructive' });
      return;
    }

    const result = await updateSettings({ logo_url: url });
    if (result.success) {
      await refetchContext();
      toast({ title: 'Logo updated!' });
    }
  };

  const handleFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const { url, error } = await uploadFavicon(file);
    if (error) {
      toast({ title: 'Upload failed', description: error, variant: 'destructive' });
      return;
    }

    const result = await updateSettings({ favicon_url: url });
    if (result.success) {
      await refetchContext();
      toast({ title: 'Favicon updated!' });
    }
  };

  const handleModelRefUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingModelRef(true);
    try {
      // Upload to branding bucket
      const fileExt = file.name.split('.').pop();
      const fileName = `model-reference.${fileExt}`;
      const filePath = `model/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('branding')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('branding')
        .getPublicUrl(filePath);

      const url = urlData.publicUrl;

      // Save to app_settings
      await supabase
        .from('app_settings')
        .upsert({ 
          id: 'model_reference_image', 
          value: { url },
          updated_at: new Date().toISOString()
        });

      setModelReferenceImage(url);
      toast({ title: 'Model reference uploaded!' });
    } catch (err: any) {
      toast({ 
        title: 'Upload failed', 
        description: err.message, 
        variant: 'destructive' 
      });
    } finally {
      setUploadingModelRef(false);
    }
  };

  const handleRemoveModelRef = async () => {
    try {
      await supabase
        .from('app_settings')
        .delete()
        .eq('id', 'model_reference_image');

      setModelReferenceImage(null);
      toast({ title: 'Model reference removed' });
    } catch (err: any) {
      toast({ 
        title: 'Failed to remove', 
        description: err.message, 
        variant: 'destructive' 
      });
    }
  };

  const handleResaleSharingToggle = async (enabled: boolean) => {
    setResaleSharingEnabled(enabled);
    try {
      await supabase
        .from('app_settings')
        .upsert({
          id: 'resale_sharing_enabled',
          value: { enabled } as any,
          updated_at: new Date().toISOString(),
        });
      toast({ title: enabled ? 'Resale sharing enabled' : 'Resale sharing disabled' });
    } catch {
      toast({ title: 'Failed to update setting', variant: 'destructive' });
      setResaleSharingEnabled(!enabled);
    }
  };

  const handleSave = async () => {
    const result = await updateSettings({
      brand_name: brandName,
      page_title: pageTitle,
      primary_color: primaryColor,
      secondary_color: secondaryColor,
      accent_color: accentColor,
    });

    if (result.success) {
      await refetchContext();
      toast({ title: 'Settings saved!' });
    } else {
      toast({ title: 'Failed to save', description: result.error, variant: 'destructive' });
    }
  };

  const logoUrl = settings.logo_url || defaultLogo;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <header className="mb-8">
          <div className="mb-6">
            <AppHeader />
          </div>
          <h1 className="text-2xl font-semibold">Platform Settings</h1>
          <p className="text-muted-foreground">Customize your platform appearance</p>
        </header>

        <div className="space-y-6">
          {/* Branding */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="w-5 h-5" />
                Branding
              </CardTitle>
              <CardDescription>Logo, favicon, and brand name</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Brand Name */}
              <div className="space-y-2">
                <Label htmlFor="brandName">Brand Name</Label>
                <Input
                  id="brandName"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="Your brand name"
                />
              </div>

              {/* Page Title */}
              <div className="space-y-2">
                <Label htmlFor="pageTitle">Browser Tab Title</Label>
                <Input
                  id="pageTitle"
                  value={pageTitle}
                  onChange={(e) => setPageTitle(e.target.value)}
                  placeholder="Browser tab title"
                />
                <p className="text-xs text-muted-foreground">
                  This appears in the browser tab
                </p>
              </div>

              <Separator />

              {/* Logo */}
              <div className="space-y-2">
                <Label>Logo</Label>
                <div className="flex items-center gap-4">
                  <div className="w-24 h-24 border rounded-lg flex items-center justify-center bg-muted/50">
                    {settings.logo_url ? (
                      <img 
                        src={settings.logo_url} 
                        alt="Logo" 
                        className="max-w-full max-h-full object-contain"
                      />
                    ) : (
                      <Image className="w-8 h-8 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                    <Button
                      variant="outline"
                      onClick={() => logoInputRef.current?.click()}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Logo
                    </Button>
                    <p className="text-xs text-muted-foreground mt-1">
                      Recommended: 200x50px, PNG or SVG
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Favicon */}
              <div className="space-y-2">
                <Label>Favicon</Label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 border rounded-lg flex items-center justify-center bg-muted/50">
                    {settings.favicon_url ? (
                      <img 
                        src={settings.favicon_url} 
                        alt="Favicon" 
                        className="max-w-full max-h-full object-contain"
                      />
                    ) : (
                      <Type className="w-6 h-6 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <input
                      ref={faviconInputRef}
                      type="file"
                      accept="image/*,.ico"
                      onChange={handleFaviconUpload}
                      className="hidden"
                    />
                    <Button
                      variant="outline"
                      onClick={() => faviconInputRef.current?.click()}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Favicon
                    </Button>
                    <p className="text-xs text-muted-foreground mt-1">
                      Recommended: 32x32px, ICO or PNG
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Model Reference for Look Generation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Model Reference Image
              </CardTitle>
              <CardDescription>
                Upload a reference image to guide the AI when generating "Total Look" images. 
                The generated model will resemble this reference in terms of pose, style, and appearance.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-32 h-44 border rounded-lg flex items-center justify-center bg-muted/50 overflow-hidden relative">
                  {modelReferenceImage ? (
                    <>
                      <img 
                        src={modelReferenceImage} 
                        alt="Model reference" 
                        className="w-full h-full object-cover"
                      />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 w-6 h-6"
                        onClick={handleRemoveModelRef}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </>
                  ) : (
                    <User className="w-8 h-8 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <input
                    ref={modelRefInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleModelRefUpload}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    onClick={() => modelRefInputRef.current?.click()}
                    disabled={uploadingModelRef}
                  >
                    {uploadingModelRef ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4 mr-2" />
                    )}
                    {modelReferenceImage ? 'Replace Reference' : 'Upload Reference'}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Upload a full-body photo of a model. The AI will use this as a reference 
                    for pose and appearance when generating "Total Look" images.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Recommended: High-quality full-body photo, 3:4 aspect ratio
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Colors */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Color Theme
              </CardTitle>
              <CardDescription>Customize your platform colors</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                {/* Primary Color */}
                <div className="space-y-2">
                  <Label htmlFor="primaryColor">Primary Color</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      id="primaryColor"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-12 h-12 rounded cursor-pointer border"
                    />
                    <Input
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>

                {/* Secondary Color */}
                <div className="space-y-2">
                  <Label htmlFor="secondaryColor">Secondary Color</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      id="secondaryColor"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="w-12 h-12 rounded cursor-pointer border"
                    />
                    <Input
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>

                {/* Accent Color */}
                <div className="space-y-2">
                  <Label htmlFor="accentColor">Accent Color</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      id="accentColor"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="w-12 h-12 rounded cursor-pointer border"
                    />
                    <Input
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className="mt-6 p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground mb-3">Preview:</p>
                <div className="flex gap-4">
                  <div 
                    className="w-20 h-20 rounded flex items-center justify-center text-white text-xs"
                    style={{ backgroundColor: primaryColor }}
                  >
                    Primary
                  </div>
                  <div 
                    className="w-20 h-20 rounded flex items-center justify-center text-xs"
                    style={{ backgroundColor: secondaryColor }}
                  >
                    Secondary
                  </div>
                  <div 
                    className="w-20 h-20 rounded flex items-center justify-center text-white text-xs"
                    style={{ backgroundColor: accentColor }}
                  >
                    Accent
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Resale Sharing */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="w-5 h-5" />
                Resale Sharing
              </CardTitle>
              <CardDescription>
                Show a "Sell This Item" button on product pages, allowing users to share products to Vinted, Depop, WhatsApp and more.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <Label htmlFor="resaleSharing">Enable resale sharing button</Label>
                <Switch
                  id="resaleSharing"
                  checked={resaleSharingEnabled}
                  onCheckedChange={handleResaleSharingToggle}
                />
              </div>
            </CardContent>
          </Card>

          {/* Repair Service */}
          <RepairServiceSettings />

          {/* Featured Carousels */}
          <FeaturedCarouselSettings
            settingsKey="featured_carousel_football"
            title="Football Shirts Carousel"
            description="Configure which products appear in the Football Shirts carousel on product pages."
          />
          <FeaturedCarouselSettings
            settingsKey="featured_carousel_shoes"
            title="Lifestyle Shoes Carousel"
            description="Configure which products appear in the Lifestyle Shoes carousel on product pages."
          />

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
