import { useState, useEffect } from 'react';
import { Wrench, Plus, Trash2, GripVertical, Save, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useRepairSettings, RepairSettings, DamageType, PriceRule, EmailField, DEFAULT_REPAIR_SETTINGS } from '@/hooks/useRepairSettings';

const RepairServiceSettings = () => {
  const { settings, loading, saving, saveSettings } = useRepairSettings();
  const { toast } = useToast();
  const [local, setLocal] = useState<RepairSettings>(DEFAULT_REPAIR_SETTINGS);

  useEffect(() => {
    if (!loading) setLocal(settings);
  }, [settings, loading]);

  const update = <K extends keyof RepairSettings>(key: K, value: RepairSettings[K]) => {
    setLocal(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    const success = await saveSettings(local);
    toast({ title: success ? 'Repair settings saved!' : 'Failed to save', variant: success ? 'default' : 'destructive' });
  };

  // Damage types
  const addDamageType = () => {
    update('damageTypes', [...local.damageTypes, { id: crypto.randomUUID(), name: '', description: '' }]);
  };
  const removeDamageType = (id: string) => {
    update('damageTypes', local.damageTypes.filter(d => d.id !== id));
  };
  const updateDamageType = (id: string, field: keyof DamageType, value: string) => {
    update('damageTypes', local.damageTypes.map(d => d.id === id ? { ...d, [field]: value } : d));
  };

  // Price rules
  const addPriceRule = () => {
    update('priceRules', [...local.priceRules, { damageType: '', min: 0, max: 0 }]);
  };
  const removePriceRule = (idx: number) => {
    update('priceRules', local.priceRules.filter((_, i) => i !== idx));
  };
  const updatePriceRule = (idx: number, field: keyof PriceRule, value: any) => {
    update('priceRules', local.priceRules.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  };

  // Email fields
  const toggleEmailField = (id: string) => {
    update('emailFields', local.emailFields.map(f => f.id === id ? { ...f, enabled: !f.enabled } : f));
  };
  const addCustomField = () => {
    update('emailFields', [...local.emailFields, { id: crypto.randomUUID(), name: '', enabled: true, isCustom: true, type: 'text' }]);
  };
  const removeEmailField = (id: string) => {
    update('emailFields', local.emailFields.filter(f => f.id !== id));
  };
  const updateEmailFieldName = (id: string, name: string) => {
    update('emailFields', local.emailFields.map(f => f.id === id ? { ...f, name } : f));
  };
  const moveEmailField = (idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= local.emailFields.length) return;
    const fields = [...local.emailFields];
    [fields[idx], fields[newIdx]] = [fields[newIdx], fields[idx]];
    update('emailFields', fields);
  };

  if (loading) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wrench className="w-5 h-5" />
          Repair Service
        </CardTitle>
        <CardDescription>Configure the repair request feature on product pages</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* A. Enable/Disable */}
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="repairEnabled">Enable repair service</Label>
            <p className="text-xs text-muted-foreground">Show a "Request a Repair" button on product pages</p>
          </div>
          <Switch id="repairEnabled" checked={local.enabled} onCheckedChange={v => update('enabled', v)} />
        </div>

        {local.enabled && (
          <>
            <Separator />

            {/* B. Repair Email */}
            <div className="space-y-2">
              <Label htmlFor="repairEmail">Repair claims email</Label>
              <p className="text-xs text-muted-foreground">Email address where repair requests are sent</p>
              <Input id="repairEmail" value={local.repairEmail} onChange={e => update('repairEmail', e.target.value)} placeholder="e.g. repairs@casadei.com" />
            </div>

            <Separator />

            {/* C. Email Template Builder */}
            <div className="space-y-3">
              <div>
                <Label>Claim email contents</Label>
                <p className="text-xs text-muted-foreground">Choose which fields are included in the repair claim email</p>
              </div>
              <div className="space-y-2">
                {local.emailFields.map((field, idx) => (
                  <div key={field.id} className="flex items-center gap-2 p-2 border rounded-lg">
                    <div className="flex flex-col gap-0.5">
                      <button onClick={() => moveEmailField(idx, -1)} disabled={idx === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-30 text-xs">▲</button>
                      <button onClick={() => moveEmailField(idx, 1)} disabled={idx === local.emailFields.length - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-30 text-xs">▼</button>
                    </div>
                    <Switch checked={field.enabled} onCheckedChange={() => toggleEmailField(field.id)} className="shrink-0" />
                    {field.isCustom ? (
                      <Input value={field.name} onChange={e => updateEmailFieldName(field.id, e.target.value)} placeholder="Custom field name" className="flex-1 h-8 text-sm" />
                    ) : (
                      <span className="flex-1 text-sm">{field.name}</span>
                    )}
                    {field.isCustom && (
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeEmailField(field.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <Button variant="outline" size="sm" onClick={addCustomField}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Add custom field
              </Button>
            </div>

            <Separator />

            {/* D. Repair Centre Address */}
            <div className="space-y-2">
              <Label>Repair centre address</Label>
              <p className="text-xs text-muted-foreground">Shown to customers as the shipping destination</p>
              <Textarea value={local.repairCentreAddress} onChange={e => update('repairCentreAddress', e.target.value)} rows={3} />
            </div>

            <Separator />

            {/* E. Estimated Turnaround */}
            <div className="space-y-2">
              <Label>Estimated turnaround time</Label>
              <p className="text-xs text-muted-foreground">Shown to customers after they select their country</p>
              <Input value={local.estimatedTurnaround} onChange={e => update('estimatedTurnaround', e.target.value)} />
            </div>

            <Separator />

            {/* F. Damage Types */}
            <div className="space-y-3">
              <div>
                <Label>Repair categories</Label>
                <p className="text-xs text-muted-foreground">Damage types shown to customers in step 1</p>
              </div>
              <div className="space-y-2">
                {local.damageTypes.map(dt => (
                  <div key={dt.id} className="flex items-start gap-2 p-3 border rounded-lg">
                    <div className="flex-1 space-y-1.5">
                      <Input value={dt.name} onChange={e => updateDamageType(dt.id, 'name', e.target.value)} placeholder="e.g. Heel damage" className="h-8 text-sm" />
                      <Input value={dt.description} onChange={e => updateDamageType(dt.id, 'description', e.target.value)} placeholder="Description" className="h-8 text-xs" />
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeDamageType(dt.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button variant="outline" size="sm" onClick={addDamageType}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Add repair category
              </Button>
            </div>

            <Separator />

            {/* G. Pricing */}
            <div className="space-y-3">
              <div>
                <Label>Repair pricing</Label>
                <p className="text-xs text-muted-foreground">Set price ranges and logic for repair estimates</p>
              </div>
              <div className="space-y-2">
                {local.priceRules.map((rule, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-3 border rounded-lg">
                    <select
                      value={rule.damageType}
                      onChange={e => updatePriceRule(idx, 'damageType', e.target.value)}
                      className="flex-1 h-8 text-sm border rounded px-2 bg-background"
                    >
                      <option value="">Select type</option>
                      {local.damageTypes.map(dt => (
                        <option key={dt.id} value={dt.name}>{dt.name}</option>
                      ))}
                    </select>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground">€</span>
                      <Input type="number" value={rule.min} onChange={e => updatePriceRule(idx, 'min', Number(e.target.value))} className="w-20 h-8 text-sm" />
                      <span className="text-xs text-muted-foreground">–</span>
                      <Input type="number" value={rule.max} onChange={e => updatePriceRule(idx, 'max', Number(e.target.value))} className="w-20 h-8 text-sm" />
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removePriceRule(idx)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button variant="outline" size="sm" onClick={addPriceRule}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Add price rule
              </Button>

              <Separator />

              <div className="flex items-center gap-4">
                <div className="flex-1 space-y-1">
                  <Label>Return shipping cost</Label>
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-muted-foreground">€</span>
                    <Input type="number" value={local.returnShippingCost} onChange={e => update('returnShippingCost', Number(e.target.value))} className="w-24 h-8 text-sm" />
                  </div>
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Warranty covers repair</Label>
                      <p className="text-xs text-muted-foreground">Show as potentially free if under warranty</p>
                    </div>
                    <Switch checked={local.warrantyCoverRepair} onCheckedChange={v => update('warrantyCoverRepair', v)} />
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save Repair Settings
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default RepairServiceSettings;
