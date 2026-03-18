import { useState, useEffect } from 'react';
import { Key, Check, X, ExternalLink, Sparkles, Zap } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FirecrawlService } from '@/utils/FirecrawlService';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface ApiKeyInputProps {
  onKeySet: (isSet: boolean) => void;
  onModeChange: (usePremium: boolean) => void;
  usePremiumMode: boolean;
}

export const ApiKeyInput = ({ onKeySet, onModeChange, usePremiumMode }: ApiKeyInputProps) => {
  const [apiKey, setApiKey] = useState('');
  const [isKeySet, setIsKeySet] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const savedKey = FirecrawlService.getApiKey();
    if (savedKey) {
      setIsKeySet(true);
      // Only call onKeySet if premium mode is enabled
      if (usePremiumMode) {
        onKeySet(true);
      }
    }
  }, [onKeySet, usePremiumMode]);

  useEffect(() => {
    // When mode changes, update the key set status
    if (usePremiumMode) {
      const savedKey = FirecrawlService.getApiKey();
      onKeySet(!!savedKey);
    } else {
      // Free mode is always ready
      onKeySet(true);
    }
  }, [usePremiumMode, onKeySet]);

  const handleSaveKey = () => {
    if (!apiKey.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid API key",
        variant: "destructive",
      });
      return;
    }

    FirecrawlService.saveApiKey(apiKey.trim());
    setIsKeySet(true);
    setIsEditing(false);
    onKeySet(true);
    toast({
      title: "Success",
      description: "API key saved successfully",
    });
  };

  const handleRemoveKey = () => {
    FirecrawlService.removeApiKey();
    setIsKeySet(false);
    setApiKey('');
    onKeySet(false);
    toast({
      title: "Removed",
      description: "API key has been removed",
    });
  };

  return (
    <div className="space-y-4">
      {/* Mode Toggle */}
      <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50 border border-border">
        <div className="flex items-center gap-3">
          {usePremiumMode ? (
            <Sparkles className="w-5 h-5 text-primary" />
          ) : (
            <Zap className="w-5 h-5 text-green-500" />
          )}
          <div>
            <p className="text-sm font-medium text-foreground">
              {usePremiumMode ? 'Premium Mode (Firecrawl)' : 'Free Mode'}
            </p>
            <p className="text-xs text-muted-foreground">
              {usePremiumMode
                ? 'AI-powered extraction with better accuracy'
                : 'Basic scraping via CORS proxy (works for many sites)'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="premium-mode" className="text-xs text-muted-foreground">
            Premium
          </Label>
          <Switch
            id="premium-mode"
            checked={usePremiumMode}
            onCheckedChange={onModeChange}
          />
        </div>
      </div>

      {/* API Key Input (only shown in premium mode) */}
      {usePremiumMode && (
        <>
          {isKeySet && !isEditing ? (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-primary/10 border border-primary/20">
              <div className="flex items-center gap-2 text-primary">
                <Check className="w-5 h-5" />
                <span className="text-sm font-medium">Firecrawl API Key Connected</span>
              </div>
              <div className="flex-1" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="text-muted-foreground hover:text-foreground"
              >
                Change
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRemoveKey}
                className="text-destructive hover:text-destructive"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="space-y-3 p-4 rounded-lg bg-secondary/50 border border-border">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Key className="w-4 h-4" />
                <span className="text-sm font-medium">Firecrawl API Key</span>
                <a
                  href="https://firecrawl.dev"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  Get API Key <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="flex gap-2">
                <Input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="fc-xxxxxxxxxxxxxxxx"
                  className="font-mono text-sm bg-background border-border"
                />
                <Button onClick={handleSaveKey} className="shrink-0">
                  Save
                </Button>
                {isEditing && (
                  <Button
                    variant="ghost"
                    onClick={() => setIsEditing(false)}
                    className="shrink-0"
                  >
                    Cancel
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Your API key is stored locally in your browser and never sent to our servers.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};
