import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import defaultLogo from '@/assets/logo.png';
import { Button } from '@/components/ui/button';

const QUERY_TIMEOUT_MS = 5000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Query timed out')), ms)
    ),
  ]);
}

const ShortUrlRedirect = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState(false);

  const fetchProduct = useCallback(async (retryCount = 0) => {
    if (!code) {
      setError(true);
      return;
    }

    try {
      const query = supabase
        .from('products')
        .select('slug, product_code')
        .eq('short_code', code)
        .maybeSingle();

      const { data, error: fetchError } = await withTimeout(
        Promise.resolve(query),
        QUERY_TIMEOUT_MS
      );

      if (fetchError || !data) {
        throw new Error(fetchError?.message || 'Product not found');
      }

      // Navigate immediately
      navigate(`/product/${data.slug}?ref=qr`, { replace: true });

      // Fire-and-forget tracking via edge function
      if (data.product_code) {
        supabase.functions.invoke('track-scan-event', {
          body: { event_type: 'scan', product_code: data.product_code, session_id: crypto.randomUUID(), metadata: { short_code: code } }
        }).catch(() => {});
      }
    } catch (err) {
      console.warn('ShortUrlRedirect lookup failed:', err);
      if (retryCount < 3) {
        await new Promise((r) => setTimeout(r, 1500));
        return fetchProduct(retryCount + 1);
      }
      setError(true);
    }
  }, [code, navigate]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  const logoUrl = defaultLogo;
  const brandName = 'Champion';

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <img src={logoUrl} alt={brandName} className="h-12 mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Product Not Found</h1>
          <p className="text-muted-foreground mb-6">This short link is invalid or expired.</p>
          <Button
            variant="outline"
            onClick={() => {
              setError(false);
              fetchProduct();
            }}
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <img src={logoUrl} alt={brandName} className="h-12 mx-auto mb-4" />
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-muted-foreground">Redirecting...</p>
      </div>
    </div>
  );
};

export default ShortUrlRedirect;
