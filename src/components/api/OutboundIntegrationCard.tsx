import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Trash2, ExternalLink, TestTube } from "lucide-react";
import { ApiIntegration } from "@/hooks/useApiIntegrations";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
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

interface OutboundIntegrationCardProps {
  integration: ApiIntegration;
  onToggle: (id: string, isActive: boolean) => void;
  onDelete: (id: string) => void;
}

const providerIcons: Record<string, string> = {
  hubspot: "🟠",
  salesforce: "☁️",
  pipedrive: "🟢",
  zapier: "⚡",
  custom: "🔗",
};

export const OutboundIntegrationCard = ({ integration, onToggle, onDelete }: OutboundIntegrationCardProps) => {
  const { toast } = useToast();
  const [testing, setTesting] = useState(false);

  const testWebhook = async () => {
    if (!integration.webhook_url) {
      toast({ title: "No webhook URL configured", variant: "destructive" });
      return;
    }

    setTesting(true);
    try {
      const { error } = await supabase.functions.invoke("send-to-crm", {
        body: {
          test: true,
          integrationId: integration.id,
          webhookUrl: integration.webhook_url,
          provider: integration.provider,
        },
      });

      if (error) throw error;
      toast({ title: "Test webhook sent successfully" });
    } catch (error) {
      toast({ 
        title: "Webhook test failed", 
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive" 
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{providerIcons[integration.provider] || "🔗"}</span>
          <div>
            <CardTitle className="text-lg">{integration.name}</CardTitle>
            <CardDescription className="capitalize">{integration.provider}</CardDescription>
          </div>
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
        {integration.webhook_url && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Webhook URL</label>
            <div className="flex items-center gap-2">
              <code className="flex-1 p-2 bg-muted rounded text-xs break-all">
                {integration.webhook_url}
              </code>
              <a
                href={integration.webhook_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>
        )}

        {integration.last_sync_at && (
          <div className="text-xs text-muted-foreground">
            Last sync: {new Date(integration.last_sync_at).toLocaleString()}
          </div>
        )}

        <div className="flex justify-between">
          <Button variant="outline" size="sm" onClick={testWebhook} disabled={testing}>
            <TestTube className="h-4 w-4 mr-2" />
            {testing ? "Testing..." : "Test Webhook"}
          </Button>
          
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
                  This will permanently delete this CRM integration.
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
