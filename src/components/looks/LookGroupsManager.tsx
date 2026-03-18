import { useState, useEffect } from 'react';
import { Plus, Trash2, AlertTriangle, Check, X, Settings, Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

// All available category keywords — sportswear
const ALL_CATEGORIES = [
  { id: 'tshirt', label: 'T-Shirt', keywords: ['t-shirt', 't-shirts', 'tshirt'] },
  { id: 'felpa', label: 'Felpe/Hoodies', keywords: ['felpa', 'felpe', 'hoodie', 'hoodies', 'felpe con cappuccio', 'felpe con zip'] },
  { id: 'giacca', label: 'Giacche/Jacket', keywords: ['giacca', 'giacche', 'jacket', 'jackets'] },
  { id: 'pantalone', label: 'Pantaloni/Joggers', keywords: ['pantaloni', 'pantalone', 'jogger', 'joggers', 'cargo', 'pantaloni tuta', 'pantaloni con polsini'] },
  { id: 'pantaloncini', label: 'Pantaloncini/Shorts', keywords: ['pantaloncini', 'shorts', 'short'] },
  { id: 'leggings', label: 'Leggings', keywords: ['leggings', 'legging'] },
  { id: 'reggiseno_sportivo', label: 'Reggiseni Sportivi', keywords: ['reggiseni sportivi', 'reggiseno sportivo', 'sports bra', 'reggiseni', 'bra'] },
  { id: 'top', label: 'Top/Canotte', keywords: ['top', 'canotta', 'canotte', 'tank'] },
  { id: 'tuta', label: 'Tute/Tracksuit', keywords: ['tuta', 'tute', 'tracksuit'] },
  { id: 'polo', label: 'Polo', keywords: ['polo'] },
  { id: 'pile', label: 'Pile/Fleece', keywords: ['pile', 'fleece'] },
  { id: 'maglione', label: 'Maglioni', keywords: ['maglione', 'maglioni', 'sweater', 'sweaters'] },
  { id: 'camicia', label: 'Camicie', keywords: ['camicia', 'camicie', 'shirt'] },
  { id: 'performance', label: 'Performance/Activewear', keywords: ['performance', 'activewear'] },
  { id: 'accessori', label: 'Accessori', keywords: ['accessori', 'cappelli', 'berretti', 'borse', 'zaini', 'borsoni', 'sacca', 'borsa', 'zaino', 'cappello', 'berretto'] },
  { id: 'intimo', label: 'Calze e Intimo', keywords: ['calze', 'intimo', 'underwear', 'socks'] },
  { id: 'mare', label: 'Mare/Beachwear', keywords: ['mare', 'beachwear', 'pantaloncini da mare', 'swim'] },
];

// Types
export interface CategoryPairing {
  category: string;
  allowedWith: string[];
}

export interface ExclusionRule {
  category: string;
  excludes: string[];
  reason?: string;
}

// Default category pairings — sportswear outfit logic
const DEFAULT_PAIRINGS: CategoryPairing[] = [
  { category: 'tshirt', allowedWith: ['pantalone', 'pantaloncini', 'leggings', 'giacca', 'felpa', 'accessori'] },
  { category: 'felpa', allowedWith: ['pantalone', 'pantaloncini', 'leggings', 'tshirt', 'top', 'accessori'] },
  { category: 'giacca', allowedWith: ['tshirt', 'polo', 'felpa', 'top', 'pantalone', 'pantaloncini', 'leggings', 'accessori'] },
  { category: 'pantalone', allowedWith: ['tshirt', 'felpa', 'giacca', 'polo', 'top', 'pile', 'maglione', 'camicia', 'accessori'] },
  { category: 'pantaloncini', allowedWith: ['tshirt', 'felpa', 'top', 'polo', 'reggiseno_sportivo', 'accessori'] },
  { category: 'leggings', allowedWith: ['tshirt', 'felpa', 'top', 'reggiseno_sportivo', 'giacca', 'accessori'] },
  { category: 'reggiseno_sportivo', allowedWith: ['leggings', 'pantaloncini', 'top', 'felpa', 'giacca'] },
  { category: 'top', allowedWith: ['pantalone', 'pantaloncini', 'leggings', 'giacca', 'felpa', 'accessori'] },
  { category: 'tuta', allowedWith: ['tshirt', 'top', 'accessori'] },
  { category: 'polo', allowedWith: ['pantalone', 'pantaloncini', 'giacca', 'accessori'] },
  { category: 'pile', allowedWith: ['tshirt', 'pantalone', 'pantaloncini', 'accessori'] },
  { category: 'maglione', allowedWith: ['pantalone', 'camicia', 'giacca', 'accessori'] },
  { category: 'camicia', allowedWith: ['pantalone', 'maglione', 'giacca', 'accessori'] },
  { category: 'performance', allowedWith: ['leggings', 'pantaloncini', 'reggiseno_sportivo', 'top', 'accessori'] },
  { category: 'accessori', allowedWith: ['tshirt', 'felpa', 'giacca', 'pantalone', 'pantaloncini', 'top', 'polo', 'pile'] },
  { category: 'mare', allowedWith: ['mare', 'accessori'] },
];

// Default exclusion rules — sportswear
const DEFAULT_EXCLUSIONS: ExclusionRule[] = [
  { category: 'mare', excludes: ['tshirt', 'felpa', 'giacca', 'pantalone', 'leggings', 'reggiseno_sportivo', 'tuta', 'polo', 'pile', 'maglione', 'camicia', 'performance', 'intimo'], reason: 'I prodotti mare si abbinano solo tra loro e con accessori' },
];

interface LookGroupsManagerProps {
  onSave?: (pairings: CategoryPairing[], exclusions: ExclusionRule[]) => void;
}

export const LookGroupsManager = ({ onSave }: LookGroupsManagerProps) => {
  const { toast } = useToast();
  const [pairings, setPairings] = useState<CategoryPairing[]>(DEFAULT_PAIRINGS);
  const [exclusions, setExclusions] = useState<ExclusionRule[]>(DEFAULT_EXCLUSIONS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  
  // For adding new pairing
  const [newPairingFrom, setNewPairingFrom] = useState<string>('');
  const [newPairingTo, setNewPairingTo] = useState<string[]>([]);
  
  // For adding new exclusion
  const [newExclusionFrom, setNewExclusionFrom] = useState<string>('');
  const [newExclusionTo, setNewExclusionTo] = useState<string[]>([]);

  // Load settings from database on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select('*')
          .in('id', ['look_pairings', 'look_exclusions']);
        
        if (error) throw error;
        
        const pairingsData = data?.find(d => d.id === 'look_pairings');
        const exclusionsData = data?.find(d => d.id === 'look_exclusions');
        
        if (pairingsData?.value && Array.isArray(pairingsData.value)) {
          setPairings(pairingsData.value as unknown as CategoryPairing[]);
        }
        if (exclusionsData?.value && Array.isArray(exclusionsData.value)) {
          setExclusions(exclusionsData.value as unknown as ExclusionRule[]);
        }
      } catch (err) {
        console.error('Failed to load look group settings:', err);
      } finally {
        setLoading(false);
      }
    };
    
    loadSettings();
  }, []);

  // Save settings to database
  const saveToDatabase = async () => {
    setSaving(true);
    try {
      // Upsert pairings
      const { error: pairingsError } = await supabase
        .from('app_settings')
        .upsert({ id: 'look_pairings', value: pairings as any, updated_at: new Date().toISOString() });
      
      if (pairingsError) throw pairingsError;
      
      // Upsert exclusions
      const { error: exclusionsError } = await supabase
        .from('app_settings')
        .upsert({ id: 'look_exclusions', value: exclusions as any, updated_at: new Date().toISOString() });
      
      if (exclusionsError) throw exclusionsError;
      
      // Clear old cached looks so they regenerate with new rules
      const { error: clearError } = await supabase
        .from('products')
        .update({ generated_look: null })
        .not('generated_look', 'is', null);
      
      if (clearError) {
        console.warn('Failed to clear cached looks:', clearError);
      }
      
      setHasChanges(false);
      toast({ 
        title: 'Impostazioni salvate', 
        description: 'Le regole di abbinamento sono state aggiornate. I look verranno rigenerati con le nuove regole.'
      });
      
      onSave?.(pairings, exclusions);
    } catch (err) {
      console.error('Failed to save settings:', err);
      toast({ 
        title: 'Errore', 
        description: 'Impossibile salvare le impostazioni',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const getCategoryLabel = (id: string) => {
    return ALL_CATEGORIES.find(c => c.id === id)?.label || id;
  };

  // ============ PAIRINGS HANDLERS ============
  
  const handleAddPairing = () => {
    if (!newPairingFrom || newPairingTo.length === 0) return;
    
    // Check if pairing already exists
    const existing = pairings.find(p => p.category === newPairingFrom);
    if (existing) {
      setPairings(prev => prev.map(p => 
        p.category === newPairingFrom 
          ? { ...p, allowedWith: [...new Set([...p.allowedWith, ...newPairingTo])] }
          : p
      ));
    } else {
      setPairings(prev => [...prev, { category: newPairingFrom, allowedWith: newPairingTo }]);
    }
    
    // Also add reverse pairings
    newPairingTo.forEach(to => {
      const existingReverse = pairings.find(p => p.category === to);
      if (existingReverse) {
        setPairings(prev => prev.map(p =>
          p.category === to && !p.allowedWith.includes(newPairingFrom)
            ? { ...p, allowedWith: [...p.allowedWith, newPairingFrom] }
            : p
        ));
      } else {
        setPairings(prev => [...prev, { category: to, allowedWith: [newPairingFrom] }]);
      }
    });
    
    setNewPairingFrom('');
    setNewPairingTo([]);
    setHasChanges(true);
    toast({ title: 'Abbinamento aggiunto - ricorda di salvare!' });
  };

  const handleRemovePairing = (category: string, allowed: string) => {
    setPairings(prev => prev.map(p => {
      if (p.category === category) {
        return { ...p, allowedWith: p.allowedWith.filter(a => a !== allowed) };
      }
      // Also remove the reverse
      if (p.category === allowed) {
        return { ...p, allowedWith: p.allowedWith.filter(a => a !== category) };
      }
      return p;
    }).filter(p => p.allowedWith.length > 0));
    setHasChanges(true);
    toast({ title: 'Abbinamento rimosso - ricorda di salvare!' });
  };

  const togglePairingTo = (categoryId: string) => {
    if (categoryId === newPairingFrom) return;
    setNewPairingTo(prev => 
      prev.includes(categoryId) 
        ? prev.filter(c => c !== categoryId)
        : [...prev, categoryId]
    );
  };

  // ============ EXCLUSIONS HANDLERS ============

  const handleAddExclusion = () => {
    if (!newExclusionFrom || newExclusionTo.length === 0) return;
    
    // Check if exclusion already exists
    const existing = exclusions.find(e => e.category === newExclusionFrom);
    if (existing) {
      setExclusions(prev => prev.map(e => 
        e.category === newExclusionFrom 
          ? { ...e, excludes: [...new Set([...e.excludes, ...newExclusionTo])] }
          : e
      ));
    } else {
      setExclusions(prev => [...prev, { category: newExclusionFrom, excludes: newExclusionTo }]);
    }
    
    // Also add reverse exclusion
    newExclusionTo.forEach(to => {
      const existingReverse = exclusions.find(e => e.category === to);
      if (existingReverse) {
        setExclusions(prev => prev.map(e =>
          e.category === to && !e.excludes.includes(newExclusionFrom)
            ? { ...e, excludes: [...e.excludes, newExclusionFrom] }
            : e
        ));
      } else {
        setExclusions(prev => [...prev, { category: to, excludes: [newExclusionFrom] }]);
      }
    });
    
    setNewExclusionFrom('');
    setNewExclusionTo([]);
    setHasChanges(true);
    toast({ title: 'Esclusione aggiunta - ricorda di salvare!' });
  };

  const handleRemoveExclusion = (category: string, excluded: string) => {
    setExclusions(prev => prev.map(e => {
      if (e.category === category) {
        return { ...e, excludes: e.excludes.filter(ex => ex !== excluded) };
      }
      // Also remove the reverse
      if (e.category === excluded) {
        return { ...e, excludes: e.excludes.filter(ex => ex !== category) };
      }
      return e;
    }).filter(e => e.excludes.length > 0));
    setHasChanges(true);
    toast({ title: 'Esclusione rimossa - ricorda di salvare!' });
  };

  const toggleExclusionTo = (categoryId: string) => {
    if (categoryId === newExclusionFrom) return;
    setNewExclusionTo(prev => 
      prev.includes(categoryId) 
        ? prev.filter(c => c !== categoryId)
        : [...prev, categoryId]
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        <span>Caricamento impostazioni...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Save Button */}
      <div className="flex justify-end">
        <Button 
          onClick={saveToDatabase} 
          disabled={saving || !hasChanges}
          className="gap-2"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Salva Impostazioni
          {hasChanges && <Badge variant="secondary" className="ml-1">modifiche non salvate</Badge>}
        </Button>
      </div>

      <Tabs defaultValue="pairings" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pairings" className="flex items-center gap-2">
            <Check className="w-4 h-4" />
            Abbinamenti Permessi
          </TabsTrigger>
          <TabsTrigger value="exclusions" className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Esclusioni
          </TabsTrigger>
        </TabsList>

        {/* Category Pairings Tab */}
        <TabsContent value="pairings" className="space-y-4 mt-4">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Definisci quali categorie POSSONO essere abbinate insieme. Seleziona una categoria e indica con quali altre può essere combinata.
            </p>

            {/* Add new pairing */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Aggiungi Nuovo Abbinamento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Questa categoria...</Label>
                  <div className="flex flex-wrap gap-2">
                    {ALL_CATEGORIES.map(cat => (
                      <Badge 
                        key={cat.id}
                        variant={newPairingFrom === cat.id ? 'default' : 'outline'}
                        className="cursor-pointer transition-colors"
                        onClick={() => setNewPairingFrom(cat.id)}
                      >
                        {cat.label}
                      </Badge>
                    ))}
                  </div>
                </div>

                {newPairingFrom && (
                  <>
                    <div className="flex items-center gap-2 py-2">
                      <Check className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-muted-foreground">può essere abbinata con...</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {ALL_CATEGORIES.filter(c => c.id !== newPairingFrom).map(cat => (
                        <Badge 
                          key={cat.id}
                          variant={newPairingTo.includes(cat.id) ? 'default' : 'outline'}
                          className={`cursor-pointer transition-colors ${newPairingTo.includes(cat.id) ? 'bg-green-600 hover:bg-green-700' : ''}`}
                          onClick={() => togglePairingTo(cat.id)}
                        >
                          {cat.label}
                          {newPairingTo.includes(cat.id) && (
                            <Check className="w-3 h-3 ml-1" />
                          )}
                        </Badge>
                      ))}
                    </div>
                    
                    <Button 
                      onClick={handleAddPairing}
                      disabled={newPairingTo.length === 0}
                      className="w-full"
                    >
                      Aggiungi Abbinamento
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            <Separator />

            {/* Existing pairings */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Check className="w-4 h-4 text-green-600" />
                Abbinamenti Attivi
              </h3>
              
              <ScrollArea className="h-[400px] pr-4">
                {pairings.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Nessun abbinamento definito
                  </p>
                ) : (
                  <div className="space-y-2">
                    {pairings.map(pairing => (
                      <Card key={pairing.category} className="border-green-500/30">
                        <CardContent className="py-3">
                          <div className="flex items-start gap-3">
                            <Badge variant="secondary" className="mt-0.5">
                              {getCategoryLabel(pairing.category)}
                            </Badge>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Check className="w-4 h-4 text-green-600" />
                                <span className="text-sm text-muted-foreground">può andare con:</span>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {pairing.allowedWith.map(allowed => (
                                  <Badge 
                                    key={allowed}
                                    variant="outline"
                                    className="cursor-pointer group border-green-500/50 text-green-700"
                                    onClick={() => handleRemovePairing(pairing.category, allowed)}
                                  >
                                    {getCategoryLabel(allowed)}
                                    <Trash2 className="w-3 h-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
        </TabsContent>

        {/* Exclusions Tab */}
        <TabsContent value="exclusions" className="space-y-4 mt-4">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Definisci quali categorie NON possono mai essere abbinate insieme
            </p>

            {/* Add new exclusion */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Aggiungi Nuova Esclusione
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Questa categoria...</Label>
                  <div className="flex flex-wrap gap-2">
                    {ALL_CATEGORIES.map(cat => (
                      <Badge 
                        key={cat.id}
                        variant={newExclusionFrom === cat.id ? 'default' : 'outline'}
                        className="cursor-pointer transition-colors"
                        onClick={() => setNewExclusionFrom(cat.id)}
                      >
                        {cat.label}
                      </Badge>
                    ))}
                  </div>
                </div>

                {newExclusionFrom && (
                  <>
                    <div className="flex items-center gap-2 py-2">
                      <X className="w-4 h-4 text-destructive" />
                      <span className="text-sm text-muted-foreground">non va mai con...</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {ALL_CATEGORIES.filter(c => c.id !== newExclusionFrom).map(cat => (
                        <Badge 
                          key={cat.id}
                          variant={newExclusionTo.includes(cat.id) ? 'destructive' : 'outline'}
                          className="cursor-pointer transition-colors"
                          onClick={() => toggleExclusionTo(cat.id)}
                        >
                          {cat.label}
                          {newExclusionTo.includes(cat.id) && (
                            <X className="w-3 h-3 ml-1" />
                          )}
                        </Badge>
                      ))}
                    </div>
                    
                    <Button 
                      onClick={handleAddExclusion}
                      disabled={newExclusionTo.length === 0}
                      className="w-full"
                    >
                      Aggiungi Esclusione
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            <Separator />

            {/* Existing exclusions */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-destructive" />
                Esclusioni Attive
              </h3>
              
              <ScrollArea className="h-[400px] pr-4">
                {exclusions.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Nessuna esclusione definita
                  </p>
                ) : (
                  <div className="space-y-2">
                    {exclusions.map(exclusion => (
                      <Card key={exclusion.category} className="border-destructive/30">
                        <CardContent className="py-3">
                          <div className="flex items-start gap-3">
                            <Badge variant="secondary" className="mt-0.5">
                              {getCategoryLabel(exclusion.category)}
                            </Badge>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <X className="w-4 h-4 text-destructive" />
                                <span className="text-sm text-muted-foreground">non va mai con:</span>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {exclusion.excludes.map(excluded => (
                                  <Badge 
                                    key={excluded}
                                    variant="destructive"
                                    className="cursor-pointer group"
                                    onClick={() => handleRemoveExclusion(exclusion.category, excluded)}
                                  >
                                    {getCategoryLabel(excluded)}
                                    <Trash2 className="w-3 h-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <div className="flex justify-end pt-4 border-t">
        <Button onClick={() => onSave?.(pairings, exclusions)}>
          Salva Configurazione
        </Button>
      </div>
    </div>
  );
};

export { ALL_CATEGORIES, DEFAULT_PAIRINGS, DEFAULT_EXCLUSIONS };
export type { CategoryPairing as OutfitGroup };
