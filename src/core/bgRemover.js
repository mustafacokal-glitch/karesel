import { env, pipeline, RawImage, AutoModelForSemanticSegmentation } from '@huggingface/transformers';

// Custom model type mapping registration to resolve transformers.js mapping bug for RMBG-1.4:
if (AutoModelForSemanticSegmentation && AutoModelForSemanticSegmentation.MODEL_CLASS_MAPPINGS) {
  for (const mapping of AutoModelForSemanticSegmentation.MODEL_CLASS_MAPPINGS) {
    if (mapping instanceof Map) {
      mapping.set('SegformerForSemanticSegmentation', 'SegformerForSemanticSegmentation');
    }
  }
}

// Tarayıcı ortamında yerel model dosyaları aranmasını engelleyip doğrudan HuggingFace Hub'dan indirmeyi zorunlu kılıyoruz:
env.allowLocalModels = false;

let segmentator = null;

async function getSegmentator() {
  if (!segmentator) {
    segmentator = await pipeline('image-segmentation', 'briaai/RMBG-1.4');
  }
  return segmentator;
}

/**
 * Yüklenen bir ImageData'nın arka planını Transformers.js (RMBG-1.4)
 * yöntemiyle temizler.
 *
 * @param {ImageData} imageData - Canvas'tan alınan piksel verisi
 * @returns {Promise<ImageData>} Arka planı şeffaflaştırılmış ImageData
 */
export async function removeBackground(imageData) {
  try {
    const segmenter = await getSegmentator();

    // 1. Gerekirse görseli küçült (Maksimum boyut 1024px)
    const MAX_SIZE = 1024;
    let processData = imageData;
    
    if (imageData.width > MAX_SIZE || imageData.height > MAX_SIZE) {
      const scale = MAX_SIZE / Math.max(imageData.width, imageData.height);
      const newWidth = Math.round(imageData.width * scale);
      const newHeight = Math.round(imageData.height * scale);

      const canvas = document.createElement('canvas');
      canvas.width = imageData.width;
      canvas.height = imageData.height;
      const ctx = canvas.getContext('2d');
      ctx.putImageData(imageData, 0, 0);

      const targetCanvas = document.createElement('canvas');
      targetCanvas.width = newWidth;
      targetCanvas.height = newHeight;
      const targetCtx = targetCanvas.getContext('2d');
      // Daha pürüzsüz küçültme için
      targetCtx.imageSmoothingEnabled = true;
      targetCtx.imageSmoothingQuality = 'high';
      targetCtx.drawImage(canvas, 0, 0, newWidth, newHeight);
      
      processData = targetCtx.getImageData(0, 0, newWidth, newHeight);
    }

    const rawImage = new RawImage(
      processData.data,
      processData.width,
      processData.height,
      4
    );

    const result = await segmenter(rawImage);

    let maskImage = null;
    if (Array.isArray(result) && result.length > 0) {
      maskImage = result[0].mask;
    } else if (result && result.mask) {
      maskImage = result.mask;
    } else {
      throw new Error('Model geçerli bir segmentasyon maskesi döndürmedi.');
    }

    if (!maskImage) {
      throw new Error('Maske görseli boş.');
    }

    if (maskImage.width !== processData.width || maskImage.height !== processData.height) {
      maskImage = await maskImage.resize(processData.width, processData.height);
    }

    const output = new ImageData(processData.width, processData.height);
    const origData = processData.data;
    const maskData = maskImage.data;
    const maskChannels = maskImage.channels;

    for (let i = 0; i < origData.length; i += 4) {
      output.data[i] = origData[i];
      output.data[i + 1] = origData[i + 1];
      output.data[i + 2] = origData[i + 2];

      let alphaVal = 255;
      if (maskChannels === 1) {
        alphaVal = maskData[i / 4];
      } else {
        alphaVal = maskData[i];
      }

      // Eşik koruması: Çok düşük opaklık değerlerini tamamen şeffaf yap (temiz arkaplan)
      output.data[i + 3] = alphaVal < 10 ? 0 : alphaVal;
    }

    return output;
  } catch (err) {
    console.error('[bgRemover] Hata:', err);
    throw new Error('Arka plan temizlenirken bir hata oluştu: ' + err.message);
  }
}