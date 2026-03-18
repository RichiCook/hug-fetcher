import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { supabase } from '@/integrations/supabase/client';

export interface ExportProduct {
  url: string;
  product?: {
    name?: string;
    productCode?: string;
    price?: string;
    description?: string;
    composition?: string;
    careInstructions?: string;
    categories?: string[];
    images?: string[];
    wearWith?: Array<{ name?: string; url?: string; price?: string; image?: string }>;
    youMayAlsoLike?: Array<{ name?: string; url?: string; price?: string; image?: string }>;
  };
}

const formatRelatedProducts = (items: Array<{ name?: string; url?: string; price?: string; image?: string }> | undefined): string => {
  if (!items || items.length === 0) return '';
  return items
    .filter(item => item.name || item.url)
    .map(item => `${item.name || 'Unknown'} | ${item.price || 'N/A'} | ${item.url || ''} | ${item.image || ''}`)
    .join(' ;; ');
};

const escapeCsvField = (field: string): string => {
  const escaped = field.replace(/"/g, '""');
  return `"${escaped}"`;
};

const prepareProductRows = (products: ExportProduct[]) => {
  return products.map(p => ({
    URL: p.url || '',
    'Product Code': p.product?.productCode || '',
    Name: p.product?.name || '',
    Price: p.product?.price || '',
    Description: (p.product?.description || '').substring(0, 500),
    Composition: p.product?.composition || '',
    'Care Instructions': p.product?.careInstructions || '',
    Categories: (p.product?.categories || []).join(' > '),
    Images: (p.product?.images || []).join('\n'),
    'Wear With': formatRelatedProducts(p.product?.wearWith),
    'You May Also Like': formatRelatedProducts(p.product?.youMayAlsoLike)
  }));
};

export const exportAsJson = (products: ExportProduct[], filename?: string) => {
  const data = products.map(p => ({
    url: p.url,
    ...p.product
  }));
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `fashion-products-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

export const exportAsCsv = (products: ExportProduct[], filename?: string) => {
  const headers = [
    'URL', 'Product Code', 'Name', 'Price', 'Description', 'Composition',
    'Care Instructions', 'Categories', 'Images', 'Wear With', 'You May Also Like'
  ];

  const rows = products.map(p => {
    const images = (p.product?.images || []).join('\n');
    const wearWith = formatRelatedProducts(p.product?.wearWith);
    const youMayAlsoLike = formatRelatedProducts(p.product?.youMayAlsoLike);

    return [
      p.url || '',
      p.product?.productCode || '',
      p.product?.name || '',
      p.product?.price || '',
      (p.product?.description || '').substring(0, 500),
      p.product?.composition || '',
      p.product?.careInstructions || '',
      (p.product?.categories || []).join(' > '),
      images,
      wearWith,
      youMayAlsoLike
    ].map(escapeCsvField).join(',');
  });

  const csv = [headers.map(escapeCsvField).join(','), ...rows].join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `fashion-products-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

export const exportAsExcel = (products: ExportProduct[], filename?: string) => {
  const rows = prepareProductRows(products);
  const worksheet = XLSX.utils.json_to_sheet(rows);
  
  // Set column widths
  worksheet['!cols'] = [
    { wch: 50 },  // URL
    { wch: 15 },  // Product Code
    { wch: 40 },  // Name
    { wch: 12 },  // Price
    { wch: 60 },  // Description
    { wch: 30 },  // Composition
    { wch: 30 },  // Care Instructions
    { wch: 30 },  // Categories
    { wch: 50 },  // Images
    { wch: 50 },  // Wear With
    { wch: 50 },  // You May Also Like
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');
  XLSX.writeFile(workbook, filename || `fashion-products-${Date.now()}.xlsx`);
};

export const copyProductsJson = async (products: ExportProduct[]) => {
  const data = products.map(p => ({
    url: p.url,
    ...p.product
  }));
  await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
};

interface PdfProduct {
  name: string;
  productCode?: string;
  category?: string;
  collection?: string;
  image?: string;
  shortCode?: string;
}

const loadImageAsBase64 = async (url: string): Promise<string | null> => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
};

const generateQRCodeDataUrl = async (text: string): Promise<string | null> => {
  try {
    return await QRCode.toDataURL(text, {
      width: 100,
      margin: 1,
      errorCorrectionLevel: 'M',
    });
  } catch {
    return null;
  }
};

const getImageProxyUrl = (url: string): string => {
  const encoded = encodeURIComponent(url);
  return `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/export-image-proxy?url=${encoded}`;
};

const imageToCanvasData = (img: HTMLImageElement): { data: string; width: number; height: number } | null => {
  const canvas = document.createElement('canvas');
  const maxDim = 300;
  let w = img.naturalWidth || img.width;
  let h = img.naturalHeight || img.height;
  if (w === 0 || h === 0) return null;
  if (w > maxDim || h > maxDim) {
    const scale = maxDim / Math.max(w, h);
    w = Math.round(w * scale);
    h = Math.round(h * scale);
  }
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, w, h);
  try {
    ctx.drawImage(img, 0, 0, w, h);
    return { data: canvas.toDataURL('image/jpeg', 0.72), width: w, height: h };
  } catch {
    return null;
  }
};

const fetchImageAsBase64 = async (url: string, timeoutMs = 8000): Promise<{ data: string; width: number; height: number } | null> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
    });

    if (!response.ok) throw new Error(`fetch failed: ${response.status}`);

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);

    const result = await new Promise<{ data: string; width: number; height: number } | null>((resolve) => {
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(imageToCanvasData(img));
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(null);
      };
      img.src = objectUrl;
    });

    return result;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
};

