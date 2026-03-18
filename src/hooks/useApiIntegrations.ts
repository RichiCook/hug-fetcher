import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface ApiIntegration {
  id: string;
  name: string;
  type: "inbound" | "outbound";
  provider: string;
  config: Record<string, unknown>;
  api_key: string | null;
  webhook_url: string | null;
  is_active: boolean;
  last_sync_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiLog {
  id: string;
  integration_id: string | null;
  direction: "inbound" | "outbound";
  status: "success" | "error" | "pending";
  payload: Record<string, unknown>;
  error_message: string | null;
  created_at: string;
}

const generateApiKey = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = 'pk_';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export const useApiIntegrations = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: integrations = [], isLoading } = useQuery({
    queryKey: ["api-integrations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("api_integrations")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as ApiIntegration[];
    },
  });

  const { data: logs = [], isLoading: logsLoading } = useQuery({
    queryKey: ["api-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("api_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as ApiLog[];
    },
  });

  const createIntegration = useMutation({
    mutationFn: async (integration: Partial<ApiIntegration>) => {
      const apiKey = integration.type === "inbound" ? generateApiKey() : null;
      
      const { data, error } = await supabase
        .from("api_integrations")
        .insert({
          name: integration.name!,
          type: integration.type!,
          provider: integration.provider!,
          config: (integration.config || {}) as Record<string, never>,
          api_key: apiKey,
          webhook_url: integration.webhook_url,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-integrations"] });
      toast({ title: "Integration created successfully" });
    },
    onError: (error) => {
      toast({ title: "Error creating integration", description: error.message, variant: "destructive" });
    },
  });

  const updateIntegration = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ApiIntegration> & { id: string }) => {
      const { data, error } = await supabase
        .from("api_integrations")
        .update({
          ...updates,
          config: updates.config as Record<string, never> | undefined,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-integrations"] });
      toast({ title: "Integration updated successfully" });
    },
    onError: (error) => {
      toast({ title: "Error updating integration", description: error.message, variant: "destructive" });
    },
  });

  const deleteIntegration = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("api_integrations")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-integrations"] });
      toast({ title: "Integration deleted successfully" });
    },
    onError: (error) => {
      toast({ title: "Error deleting integration", description: error.message, variant: "destructive" });
    },
  });

  const regenerateApiKey = useMutation({
    mutationFn: async (id: string) => {
      const newKey = generateApiKey();
      const { data, error } = await supabase
        .from("api_integrations")
        .update({ api_key: newKey })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-integrations"] });
      toast({ title: "API key regenerated successfully" });
    },
    onError: (error) => {
      toast({ title: "Error regenerating API key", description: error.message, variant: "destructive" });
    },
  });

  return {
    integrations,
    logs,
    isLoading,
    logsLoading,
    createIntegration,
    updateIntegration,
    deleteIntegration,
    regenerateApiKey,
  };
};
