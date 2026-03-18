import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

type EventType = 'scan' | 'page_view' | 'look_product_click' | 'look_regenerate' | 'lead_capture';

function getSessionId(): string {
  const key = 'scan_session_id';
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(key, id);
  }
  return id;
}

export function useScanTracking() {
  const sentEvents = useRef<Set<string>>(new Set());

  const trackEvent = useCallback(async (
    eventType: EventType,
    productCode: string,
    options?: {
      targetProductCode?: string;
      lookProductCodes?: string[];
      metadata?: Record<string, unknown>;
    }
  ) => {
    // Deduplicate page_view per product per session
    if (eventType === 'page_view') {
      const dedupeKey = `${eventType}:${productCode}`;
      if (sentEvents.current.has(dedupeKey)) return;
      sentEvents.current.add(dedupeKey);
    }

    try {
      await supabase.functions.invoke('track-scan-event', {
        body: {
          session_id: getSessionId(),
          event_type: eventType,
          product_code: productCode,
          target_product_code: options?.targetProductCode,
          look_product_codes: options?.lookProductCodes,
          metadata: options?.metadata,
        },
      });
    } catch (err) {
      // Fire and forget — never block UI
      console.debug('Tracking error (non-blocking):', err);
    }
  }, []);

  return { trackEvent };
}
