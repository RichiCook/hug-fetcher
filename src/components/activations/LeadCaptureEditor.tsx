import { LeadCaptureContent } from '@/hooks/useActivations';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

interface LeadCaptureEditorProps {
  content: LeadCaptureContent;
  onChange: (content: LeadCaptureContent) => void;
}

export const LeadCaptureEditor = ({ content, onChange }: LeadCaptureEditorProps) => {
  // Ensure content has defaults for required fields
  const safeContent: LeadCaptureContent = {
    rewardType: 'code_screen',
    ...content,
  };

  const updateField = <K extends keyof LeadCaptureContent>(field: K, value: LeadCaptureContent[K]) => {
    onChange({ ...safeContent, [field]: value });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="lc-title">Title</Label>
        <Input
          id="lc-title"
          value={safeContent.title || ''}
          onChange={(e) => updateField('title', e.target.value)}
          placeholder="Get Your Reward"
        />
      </div>

      <div>
        <Label htmlFor="lc-description">Description</Label>
        <Textarea
          id="lc-description"
          value={safeContent.description || ''}
          onChange={(e) => updateField('description', e.target.value)}
          placeholder="Leave your email to receive an exclusive discount code..."
          rows={3}
        />
      </div>

      <div>
        <Label htmlFor="lc-button">Button Text</Label>
        <Input
          id="lc-button"
          value={safeContent.buttonText || ''}
          onChange={(e) => updateField('buttonText', e.target.value)}
          placeholder="Get My Reward"
        />
      </div>

      <div>
        <Label htmlFor="lc-thank-you">Thank You Message</Label>
        <Input
          id="lc-thank-you"
          value={safeContent.thankYouMessage || ''}
          onChange={(e) => updateField('thankYouMessage', e.target.value)}
          placeholder="Thank you for signing up!"
        />
      </div>

      <div className="border-t pt-4 mt-4">
        <Label className="text-base font-medium">Reward Settings</Label>
      </div>

      <div>
        <Label htmlFor="lc-reward-type">Reward Delivery</Label>
        <Select
          value={safeContent.rewardType}
          onValueChange={(value: 'code_screen' | 'code_email') => updateField('rewardType', value)}
        >
          <SelectTrigger id="lc-reward-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="code_screen">Show code on screen</SelectItem>
            <SelectItem value="code_email">Send code via email</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground mt-1">
          {safeContent.rewardType === 'code_screen' 
            ? 'Code will be displayed immediately after submission'
            : 'Code will be sent to the user\'s email address'}
        </p>
      </div>

      <div>
        <Label htmlFor="lc-prefix">Reward Code Prefix (optional)</Label>
        <Input
          id="lc-prefix"
          value={safeContent.rewardPrefix || ''}
          onChange={(e) => updateField('rewardPrefix', e.target.value.toUpperCase())}
          placeholder="WELCOME"
          maxLength={10}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Example: WELCOME-A3X9K2
        </p>
      </div>

      <div className="border-t pt-4 mt-4">
        <Label className="text-base font-medium">Fields to Collect</Label>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <Label htmlFor="lc-collect-name">Collect Name</Label>
          <p className="text-xs text-muted-foreground">Ask for user's name (optional field)</p>
        </div>
        <Switch
          id="lc-collect-name"
          checked={safeContent.collectName || false}
          onCheckedChange={(checked) => updateField('collectName', checked)}
        />
      </div>

      <div className="flex items-center justify-between">
        <div>
          <Label htmlFor="lc-collect-phone">Collect Phone</Label>
          <p className="text-xs text-muted-foreground">Ask for user's phone number (optional field)</p>
        </div>
        <Switch
          id="lc-collect-phone"
          checked={safeContent.collectPhone || false}
          onCheckedChange={(checked) => updateField('collectPhone', checked)}
        />
      </div>

      <div className="border-t pt-4 mt-4">
        <Label className="text-base font-medium">Styling</Label>
      </div>

      <div>
        <Label htmlFor="lc-bg-image">Background Image URL</Label>
        <Input
          id="lc-bg-image"
          value={safeContent.backgroundImage || ''}
          onChange={(e) => updateField('backgroundImage', e.target.value)}
          placeholder="https://example.com/image.jpg"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="lc-bg-color">Background Color</Label>
          <div className="flex gap-2">
            <Input
              id="lc-bg-color"
              value={safeContent.backgroundColor || ''}
              onChange={(e) => updateField('backgroundColor', e.target.value)}
              placeholder="#ffffff"
            />
            <input
              type="color"
              value={safeContent.backgroundColor || '#ffffff'}
              onChange={(e) => updateField('backgroundColor', e.target.value)}
              className="w-10 h-10 rounded border cursor-pointer"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="lc-text-color">Text Color</Label>
          <div className="flex gap-2">
            <Input
              id="lc-text-color"
              value={safeContent.textColor || ''}
              onChange={(e) => updateField('textColor', e.target.value)}
              placeholder="#000000"
            />
            <input
              type="color"
              value={safeContent.textColor || '#000000'}
              onChange={(e) => updateField('textColor', e.target.value)}
              className="w-10 h-10 rounded border cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
