import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { ImageIcon, Check, ExternalLink, Loader2, Eye, EyeOff } from 'lucide-react';
import { useAppSettings, ImageProviderSetting } from '@/hooks/useAppSettings';
import { toast } from 'sonner';

interface ProviderOption {
  id: ImageProviderSetting['provider'];
  name: string;
  model: string;
  description: string;
  secretKey?: string;
  keyUrl?: string;
}

const providers: ProviderOption[] = [
  {
    id: 'lovable_ai',
    name: 'Lovable AI',
    model: 'google/gemini-2.5-flash-image-preview',
    description: 'Default - no API key needed'
  },
  {
    id: 'openai',
    name: 'OpenAI',
    model: 'gpt-image-1',
    description: 'High quality image generation',
    secretKey: 'OPENAI_API_KEY',
    keyUrl: 'https://platform.openai.com/api-keys'
  },
  {
    id: 'replicate',
    name: 'Replicate',
    model: 'black-forest-labs/flux-schnell',
    description: 'Fast Flux model',
    secretKey: 'REPLICATE_API_KEY',
    keyUrl: 'https://replicate.com/account/api-tokens'
  },
  {
    id: 'runware',
    name: 'Runware',
    model: 'runware:100@1',
    description: 'Ultra-fast generation',
    secretKey: 'RUNWARE_API_KEY',
    keyUrl: 'https://runware.ai/'
  },
  {
    id: 'huggingface',
    name: 'Hugging Face',
    model: 'black-forest-labs/FLUX.1-schnell',
    description: 'Open-source Flux model',
    secretKey: 'HUGGING_FACE_ACCESS_TOKEN',
    keyUrl: 'https://huggingface.co/settings/tokens'
  }
];

// Store API keys in localStorage for now (browser-specific)
const getStoredKey = (provider: string): string => {
  return localStorage.getItem(`image_provider_key_${provider}`) || '';
};

const setStoredKey = (provider: string, key: string) => {
  if (key) {
    localStorage.setItem(`image_provider_key_${provider}`, key);
  } else {
    localStorage.removeItem(`image_provider_key_${provider}`);
  }
};

export function ImageProviderCard() {
  const { imageProvider, updateImageProvider, loading } = useAppSettings();
  const [selectedProvider, setSelectedProvider] = useState<ImageProviderSetting['provider']>(imageProvider.provider);
  const [saving, setSaving] = useState(false);
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [configuring, setConfiguring] = useState<string | null>(null);

  // Load stored keys on mount
  useState(() => {
    const keys: Record<string, string> = {};
    providers.forEach(p => {
      if (p.secretKey) {
        keys[p.id] = getStoredKey(p.id);
      }
    });
    setApiKeys(keys);
  });

  const handleProviderChange = (providerId: ImageProviderSetting['provider']) => {
    setSelectedProvider(providerId);
  };

  const handleSave = async () => {
    const provider = providers.find(p => p.id === selectedProvider);
    if (!provider) return;

    // Check if API key is required and provided
    if (provider.secretKey && !apiKeys[selectedProvider]) {
      toast.error(`Please configure your ${provider.name} API key first`);
      setConfiguring(selectedProvider);
      return;
    }

    setSaving(true);
    try {
      await updateImageProvider({
        provider: selectedProvider,
        model: provider.model
      });
    } finally {
      setSaving(false);
    }
  };

  const handleKeyChange = (providerId: string, key: string) => {
    setApiKeys(prev => ({ ...prev, [providerId]: key }));
  };

  const handleKeySave = (providerId: string) => {
    setStoredKey(providerId, apiKeys[providerId]);
    toast.success('API key saved');
    setConfiguring(null);
  };

  const toggleShowKey = (providerId: string) => {
    setShowKeys(prev => ({ ...prev, [providerId]: !prev[providerId] }));
  };

  const maskKey = (key: string) => {
    if (!key) return '';
    if (key.length <= 8) return '••••••••';
    return '••••••••' + key.slice(-4);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const currentProvider = providers.find(p => p.id === imageProvider.provider);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Image Generation</CardTitle>
        </div>
        <CardDescription>
          Choose which AI provider to use for generating look images
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Active:</span>
          <Badge variant="secondary">
            {currentProvider?.name} ({currentProvider?.model})
          </Badge>
        </div>

        <RadioGroup
          value={selectedProvider}
          onValueChange={(v) => handleProviderChange(v as ImageProviderSetting['provider'])}
          className="space-y-3"
        >
          {providers.map((provider) => {
            const hasKey = !provider.secretKey || !!apiKeys[provider.id];
            const isSelected = selectedProvider === provider.id;
            const isConfiguring = configuring === provider.id;

            return (
              <div key={provider.id} className="space-y-2">
                <div className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value={provider.id} id={provider.id} />
                    <Label htmlFor={provider.id} className="flex flex-col cursor-pointer">
                      <span className="font-medium">{provider.name}</span>
                      <span className="text-xs text-muted-foreground">{provider.description}</span>
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    {provider.secretKey && (
                      <>
                        {hasKey ? (
                          <Badge variant="outline" className="text-green-600 border-green-600">
                            <Check className="h-3 w-3 mr-1" />
                            Configured
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-amber-600 border-amber-600">
                            Key Required
                          </Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setConfiguring(isConfiguring ? null : provider.id)}
                        >
                          {isConfiguring ? 'Cancel' : 'Configure'}
                        </Button>
                      </>
                    )}
                    {!provider.secretKey && (
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        <Check className="h-3 w-3 mr-1" />
                        Ready
                      </Badge>
                    )}
                  </div>
                </div>

                {isConfiguring && provider.secretKey && (
                  <div className="ml-8 p-3 rounded-lg bg-muted/50 space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor={`key-${provider.id}`}>API Key</Label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Input
                            id={`key-${provider.id}`}
                            type={showKeys[provider.id] ? 'text' : 'password'}
                            value={apiKeys[provider.id] || ''}
                            onChange={(e) => handleKeyChange(provider.id, e.target.value)}
                            placeholder={`Enter your ${provider.name} API key`}
                            className="pr-10"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3"
                            onClick={() => toggleShowKey(provider.id)}
                          >
                            {showKeys[provider.id] ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        <Button onClick={() => handleKeySave(provider.id)}>
                          Save Key
                        </Button>
                      </div>
                    </div>
                    {provider.keyUrl && (
                      <a
                        href={provider.keyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        Get your API key <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    <p className="text-xs text-muted-foreground">
                      ⚠️ Keys are stored in your browser's localStorage (device-specific)
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </RadioGroup>

        <Button
          onClick={handleSave}
          disabled={saving || selectedProvider === imageProvider.provider}
          className="w-full"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Provider Selection'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
