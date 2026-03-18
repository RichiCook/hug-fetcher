import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Bot, 
  Mail, 
  Flame, 
  Eye, 
  EyeOff, 
  ExternalLink, 
  Trash2,
  Check,
  X
} from "lucide-react";
import { FirecrawlService } from "@/utils/FirecrawlService";
import { toast } from "sonner";
import { ImageProviderCard } from "./ImageProviderCard";

interface SecretCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  status: "configured" | "not_configured" | "auto_managed";
  maskedValue?: string;
  helpUrl?: string;
  helpText?: string;
  onUpdate?: (value: string) => void;
  onRemove?: () => void;
  canUpdate?: boolean;
  canRemove?: boolean;
  storageNote?: string;
}

const SecretCard = ({
  title,
  description,
  icon,
  status,
  maskedValue,
  helpUrl,
  helpText,
  onUpdate,
  onRemove,
  canUpdate = true,
  canRemove = false,
  storageNote,
}: SecretCardProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [newValue, setNewValue] = useState("");
  const [showValue, setShowValue] = useState(false);

  const handleSave = () => {
    if (newValue.trim() && onUpdate) {
      onUpdate(newValue.trim());
      setNewValue("");
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setNewValue("");
    setIsEditing(false);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              {icon}
            </div>
            <div>
              <CardTitle className="text-lg">{title}</CardTitle>
              <CardDescription className="mt-1">{description}</CardDescription>
            </div>
          </div>
          <Badge 
            variant={status === "configured" ? "default" : status === "auto_managed" ? "secondary" : "destructive"}
          >
            {status === "configured" ? "Configured" : status === "auto_managed" ? "Auto-managed" : "Not Configured"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {maskedValue && (
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg font-mono text-sm">
            <span className="flex-1">
              {showValue ? maskedValue : "••••••••••••" + maskedValue.slice(-4)}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setShowValue(!showValue)}
            >
              {showValue ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        )}

        {isEditing ? (
          <div className="space-y-3">
            <Input
              type="password"
              placeholder="Enter new API key..."
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              autoFocus
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} disabled={!newValue.trim()}>
                <Check className="h-4 w-4 mr-1" />
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={handleCancel}>
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {canUpdate && status !== "auto_managed" && (
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                {status === "configured" ? "Update Key" : "Add Key"}
              </Button>
            )}
            {canRemove && status === "configured" && onRemove && (
              <Button variant="outline" size="sm" onClick={onRemove}>
                <Trash2 className="h-4 w-4 mr-1" />
                Remove
              </Button>
            )}
          </div>
        )}

        {storageNote && (
          <p className="text-xs text-muted-foreground">
            {storageNote}
          </p>
        )}

        {helpUrl && (
          <a 
            href={helpUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            {helpText || "Get your API key"}
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </CardContent>
    </Card>
  );
};

const SecretsPanel = () => {
  const [firecrawlKey, setFirecrawlKey] = useState<string | null>(null);

  useEffect(() => {
    setFirecrawlKey(FirecrawlService.getApiKey());
  }, []);

  const handleFirecrawlUpdate = (value: string) => {
    FirecrawlService.saveApiKey(value);
    setFirecrawlKey(value);
    toast.success("Firecrawl API key saved");
  };

  const handleFirecrawlRemove = () => {
    FirecrawlService.removeApiKey();
    setFirecrawlKey(null);
    toast.success("Firecrawl API key removed");
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-1">System API Keys</h3>
        <p className="text-sm text-muted-foreground">
          Manage the API keys used by various services in the application.
        </p>
      </div>

      {/* Image Generation Provider Card - Full Width */}
      <ImageProviderCard />

      <div className="grid gap-6 md:grid-cols-2">
        {/* Lovable AI */}
        <SecretCard
          title="Lovable AI (Text)"
          description="Powers AI text generation and look descriptions"
          icon={<Bot className="h-5 w-5" />}
          status="auto_managed"
          helpText="Learn more about Lovable AI"
          helpUrl="https://docs.lovable.dev/features/ai"
          canUpdate={false}
          storageNote="This key is automatically managed by Lovable Cloud and cannot be modified."
        />

        {/* Resend */}
        <SecretCard
          title="Resend Email"
          description="Sends reward codes and notifications via email"
          icon={<Mail className="h-5 w-5" />}
          status="configured"
          maskedValue="re_****"
          helpUrl="https://resend.com/api-keys"
          helpText="Get your Resend API key"
          canUpdate={true}
          storageNote="Stored securely in Lovable Cloud. Contact support to update."
        />

        {/* Firecrawl */}
        <SecretCard
          title="Firecrawl"
          description="Premium web scraping with AI extraction"
          icon={<Flame className="h-5 w-5" />}
          status={firecrawlKey ? "configured" : "not_configured"}
          maskedValue={firecrawlKey || undefined}
          helpUrl="https://firecrawl.dev"
          helpText="Get your Firecrawl API key"
          onUpdate={handleFirecrawlUpdate}
          onRemove={handleFirecrawlRemove}
          canUpdate={true}
          canRemove={true}
          storageNote="Stored in browser localStorage. This key is device-specific."
        />
      </div>
    </div>
  );
};

export default SecretsPanel;
