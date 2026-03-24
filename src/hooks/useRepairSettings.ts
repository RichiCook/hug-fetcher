import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface DamageType {
  id: string;
  name: string;
  description: string;
}

export interface PriceRule {
  damageType: string;
  min: number;
  max: number;
}

export interface EmailField {
  id: string;
  name: string;
  enabled: boolean;
  isCustom?: boolean;
  type?: 'text' | 'dropdown' | 'checkbox';
}

export interface RepairSettings {
  enabled: boolean;
  repairEmail: string;
  emailFields: EmailField[];
  repairCentreAddress: string;
  estimatedTurnaround: string;
  damageTypes: DamageType[];
  priceRules: PriceRule[];
  returnShippingCost: number;
  warrantyCoverRepair: boolean;
}

const DEFAULT_DAMAGE_TYPES: DamageType[] = [
  { id: '1', name: 'Heel damage', description: 'Blade heel scratches, loosening, or re-plating' },
  { id: '2', name: 'Upper fabric', description: 'Lace tears, snagging, or staining' },
  { id: '3', name: 'Sole wear', description: 'Outsole damage or re-soling needed' },
  { id: '4', name: 'Other', description: 'General wear, hardware, or other issues' },
];

const DEFAULT_EMAIL_FIELDS: EmailField[] = [
  { id: 'product_name_sku', name: 'Product name & SKU', enabled: true },
  { id: 'damage_type', name: 'Damage type', enabled: true },
  { id: 'damage_photos', name: 'Damage photos (attached)', enabled: true },
  { id: 'customer_email', name: 'Customer email', enabled: true },
  { id: 'customer_name', name: 'Customer name', enabled: true },
  { id: 'customer_location', name: 'Customer country & city', enabled: true },
  { id: 'warranty_status', name: 'Warranty status', enabled: true },
  { id: 'estimated_cost', name: 'Estimated repair cost', enabled: true },
  { id: 'date_of_request', name: 'Date of request', enabled: true },
];

const DEFAULT_PRICE_RULES: PriceRule[] = [
  { damageType: 'Heel damage', min: 80, max: 150 },
  { damageType: 'Upper fabric', min: 60, max: 120 },
  { damageType: 'Sole wear', min: 50, max: 100 },
  { damageType: 'Other', min: 40, max: 200 },
];

export const DEFAULT_REPAIR_SETTINGS: RepairSettings = {
  enabled: false,
  repairEmail: '',
  emailFields: DEFAULT_EMAIL_FIELDS,
  repairCentreAddress: 'Casadei S.p.A. — Repair Service\nVia Tessenara 5/7\n47833 Morciano di Romagna (RN), Italy',
  estimatedTurnaround: '10–15 working days after receipt',
  damageTypes: DEFAULT_DAMAGE_TYPES,
  priceRules: DEFAULT_PRICE_RULES,
  returnShippingCost: 15,
  warrantyCoverRepair: true,
};

export function useRepairSettings() {
  const [settings, setSettings] = useState<RepairSettings>(DEFAULT_REPAIR_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('id', 'repair_service')
        .single();

      if (!error && data?.value) {
        setSettings({ ...DEFAULT_REPAIR_SETTINGS, ...(data.value as any) });
      }
    } catch (e) {
      console.error('Error fetching repair settings:', e);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (newSettings: RepairSettings) => {
    setSaving(true);
    try {
      await supabase
        .from('app_settings')
        .upsert({
          id: 'repair_service',
          value: newSettings as any,
          updated_at: new Date().toISOString(),
        });
      setSettings(newSettings);
      return true;
    } catch (e) {
      console.error('Error saving repair settings:', e);
      return false;
    } finally {
      setSaving(false);
    }
  };

  return { settings, loading, saving, saveSettings, refetch: fetchSettings };
}
