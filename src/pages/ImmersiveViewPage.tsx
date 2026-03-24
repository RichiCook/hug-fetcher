import { useState } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { useProducts, Product } from '@/hooks/useProducts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Upload, X, Box, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

/* ── Drag-and-drop 3D asset uploader ── */
const ThreeDUpload = ({
  label,
  accept,
  currentUrl,
  folder,
  onUploaded,
  onRemoved,
}: {
  label: string;
  accept: string;
  currentUrl: string | null;
  folder: string;
  onUploaded: (url: string) => void;
  onRemoved: () => void;
}) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = async (file: File) => {
    setUploading(true);
    setProgress(10);
    const ext = file.name.split('.').pop();
    const path = `${folder}/${Date.now()}.${ext}`;
    setProgress(30);
    const { error } = await supabase.storage
      .from('product-3d-assets')
      .upload(path, file, { upsert: true });
    setProgress(80);
    if (error) {
      console.error('Upload error:', error);
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage
      .from('product-3d-assets')
      .getPublicUrl(path);
    setProgress(100);
    onUploaded(urlData.publicUrl);
    setUploading(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  if (currentUrl) {
    const fileName = currentUrl.split('/').pop() || 'file';
    return (
      <div className="flex items-center gap-3 p-3 border border-border rounded-lg bg-secondary/30">
        <Upload className="w-4 h-4 text-muted-foreground shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{label}</p>
          <p className="text-xs text-muted-foreground truncate">{fileName}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onRemoved}>
          <X className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
      className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
        dragOver ? 'border-primary bg-primary/5' : 'border-border'
      }`}
    >
      <Upload className="w-6 h-6 mx-auto text-muted-foreground mb-2" />
      <p className="text-sm font-medium">{label}</p>
      <p className="text-xs text-muted-foreground mt-1">Drag & drop or tap to upload</p>
      <input
        type="file"
        accept={accept}
        onChange={onFileChange}
        className="absolute inset-0 opacity-0 cursor-pointer"
      />
      {uploading && (
        <div className="mt-3">
          <Progress value={progress} className="h-1.5" />
        </div>
      )}
    </div>
  );
};

const ImmersiveViewPage = () => {
  const { products } = useProducts();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [localProducts, setLocalProducts] = useState<Record<string, { model_3d_url?: string | null; panorama_url?: string | null }>>({});

  const filtered = (products || []).filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.product_code || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleSave3DField = async (product: Product, field: 'model_3d_url' | 'panorama_url', value: string | null) => {
    const { error } = await supabase
      .from('products')
      .update({ [field]: value } as any)
      .eq('id', product.id);
    if (error) {
      toast({ title: 'Error', description: `Failed to update ${field}`, variant: 'destructive' });
    } else {
      setLocalProducts((prev) => ({
        ...prev,
        [product.id]: { ...prev[product.id], [field]: value },
      }));
      toast({ title: 'Saved', description: value ? 'File uploaded successfully' : 'File removed' });
    }
  };

  const getFieldValue = (product: Product, field: 'model_3d_url' | 'panorama_url') => {
    if (localProducts[product.id]?.[field] !== undefined) return localProducts[product.id][field];
    return (product as any)?.[field] || null;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-6">
        <AppHeader />

        <div className="mt-6 mb-4">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Box className="w-6 h-6" />
            Immersive View
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Upload 3D models and 360° panoramic images for your products.
          </p>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="space-y-4">
          {filtered.map((product) => (
            <Card key={product.id}>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm font-medium flex items-center gap-3">
                  {product.images && Array.isArray(product.images) && (product.images as string[])[0] && (
                    <img
                      src={(product.images as string[])[0]}
                      alt={product.name}
                      className="w-10 h-10 object-cover rounded"
                    />
                  )}
                  <div className="min-w-0">
                    <p className="truncate">{product.name}</p>
                    {product.product_code && (
                      <p className="text-xs text-muted-foreground font-normal">{product.product_code}</p>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 px-4 pb-4 pt-0">
                <ThreeDUpload
                  label="3D Model (.glb / .gltf)"
                  accept=".glb,.gltf"
                  currentUrl={getFieldValue(product, 'model_3d_url')}
                  folder={`models/${product.id}`}
                  onUploaded={(url) => handleSave3DField(product, 'model_3d_url', url)}
                  onRemoved={() => handleSave3DField(product, 'model_3d_url', null)}
                />
                <ThreeDUpload
                  label="360° Panoramic Image (.jpg / .png)"
                  accept=".jpg,.jpeg,.png"
                  currentUrl={getFieldValue(product, 'panorama_url')}
                  folder={`panoramas/${product.id}`}
                  onUploaded={(url) => handleSave3DField(product, 'panorama_url', url)}
                  onRemoved={() => handleSave3DField(product, 'panorama_url', null)}
                />
              </CardContent>
            </Card>
          ))}

          {filtered.length === 0 && (
            <p className="text-center text-muted-foreground py-8">No products found.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImmersiveViewPage;
