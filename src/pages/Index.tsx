import { useState } from 'react';
import { Bookmark } from 'lucide-react';
import { ApiKeyInput } from '@/components/ApiKeyInput';
import { ScrapeForm, ScrapeResult } from '@/components/ScrapeForm';
import { BulkResultsDisplay } from '@/components/BulkResultsDisplay';
import { SavedProductsPanel } from '@/components/SavedProductsPanel';
import { useSavedProducts } from '@/hooks/useSavedProducts';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { AppHeader } from '@/components/AppHeader';
import CelebritySlideshow from '@/components/CelebritySlideshow';

const Index = () => {
  const [isApiKeySet, setIsApiKeySet] = useState(true);
  const [usePremiumMode, setUsePremiumMode] = useState(false);
  const [results, setResults] = useState<ScrapeResult[]>([]);
  const { savedProducts, loading: productsLoading, saveProducts, deleteProduct, clearAllSaved, deleteDuplicates, toggleAvailability, bulkToggleAvailability, checkAvailability, classifyShoes, refetch } = useSavedProducts();
  const { toast } = useToast();

  const handleSaveResults = async () => {
    const count = await saveProducts(results);
    toast({
      title: "Saved!",
      description: `${count} product${count !== 1 ? 's' : ''} saved to database`
    });
  };

  const successfulResults = results.filter(r => r.status === 'success');

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto px-4 py-16">
        {/* Header */}
        <header className="mb-16">
          <div className="mb-12">
            <AppHeader onImportComplete={refetch} />
          </div>
          
          <h1 className="text-3xl font-light tracking-tight text-foreground mb-3">
            Fashion Product Extractor
          </h1>
          
          <p className="text-muted-foreground font-light">
            Extract product codes, images, prices, and descriptions from fashion websites.
          </p>
        </header>

        {/* Main content */}
        <main className="space-y-12">
          {/* API Key Section */}
          <section>
            <ApiKeyInput 
              onKeySet={setIsApiKeySet} 
              onModeChange={setUsePremiumMode}
              usePremiumMode={usePremiumMode}
            />
          </section>

          {/* Scrape Form */}
          <section className="p-8 rounded-lg border border-border bg-card">
            <ScrapeForm 
              onResults={setResults} 
              isApiKeySet={isApiKeySet}
              usePremiumMode={usePremiumMode}
            />
          </section>

          {/* Saved Products */}
          <SavedProductsPanel 
            savedProducts={savedProducts}
            loading={productsLoading}
            onDelete={deleteProduct}
            onClearAll={clearAllSaved}
            onDeleteDuplicates={deleteDuplicates}
            onToggleAvailability={toggleAvailability}
            onBulkToggleAvailability={bulkToggleAvailability}
            onCheckAvailability={checkAvailability}
            onClassifyShoes={classifyShoes}
          />

          {/* Results */}
          {results.length > 0 && (
            <section className="animate-in">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-medium text-foreground">
                  Results ({results.length})
                </h2>
                {successfulResults.length > 0 && (
                  <Button variant="outline" size="sm" onClick={handleSaveResults}>
                    <Bookmark className="w-4 h-4 mr-2" />
                    Save All ({successfulResults.length})
                  </Button>
                )}
              </div>
              <BulkResultsDisplay results={results} />
            </section>
          )}
        </main>

        {/* Celebrity Slideshow */}
        <CelebritySlideshow />

        {/* Footer */}
        <footer className="mt-20 pt-8 border-t border-border">
          <p className="text-sm text-muted-foreground font-light">
            {usePremiumMode ? 'Premium mode with Firecrawl API' : 'Free mode'}
          </p>
        </footer>
      </div>
    </div>
  );
};

export default Index;