const loadImageWithDimensions = async (url: string, timeoutMs = 8000): Promise<{ data: string; width: number; height: number } | null> => {
  const directResult = await fetchImageAsBase64(url, Math.min(timeoutMs, 4000));
  if (directResult) return directResult;

  const proxiedResult = await fetchImageAsBase64(getImageProxyUrl(url), timeoutMs);
  if (proxiedResult) return proxiedResult;

  console.warn('[PDF Export] Failed to load image', url);
  return null;
};

// Load images in parallel batches
const preloadImages = async (
  urls: (string | undefined)[],
  onProgress?: (loaded: number, total: number) => void
): Promise<Map<string, { data: string; width: number; height: number }>> => {
  const results = new Map<string, { data: string; width: number; height: number }>();
  const BATCH_SIZE = 15;
  const uniqueUrls = [...new Set(urls.filter(Boolean) as string[])];
  
  for (let i = 0; i < uniqueUrls.length; i += BATCH_SIZE) {
    const batch = uniqueUrls.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(batch.map(url => loadImageWithDimensions(url)));
    
    batch.forEach((url, idx) => {
      if (batchResults[idx]) results.set(url, batchResults[idx]!);
    });
    
    if (onProgress) onProgress(Math.min(i + BATCH_SIZE, uniqueUrls.length), uniqueUrls.length);
    // Yield to UI thread
    await new Promise(r => setTimeout(r, 10));
  }
  
  return results;
};

