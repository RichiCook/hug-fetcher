import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AddIntegrationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (integration: {
    name: string;
    type: "inbound" | "outbound";
    provider: string;
    webhook_url?: string;
    config?: Record<string, unknown>;
  }) => void;
}

const inboundProviders = [
  { value: "products", label: "Products Import" },
  { value: "leads", label: "Leads Import" },
];

const outboundProviders = [
  { value: "hubspot", label: "HubSpot" },
  { value: "salesforce", label: "Salesforce" },
  { value: "pipedrive", label: "Pipedrive" },
  { value: "zapier", label: "Zapier" },
  { value: "custom", label: "Custom Webhook" },
];

export const AddIntegrationModal = ({ open, onOpenChange, onAdd }: AddIntegrationModalProps) => {
  const [type, setType] = useState<"inbound" | "outbound">("inbound");
  const [name, setName] = useState("");
  const [provider, setProvider] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");

  const handleSubmit = () => {
    if (!name || !provider) return;

    onAdd({
      name,
      type,
      provider,
      webhook_url: type === "outbound" ? webhookUrl : undefined,
    });

    // Reset form
    setName("");
    setProvider("");
    setWebhookUrl("");
    onOpenChange(false);
  };

  const providers = type === "inbound" ? inboundProviders : outboundProviders;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Integration</DialogTitle>
          <DialogDescription>
            Create a new API integration for data import or CRM export.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={type} onValueChange={(v) => setType(v as "inbound" | "outbound")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="inbound">Inbound (Import)</TabsTrigger>
            <TabsTrigger value="outbound">Outbound (Export)</TabsTrigger>
          </TabsList>

          <TabsContent value="inbound" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="name">Integration Name</Label>
              <Input
                id="name"
                placeholder="e.g., Main Product Feed"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="provider">Data Type</Label>
              <Select value={provider} onValueChange={setProvider}>
                <SelectTrigger>
                  <SelectValue placeholder="Select data type" />
                </SelectTrigger>
                <SelectContent>
                  {inboundProviders.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-muted-foreground">
              An API key will be generated automatically after creation.
            </p>
          </TabsContent>

          <TabsContent value="outbound" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="name-out">Integration Name</Label>
              <Input
                id="name-out"
                placeholder="e.g., HubSpot Production"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="provider-out">CRM Provider</Label>
              <Select value={provider} onValueChange={setProvider}>
                <SelectTrigger>
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  {outboundProviders.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="webhook">Webhook URL</Label>
              <Input
                id="webhook"
                placeholder="https://..."
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Lead data will be POSTed to this URL when captured.
              </p>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!name || !provider || (type === "outbound" && !webhookUrl)}>
            Create Integration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
