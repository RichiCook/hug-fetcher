import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Lead {
  id: string;
  activation_id: string | null;
  product_id: string | null;
  email: string;
  name: string | null;
  phone: string | null;
  additional_data: Record<string, any>;
  reward_type: string;
  reward_code: string | null;
  reward_sent: boolean;
  created_at: string;
  product?: {
    id: string;
    name: string;
    slug: string;
    images: any[];
  } | null;
  activation?: {
    id: string;
    name: string;
  } | null;
}

export interface LeadFilters {
  dateFrom?: string;
  dateTo?: string;
  productId?: string;
  activationId?: string;
  search?: string;
}

export const useLeads = (filters?: LeadFilters) => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    today: 0,
    thisWeek: 0,
    thisMonth: 0,
  });

  const fetchLeads = async () => {
    setLoading(true);
    
    let query = supabase
      .from('leads')
      .select(`
        *,
        product:products(id, name, slug, images),
        activation:activations(id, name)
      `)
      .order('created_at', { ascending: false });

    if (filters?.dateFrom) {
      query = query.gte('created_at', filters.dateFrom);
    }
    if (filters?.dateTo) {
      query = query.lte('created_at', filters.dateTo);
    }
    if (filters?.productId) {
      query = query.eq('product_id', filters.productId);
    }
    if (filters?.activationId) {
      query = query.eq('activation_id', filters.activationId);
    }
    if (filters?.search) {
      query = query.or(`email.ilike.%${filters.search}%,name.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching leads:', error);
    } else {
      setLeads(data as Lead[] || []);
    }
    setLoading(false);
  };

  const fetchStats = async () => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const [totalRes, todayRes, weekRes, monthRes] = await Promise.all([
      supabase.from('leads').select('id', { count: 'exact', head: true }),
      supabase.from('leads').select('id', { count: 'exact', head: true }).gte('created_at', todayStart),
      supabase.from('leads').select('id', { count: 'exact', head: true }).gte('created_at', weekStart),
      supabase.from('leads').select('id', { count: 'exact', head: true }).gte('created_at', monthStart),
    ]);

    setStats({
      total: totalRes.count || 0,
      today: todayRes.count || 0,
      thisWeek: weekRes.count || 0,
      thisMonth: monthRes.count || 0,
    });
  };

  useEffect(() => {
    fetchLeads();
    fetchStats();
  }, [filters?.dateFrom, filters?.dateTo, filters?.productId, filters?.activationId, filters?.search]);

  const deleteLead = async (id: string): Promise<boolean> => {
    const { error } = await supabase.from('leads').delete().eq('id', id);
    if (error) {
      console.error('Error deleting lead:', error);
      return false;
    }
    await fetchLeads();
    await fetchStats();
    return true;
  };

  const resendRewardEmail = async (leadId: string): Promise<{ success: boolean; error?: string }> => {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) {
      return { success: false, error: 'Lead not found' };
    }

    try {
      const { data, error } = await supabase.functions.invoke('capture-lead', {
        body: {
          resendEmail: true,
          leadId,
          email: lead.email,
          name: lead.name,
          rewardCode: lead.reward_code,
        },
      });

      if (error) throw error;

      await supabase
        .from('leads')
        .update({ reward_sent: true })
        .eq('id', leadId);

      await fetchLeads();
      return { success: true };
    } catch (error: any) {
      console.error('Error resending email:', error);
      return { success: false, error: error.message };
    }
  };

  const exportToCSV = () => {
    const headers = ['Email', 'Name', 'Phone', 'Product', 'Activation', 'Reward Code', 'Reward Type', 'Email Sent', 'Date'];
    const rows = leads.map(lead => [
      lead.email,
      lead.name || '',
      lead.phone || '',
      lead.product?.name || '',
      lead.activation?.name || '',
      lead.reward_code || '',
      lead.reward_type,
      lead.reward_sent ? 'Yes' : 'No',
      new Date(lead.created_at).toLocaleString(),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `leads-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return {
    leads,
    loading,
    stats,
    deleteLead,
    resendRewardEmail,
    exportToCSV,
    refetch: fetchLeads,
  };
};