export const exportAsPdf = async (
  products: PdfProduct[], 
  filename?: string, 
  baseUrl?: string,
  onProgress?: (current: number, total: number, phase?: string) => void
) => {
  console.log(`[PDF Export] Starting export of ${products.length} products`);
  
  // Phase 1: Pre-load all images in parallel
  console.log(`[PDF Export] Phase 1: Pre-loading images...`);
  const imageUrls = products.map(p => p.image);
  const imageCache = await preloadImages(imageUrls, (loaded, total) => {
    console.log(`[PDF Export] Images: ${loaded}/${total}`);
    if (onProgress) onProgress(loaded, total, `Loading images… ${loaded}/${total}`);
  });
  console.log(`[PDF Export] Loaded ${imageCache.size} images`);

  // Phase 2: Build PDF from cache (fast, no network)
  console.log(`[PDF Export] Phase 2: Building PDF...`);
  if (onProgress) onProgress(0, products.length, `Building PDF…`);
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 8;
  const cols = 6;
  const gap = 3;
  const colWidth = (pageWidth - margin * 2 - gap * (cols - 1)) / cols;
  const imageHeight = 35;
  const cardHeight = 80;
  
  const siteUrl = baseUrl || window.location.origin;
  
  let currentY = margin;
  let currentCol = 0;
  
  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    
    // Check if we need a new page
    if (currentY + cardHeight > pageHeight - margin) {
      pdf.addPage();
      currentY = margin;
      currentCol = 0;
    }
    
    const cardX = margin + currentCol * (colWidth + gap);
    
    // Draw card border
    pdf.setDrawColor(220, 220, 220);
    pdf.setLineWidth(0.3);
    pdf.roundedRect(cardX, currentY, colWidth, cardHeight - 2, 2, 2);
    
    // Product image from cache
    if (product.image) {
      const imgResult = imageCache.get(product.image);
      if (imgResult) {
        const aspectRatio = imgResult.width / imgResult.height;
        const maxWidth = colWidth - 4;
        const maxHeight = imageHeight;
        
        let drawWidth = maxWidth;
        let drawHeight = drawWidth / aspectRatio;
        
        if (drawHeight > maxHeight) {
          drawHeight = maxHeight;
          drawWidth = drawHeight * aspectRatio;
        }
        
        const imgX = cardX + (colWidth - drawWidth) / 2;
        const imgY = currentY + 2;
        
        try {
          pdf.addImage(imgResult.data, 'JPEG', imgX, imgY, drawWidth, drawHeight);
        } catch {
          // Skip if jsPDF can't handle the image
        }
      }
    }
    
    let textY = currentY + imageHeight + 5;
    
    // Product code / SKU
    if (product.productCode) {
      pdf.setFontSize(5);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(80, 80, 80);
      pdf.text(product.productCode, cardX + colWidth / 2, textY, { align: 'center' });
      textY += 3;
    }
    
    // Product name
    pdf.setFontSize(6);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    const nameLines = pdf.splitTextToSize(product.name || 'Unknown', colWidth - 2);
    pdf.text(nameLines.slice(0, 2), cardX + colWidth / 2, textY, { align: 'center' });
    textY += nameLines.slice(0, 2).length * 3;
    
    // Category
    if (product.category) {
      pdf.setFontSize(5);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100, 100, 100);
      const catLines = pdf.splitTextToSize(product.category, colWidth - 2);
      pdf.text(catLines.slice(0, 1), cardX + colWidth / 2, textY + 1, { align: 'center' });
      textY += 3;
    }
    
    // Collection
    let collectionName = product.collection;
    if (!collectionName && product.category) {
      const parts = product.category.split(' > ');
      if (parts.length >= 3) {
        collectionName = parts[parts.length - 1];
      }
    }
    
    if (collectionName) {
      pdf.setFontSize(5);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(50, 50, 50);
      const collectionText = `Collection: ${collectionName}`;
      const collectionLines = pdf.splitTextToSize(collectionText, colWidth - 2);
      pdf.text(collectionLines.slice(0, 1), cardX + colWidth / 2, textY + 1, { align: 'center' });
    }
    
    // QR Code
    if (product.shortCode) {
      const qrSize = 15;
      const qrX = cardX + (colWidth - qrSize) / 2;
      const qrY = currentY + cardHeight - qrSize - 6;
      
      const shortUrl = `${siteUrl}/p/${product.shortCode}`;
      try {
        const qrDataUrl = await generateQRCodeDataUrl(shortUrl);
        if (qrDataUrl) {
          pdf.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);
        }
      } catch {
        // Skip QR
      }
    }
    
    // Move to next column or row
    currentCol++;
    if (currentCol >= cols) {
      currentCol = 0;
      currentY += cardHeight;
    }
    
    // Yield to UI every 20 products and report progress
    if (i % 20 === 0) {
      if (onProgress) onProgress(i + 1, products.length, `Building PDF… ${i + 1}/${products.length}`);
      await new Promise(r => setTimeout(r, 0));
    }
  }
  
  console.log(`[PDF Export] Saving PDF with ${products.length} products`);
  if (onProgress) onProgress(products.length, products.length, 'Saving PDF…');
  pdf.save(filename || `product-demo-${Date.now()}.pdf`);
};
