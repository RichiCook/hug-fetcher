import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Plus, ArrowDownLeft, ArrowUpRight, FileText, Key } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { useApiIntegrations } from "@/hooks/useApiIntegrations";
import { InboundApiCard } from "@/components/api/InboundApiCard";
import { OutboundIntegrationCard } from "@/components/api/OutboundIntegrationCard";
import { ApiLogsTable } from "@/components/api/ApiLogsTable";
import { AddIntegrationModal } from "@/components/api/AddIntegrationModal";
import SecretsPanel from "@/components/api/SecretsPanel";

const ApiSettingsPage = () => {
  const [showAddModal, setShowAddModal] = useState(false);
  const {
    integrations,
    logs,
    isLoading,
    createIntegration,
    updateIntegration,
    deleteIntegration,
    regenerateApiKey,
  } = useApiIntegrations();

  const inboundIntegrations = integrations.filter((i) => i.type === "inbound");
  const outboundIntegrations = integrations.filter((i) => i.type === "outbound");

  const handleToggle = (id: string, isActive: boolean) => {
    updateIntegration.mutate({ id, is_active: isActive });
  };

  const handleRegenerate = (id: string) => {
    regenerateApiKey.mutate(id);
  };

  const handleDelete = (id: string) => {
    deleteIntegration.mutate(id);
  };

  const handleAdd = (integration: {
    name: string;
    type: "inbound" | "outbound";
    provider: string;
    webhook_url?: string;
  }) => {
    createIntegration.mutate(integration);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        <div className="mb-8">
          <AppHeader />
        </div>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">API Management</h1>
            <p className="text-muted-foreground">
              Configure inbound data imports and outbound CRM exports
            </p>
          </div>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Integration
          </Button>
        </div>

        <Tabs defaultValue="inbound" className="space-y-6">
          <TabsList>
            <TabsTrigger value="inbound" className="gap-2">
              <ArrowDownLeft className="h-4 w-4" />
              Inbound ({inboundIntegrations.length})
            </TabsTrigger>
            <TabsTrigger value="outbound" className="gap-2">
              <ArrowUpRight className="h-4 w-4" />
              Outbound ({outboundIntegrations.length})
            </TabsTrigger>
            <TabsTrigger value="secrets" className="gap-2">
              <Key className="h-4 w-4" />
              Secrets
            </TabsTrigger>
            <TabsTrigger value="logs" className="gap-2">
              <FileText className="h-4 w-4" />
              Logs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="inbound">
            {inboundIntegrations.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed rounded-lg">
                <ArrowDownLeft className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Inbound Integrations</h3>
                <p className="text-muted-foreground mb-4">
                  Create an inbound integration to import products or leads via API.
                </p>
                <Button onClick={() => setShowAddModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Inbound Integration
                </Button>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                {inboundIntegrations.map((integration) => (
                  <InboundApiCard
                    key={integration.id}
                    integration={integration}
                    onToggle={handleToggle}
                    onRegenerate={handleRegenerate}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="outbound">
            {outboundIntegrations.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed rounded-lg">
                <ArrowUpRight className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Outbound Integrations</h3>
                <p className="text-muted-foreground mb-4">
                  Connect to a CRM to automatically export leads when captured.
                </p>
                <Button onClick={() => setShowAddModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add CRM Integration
                </Button>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                {outboundIntegrations.map((integration) => (
                  <OutboundIntegrationCard
                    key={integration.id}
                    integration={integration}
                    onToggle={handleToggle}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="secrets">
            <SecretsPanel />
          </TabsContent>

          <TabsContent value="logs">
            <ApiLogsTable logs={logs} integrations={integrations} />
          </TabsContent>
        </Tabs>
      </div>

      <AddIntegrationModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        onAdd={handleAdd}
      />
    </div>
  );
};

export default ApiSettingsPage;
