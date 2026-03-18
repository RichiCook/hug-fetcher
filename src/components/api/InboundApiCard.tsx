import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Copy, RefreshCw, Eye, EyeOff, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ApiIntegration } from "@/hooks/useApiIntegrations";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface InboundApiCardProps {
  integration: ApiIntegration;
  onToggle: (id: string, isActive: boolean) => void;
  onRegenerate: (id: string) => void;
  onDelete: (id: string) => void;
}

export const InboundApiCard = ({ integration, onToggle, onRegenerate, onDelete }: InboundApiCardProps) => {
  const { toast } = useToast();
  const [showApiKey, setShowApiKey] = useState(false);
  const baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} copied to clipboard` });
  };

  const getEndpoint = () => {
    switch (integration.provider) {
      case "products":
        return `${baseUrl}/import-products`;
      case "leads":
        return `${baseUrl}/import-leads`;
      default:
        return `${baseUrl}/${integration.provider}`;
    }
  };

  const maskedKey = integration.api_key 
    ? `${integration.api_key.slice(0, 6)}${"•".repeat(20)}${integration.api_key.slice(-4)}`
    : "";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-lg">{integration.name}</CardTitle>
          <CardDescription className="capitalize">{integration.provider} Import</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={integration.is_active ? "default" : "secondary"}>
            {integration.is_active ? "Active" : "Inactive"}
          </Badge>
          <Switch
            checked={integration.is_active}
            onCheckedChange={(checked) => onToggle(integration.id, checked)}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Endpoint URL</label>
          <div className="flex items-center gap-2">
            <code className="flex-1 p-2 bg-muted rounded text-xs break-all">
              {getEndpoint()}
            </code>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => copyToClipboard(getEndpoint(), "Endpoint")}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">API Key</label>
          <div className="flex items-center gap-2">
            <code className="flex-1 p-2 bg-muted rounded text-xs font-mono">
              {showApiKey ? integration.api_key : maskedKey}
            </code>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowApiKey(!showApiKey)}
            >
              {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => copyToClipboard(integration.api_key || "", "API Key")}
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onRegenerate(integration.id)}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Usage</label>
          <pre className="p-3 bg-muted rounded text-xs overflow-x-auto">
{`curl -X POST ${getEndpoint()} \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ${integration.api_key || 'YOUR_API_KEY'}" \\
  -d '{"${integration.provider}": [...]}'`}
          </pre>
        </div>

        <div className="flex justify-end">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Integration?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete the API key and all associated logs.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(integration.id)}>
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
};
