// Comprehensive lesion-based analysis for DermaSnap
// Implements hybrid YOLO + rule-based detection, classification, density, and erythema measurement per lesion

export interface CalibrationData {
  referenceType: 'coin' | 'finger' | 'none';
  referenceSizeMm: number; // e.g., 25mm for coin, 15mm for finger width
  referencePixels: number; // measured pixel width of reference
  pixelsPerMm: number; // calculated scale
}

export interface Lesion {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  area: number; // in pixels
  areaMm2: number; // in mm²
  perimeter: number; // in pixels
  circularity: number; // 0-1, 1 = perfect circle
  centerIntensity: number; // average brightness in center region
  redness: number; // erythema index
  rednessPercent: number; // normalized redness percentage
  type: 'pustule' | 'papule' | 'nodule' | 'comedone' | 'whitehead' | 'blackhead';
  isInflammatory: boolean;
  contour: Array<[number, number]>; // boundary points
  centerX: number;
  centerY: number;
}

export interface ROIData {
  name: string; // 'cheek_left', 'cheek_right', 'forehead', etc.
  x: number;
  y: number;
  width: number;
  height: number;
  areaMm2: number;
  lesions: Lesion[];
  density: number; // lesions per cm²
}

export interface LesionAnalysisResult {
  calibration: CalibrationData;
  lesions: Lesion[];
  rois: ROIData[];
  metrics: {
    totalCount: number;
    comedones: number;
    whiteheads: number;
    blackheads: number;
    papules: number;
    pustules: number;
    nodules: number;
    inflammatoryCount: number;
    inflammatoryPercent: number;
    averageDensity: number; // lesions/cm²
    averageRedness: number;
    averageRednessPercent: number;
    severity: 'Mild' | 'Moderate' | 'Severe';
  };
  visualMap: {
    imageWidth: number;
    imageHeight: number;
    lesions: Array<{
      id: string;
      x: number;
      y: number;
      type: string;
      color: string;
    }>;
  };
}

/**
 * Calibrate image scale using reference object (coin/finger)
 * @param pixels - Image pixel data
 * @param width - Image width
 * @param height - Image height
 * @param referenceType - Type of reference object
 * @param referenceSizeMm - Known size of reference in mm
 * @param referencePixels - Measured pixel width of reference (if known)
 * @returns Calibration data
 */
export const calibrateImage = (
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  referenceType: 'coin' | 'finger' | 'none' = 'none',
  referenceSizeMm: number = 25, // Default: coin = 25mm
  referencePixels?: number
): CalibrationData => {
  // If no reference, use default estimation (assume ~10cm face width = ~400px at 800px image width)
  if (referenceType === 'none' || !referencePixels) {
    const estimatedFaceWidthMm = 100; // Average face width ~10cm
    const estimatedFaceWidthPixels = width * 0.5; // Face typically takes ~50% of image width
    const pixelsPerMm = estimatedFaceWidthPixels / estimatedFaceWidthMm;
    
    return {
      referenceType: 'none',
      referenceSizeMm: 0,
      referencePixels: 0,
      pixelsPerMm,
    };
  }

  const pixelsPerMm = referencePixels / referenceSizeMm;

  return {
    referenceType,
    referenceSizeMm,
    referencePixels,
    pixelsPerMm,
  };
};

/**
 * Detect lesions using YOLO-guided approach with precise refinement
 * Phase 1: YOLO detects rough bounding boxes
 * Phase 2: Precise contour extraction within each box using adaptive threshold + watershed
 */
export const detectLesionsWithYOLO = async (
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  skinTone: { r: number; g: number; b: number },
  calibration: CalibrationData,
  imageBase64: string,
  useYOLO: boolean = true
): Promise<Lesion[]> => {
  let yoloBoxes: Array<{ x: number; y: number; width: number; height: number; class: string }> = [];

  // Phase 1: YOLO Detection (if available)
  if (useYOLO) {
    try {
      const { detectWithYOLO } = await import('./yoloDetection');
      const yoloResult = await detectWithYOLO(imageBase64, width, height, true);
      
      // Filter boxes by confidence threshold - INCREASED for fewer false positives
      yoloBoxes = yoloResult.boxes
        .filter(box => box.confidence > 0.5) // Increased from 0.3 to 0.5 (67% increase)
        .map(box => ({
          x: box.x - box.width / 2, // Convert center to top-left
          y: box.y - box.height / 2,
          width: box.width,
          height: box.height,
          class: box.class,
        }));
      
      console.log(`✅ YOLO detected ${yoloBoxes.length} potential lesions`);
    } catch (error) {
      console.warn('⚠️ YOLO detection failed, falling back to rule-based:', error);
      useYOLO = false;
    }
  }

  // Phase 2: Precise contour extraction within YOLO boxes
  if (yoloBoxes.length > 0) {
    return extractPreciseLesionsFromYOLOBoxes(
      pixels,
      width,
      height,
      skinTone,
      calibration,
      yoloBoxes
    );
  }

  // Fallback: Rule-based detection
  return detectLesions(pixels, width, height, skinTone, calibration);
};

/**
 * Extract precise lesions from YOLO bounding boxes
 * For each box: crop patch → adaptive threshold → watershed → precise contour
 */
const extractPreciseLesionsFromYOLOBoxes = (
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  skinTone: { r: number; g: number; b: number },
  calibration: CalibrationData,
  yoloBoxes: Array<{ x: number; y: number; width: number; height: number; class: string }>
): Lesion[] => {
  const lesions: Lesion[] = [];
  const processedPixels = new Set<string>();

  for (let i = 0; i < yoloBoxes.length; i++) {
    const box = yoloBoxes[i];
    
    // Expand box slightly for better context (10% padding)
    const padding = Math.max(box.width, box.height) * 0.1;
    const x1 = Math.max(0, Math.floor(box.x - padding));
    const y1 = Math.max(0, Math.floor(box.y - padding));
    const x2 = Math.min(width - 1, Math.floor(box.x + box.width + padding));
    const y2 = Math.min(height - 1, Math.floor(box.y + box.height + padding));
    const boxWidth = x2 - x1 + 1;
    const boxHeight = y2 - y1 + 1;

    // Extract patch pixels
    const patchPixels = extractPatch(pixels, width, height, x1, y1, boxWidth, boxHeight);
    
    // Create binary map for this patch using adaptive threshold
    const binaryMap = createAdaptiveBinaryMap(
      patchPixels,
      boxWidth,
      boxHeight,
      skinTone,
      box.class
    );

    // Apply watershed-like separation within box
    const patchLesions = extractContoursFromPatch(
      patchPixels,
      binaryMap,
      boxWidth,
      boxHeight,
      x1, // Global offset
      y1,
      skinTone,
      calibration,
      `yolo_lesion_${i}`,
      processedPixels
    );

    // Limit lesions per YOLO box to prevent over-detection
    // Sort by area (largest first) and keep top 3 per box
    const sortedLesions = patchLesions.sort((a, b) => b.area - a.area);
    const topLesions = sortedLesions.slice(0, 3);
    
    lesions.push(...topLesions);
  }

  // Post-processing: Filter out small/weak detections
  return filterLesions(lesions, calibration);
};

/**
 * Extract pixel patch from image
 */
const extractPatch = (
  pixels: Uint8ClampedArray,
  imageWidth: number,
  imageHeight: number,
  x: number,
  y: number,
  patchWidth: number,
  patchHeight: number
): Uint8ClampedArray => {
  const patch = new Uint8ClampedArray(patchWidth * patchHeight * 4);
  
  for (let py = 0; py < patchHeight; py++) {
    for (let px = 0; px < patchWidth; px++) {
      const imgX = x + px;
      const imgY = y + py;
      
      if (imgX >= 0 && imgX < imageWidth && imgY >= 0 && imgY < imageHeight) {
        const imgIdx = (imgY * imageWidth + imgX) * 4;
        const patchIdx = (py * patchWidth + px) * 4;
        
        patch[patchIdx] = pixels[imgIdx];         // R
        patch[patchIdx + 1] = pixels[imgIdx + 1]; // G
        patch[patchIdx + 2] = pixels[imgIdx + 2]; // B
        patch[patchIdx + 3] = pixels[imgIdx + 3]; // A
      }
    }
  }
  
  return patch;
};

/**
 * Create adaptive binary map for patch (more precise than global threshold)
 */
const createAdaptiveBinaryMap = (
  patchPixels: Uint8ClampedArray,
  width: number,
  height: number,
  skinTone: { r: number; g: number; b: number },
  yoloClass: string
): number[] => {
  const binaryMap = new Array(width * height).fill(0);
  
  // Calculate local skin tone (average of patch)
  let localR = 0, localG = 0, localB = 0, count = 0;
  for (let i = 0; i < patchPixels.length; i += 4) {
    localR += patchPixels[i];
    localG += patchPixels[i + 1];
    localB += patchPixels[i + 2];
    count++;
  }
  const localSkinR = localR / count;
  const localSkinG = localG / count;
  const localSkinB = localB / count;

  // Adaptive thresholds based on YOLO class and local skin tone
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = patchPixels[idx];
      const g = patchPixels[idx + 1];
      const b = patchPixels[idx + 2];
      
      const brightness = (r + g + b) / 3;
      const redness = r - ((g + b) / 2);
      const skinDiff = Math.abs(r - localSkinR) + Math.abs(g - localSkinG) + Math.abs(b - localSkinB);

      let isLesion = false;

      if (yoloClass === 'inflammatory' || yoloClass === 'pustule' || yoloClass === 'papule') {
        // Inflammatory: red, raised - STRICTER THRESHOLDS
        isLesion = redness > 22 && brightness > 75 && brightness < 235 && skinDiff > 40;
      } else if (yoloClass === 'comedone' || yoloClass === 'non-inflammatory') {
        // Comedones: dark or bright spots - STRICTER THRESHOLDS
        isLesion = (brightness < 105 && r < localSkinR - 35 && skinDiff > 50) ||
                   (brightness > 155 && redness > 15 && skinDiff > 30);
      } else {
        // Default: use general detection - STRICTER THRESHOLDS
        isLesion = (redness > 25 && brightness > 80 && brightness < 230 && skinDiff > 45) ||
                   (brightness < 110 && r < localSkinR - 40 && skinDiff > 55) ||
                   (brightness > 160 && redness > 18 && skinDiff > 35);
      }

      if (isLesion) {
        binaryMap[y * width + x] = 1;
      }
    }
  }

  return binaryMap;
};

/**
 * Extract precise contours from patch using watershed-like approach
 */
const extractContoursFromPatch = (
  patchPixels: Uint8ClampedArray,
  binaryMap: number[],
  patchWidth: number,
  patchHeight: number,
  globalOffsetX: number,
  globalOffsetY: number,
  skinTone: { r: number; g: number; b: number },
  calibration: CalibrationData,
  baseId: string,
  processedPixels: Set<string>
): Lesion[] => {
  const lesions: Lesion[] = [];
  const visited = new Array(patchWidth * patchHeight).fill(false);
  
  // Apply morphological cleaning
  const cleanedMap = applyMorphology(binaryMap, patchWidth, patchHeight);

  let lesionId = 0;
  for (let y = 1; y < patchHeight - 1; y++) {
    for (let x = 1; x < patchWidth - 1; x++) {
      const idx = y * patchWidth + x;
      const globalX = globalOffsetX + x;
      const globalY = globalOffsetY + y;
      const globalKey = `${globalX},${globalY}`;

      if (cleanedMap[idx] === 1 && !visited[idx] && !processedPixels.has(globalKey)) {
        // Extract contour with global coordinates
        const lesion = extractContourFromPatch(
          patchPixels,
          cleanedMap,
          patchWidth,
          patchHeight,
          x,
          y,
          globalOffsetX,
          globalOffsetY,
          visited,
          skinTone,
          calibration,
          `${baseId}_${lesionId++}`,
          processedPixels
        );

        // Filter by minimum size - at least 0.1mm²
        if (lesion) {
          const areaMm2 = lesion.area * (calibration.pixelsPerMm * calibration.pixelsPerMm);
          const minAreaPixels = Math.max(8, Math.floor(0.1 / (calibration.pixelsPerMm * calibration.pixelsPerMm)));
          
          if (lesion.area >= minAreaPixels && areaMm2 >= 0.1) {
            lesions.push(lesion);
          }
        }
      }
    }
  }

  return lesions;
};

/**
 * Extract contour from patch (similar to extractContour but with global offset)
 */
const extractContourFromPatch = (
  patchPixels: Uint8ClampedArray,
  binaryMap: number[],
  patchWidth: number,
  patchHeight: number,
  startX: number,
  startY: number,
  globalOffsetX: number,
  globalOffsetY: number,
  visited: boolean[],
  skinTone: { r: number; g: number; b: number },
  calibration: CalibrationData,
  id: string,
  processedPixels: Set<string>
): Lesion | null => {
  const queue: Array<[number, number]> = [[startX, startY]];
  const region: Array<[number, number]> = [];
  const contour: Array<[number, number]> = [];
  
  let minX = startX, maxX = startX, minY = startY, maxY = startY;
  let totalR = 0, totalG = 0, totalB = 0;
  let totalRedness = 0;
  let centerR = 0, centerG = 0, centerB = 0, centerCount = 0;

  while (queue.length > 0 && region.length < 500) {
    const [x, y] = queue.shift()!;
    const idx = y * patchWidth + x;

    if (x < 0 || x >= patchWidth || y < 0 || y >= patchHeight || visited[idx] || binaryMap[idx] === 0) {
      continue;
    }

    visited[idx] = true;
    const globalX = globalOffsetX + x;
    const globalY = globalOffsetY + y;
    region.push([globalX, globalY]);
    processedPixels.add(`${globalX},${globalY}`);

    const pixelIdx = idx * 4;
    const r = patchPixels[pixelIdx];
    const g = patchPixels[pixelIdx + 1];
    const b = patchPixels[pixelIdx + 2];

    totalR += r;
    totalG += g;
    totalB += b;

    const redness = r - ((g + b) / 2);
    totalRedness += redness;

    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);

    // Check if pixel is on contour
    let isContour = false;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nX = x + dx;
        const nY = y + dy;
        if (nX < 0 || nX >= patchWidth || nY < 0 || nY >= patchHeight) {
          isContour = true;
          break;
        }
        const nIdx = nY * patchWidth + nX;
        if (binaryMap[nIdx] === 0) {
          isContour = true;
          break;
        }
      }
      if (isContour) break;
    }
    if (isContour) {
      contour.push([globalX, globalY]);
    }

    // Sample center region
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const boxWidth = maxX - minX + 1;
    const boxHeight = maxY - minY + 1;
    const centerRadius = Math.min(boxWidth, boxHeight) * 0.15;

    if (Math.abs(x - centerX) < centerRadius && Math.abs(y - centerY) < centerRadius) {
      centerR += r;
      centerG += g;
      centerB += b;
      centerCount++;
    }

    queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }

  if (region.length < 2) return null;

  const area = region.length;
  const globalMinX = globalOffsetX + minX;
  const globalMinY = globalOffsetY + minY;
  const globalCenterX = globalOffsetX + (minX + maxX) / 2;
  const globalCenterY = globalOffsetY + (minY + maxY) / 2;
  const width_lesion = maxX - minX + 1;
  const height_lesion = maxY - minY + 1;

  const perimeter = contour.length > 0 ? contour.length : Math.max(width_lesion, height_lesion) * 2;
  const circularity = perimeter > 0 ? (4 * Math.PI * area) / (perimeter * perimeter) : 0;
  const areaMm2 = area / (calibration.pixelsPerMm * calibration.pixelsPerMm);

  const centerIntensity = centerCount > 0 
    ? (centerR + centerG + centerB) / (centerCount * 3)
    : (totalR + totalG + totalB) / (area * 3);

  const avgRedness = totalRedness / area;
  const avgR = totalR / area;
  const avgG = totalG / area;
  const avgB = totalB / area;

  const skinBrightness = (skinTone.r + skinTone.g + skinTone.b) / 3;
  const rednessPercent = skinBrightness > 0 
    ? Math.max(0, ((avgR - skinTone.r) / skinBrightness) * 100)
    : 0;

  return {
    id,
    x: globalMinX,
    y: globalMinY,
    width: width_lesion,
    height: height_lesion,
    area,
    areaMm2,
    perimeter,
    circularity,
    centerIntensity,
    redness: avgRedness,
    rednessPercent,
    type: 'papule',
    isInflammatory: false,
    contour,
    centerX: globalCenterX,
    centerY: globalCenterY,
  };
};

/**
 * Detect all potential lesions using thresholding and contour detection (fallback method)
 * Uses watershed-like approach to separate touching lesions
 */
export const detectLesions = (
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  skinTone: { r: number; g: number; b: number },
  calibration: CalibrationData
): Lesion[] => {
  const lesions: Lesion[] = [];
  const visited = new Array(width * height).fill(false);
  const binaryMap = new Array(width * height).fill(0); // 0 = background, 1 = potential lesion

  // Step 1: Create binary map of potential lesions
  for (let y = 5; y < height - 5; y++) {
    for (let x = 5; x < width - 5; x++) {
      const idx = (y * width + x) * 4;
      const r = pixels[idx];
      const g = pixels[idx + 1];
      const b = pixels[idx + 2];

      const brightness = (r + g + b) / 3;
      const redness = r - ((g + b) / 2);
      const skinDiff = Math.abs(r - skinTone.r) + Math.abs(g - skinTone.g) + Math.abs(b - skinTone.b);

      // Detect inflammatory lesions (red, raised) - VERY STRICT THRESHOLDS
      // Increased redness threshold from 25 to 35 to avoid normal skin variations
      const isInflammatory = redness > 35 && brightness > 85 && brightness < 225 && skinDiff > 55;
      
      // Detect comedones (dark spots) - VERY STRICT THRESHOLDS
      // Increased skin difference threshold to avoid normal pores
      const isComedonal = brightness < 100 && r < skinTone.r - 50 && skinDiff > 65;
      
      // Detect bright spots (whiteheads/pustules) - VERY STRICT THRESHOLDS
      // Increased brightness and redness thresholds significantly
      const isBright = brightness > 170 && redness > 25 && skinDiff > 45;

      if (isInflammatory || isComedonal || isBright) {
        binaryMap[y * width + x] = 1;
      }
    }
  }

  // Step 2: Apply morphological operations (erosion/dilation) to clean up noise
  const cleanedMap = applyMorphology(binaryMap, width, height);

  // Step 3: Find connected components (lesions)
  let lesionId = 0;
  for (let y = 5; y < height - 5; y++) {
    for (let x = 5; x < width - 5; x++) {
      const idx = y * width + x;
      if (cleanedMap[idx] === 1 && !visited[idx]) {
        const lesion = extractContour(
          pixels,
          cleanedMap,
          width,
          height,
          x,
          y,
          visited,
          skinTone,
          calibration,
          `lesion_${lesionId++}`
        );
        
        // Filter by minimum size - at least 0.1mm² (approximately 10-20 pixels depending on calibration)
        // Convert area to mm² for filtering
        if (lesion) {
          const areaMm2 = lesion.area * (calibration.pixelsPerMm * calibration.pixelsPerMm);
          const minAreaPixels = Math.max(8, Math.floor(0.1 / (calibration.pixelsPerMm * calibration.pixelsPerMm)));
          
          if (lesion.area >= minAreaPixels && areaMm2 >= 0.1) {
            lesions.push(lesion);
          }
        }
      }
    }
  }

  // Step 4: Apply watershed-like algorithm to separate touching lesions
  const separatedLesions = separateTouchingLesions(lesions, width, height);

  // Step 5: Post-processing filter to remove false positives
  return filterLesions(separatedLesions, calibration);
};

/**
 * Apply morphological operations to clean binary map
 * More aggressive noise removal to reduce false positives
 */
const applyMorphology = (binaryMap: number[], width: number, height: number): number[] => {
  // Step 1: Erosion - remove small noise and isolated pixels
  const eroded = new Array(width * height).fill(0);
  
  for (let y = 2; y < height - 2; y++) {
    for (let x = 2; x < width - 2; x++) {
      const idx = y * width + x;
      if (binaryMap[idx] === 1) {
        // Count neighbors in 3x3 area
        let neighborCount = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nIdx = (y + dy) * width + (x + dx);
            if (binaryMap[nIdx] === 1) {
              neighborCount++;
            }
          }
        }
        // Keep pixel only if it has at least 3 neighbors (not isolated)
        if (neighborCount >= 3) {
          eroded[idx] = 1;
        }
      }
    }
  }
  
  // Step 2: Dilation - restore size of valid lesions
  const dilated = new Array(width * height).fill(0);
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      if (eroded[idx] === 1) {
        // Restore pixel and its neighbors
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nIdx = (y + dy) * width + (x + dx);
            dilated[nIdx] = 1;
          }
        }
      }
    }
  }

  return dilated;
};

/**
 * Extract contour and properties of a lesion
 */
const extractContour = (
  pixels: Uint8ClampedArray,
  binaryMap: number[],
  width: number,
  height: number,
  startX: number,
  startY: number,
  visited: boolean[],
  skinTone: { r: number; g: number; b: number },
  calibration: CalibrationData,
  id: string
): Lesion | null => {
  const queue: Array<[number, number]> = [[startX, startY]];
  const region: Array<[number, number]> = [];
  const contour: Array<[number, number]> = [];
  
  let minX = startX, maxX = startX, minY = startY, maxY = startY;
  let totalR = 0, totalG = 0, totalB = 0;
  let totalRedness = 0;
  let centerR = 0, centerG = 0, centerB = 0, centerCount = 0;

  // Flood fill to get region
  while (queue.length > 0 && region.length < 500) {
    const [x, y] = queue.shift()!;
    const idx = y * width + x;

    if (x < 0 || x >= width || y < 0 || y >= height || visited[idx] || binaryMap[idx] === 0) {
      continue;
    }

    visited[idx] = true;
    region.push([x, y]);

    const pixelIdx = idx * 4;
    const r = pixels[pixelIdx];
    const g = pixels[pixelIdx + 1];
    const b = pixels[pixelIdx + 2];

    totalR += r;
    totalG += g;
    totalB += b;

    const redness = r - ((g + b) / 2);
    totalRedness += redness;

    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);

    // Check if pixel is on contour (has a neighbor that's background)
    let isContour = false;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nX = x + dx;
        const nY = y + dy;
        if (nX < 0 || nX >= width || nY < 0 || nY >= height) {
          isContour = true;
          break;
        }
        const nIdx = nY * width + nX;
        if (binaryMap[nIdx] === 0) {
          isContour = true;
          break;
        }
      }
      if (isContour) break;
    }
    if (isContour) {
      contour.push([x, y]);
    }

    // Sample center region (inner 30% of bounding box)
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const boxWidth = maxX - minX;
    const boxHeight = maxY - minY;
    const centerRadius = Math.min(boxWidth, boxHeight) * 0.15;

    if (Math.abs(x - centerX) < centerRadius && Math.abs(y - centerY) < centerRadius) {
      centerR += r;
      centerG += g;
      centerB += b;
      centerCount++;
    }

    // Add neighbors
    queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }

  if (region.length < 2) return null;

  const area = region.length;
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const width_lesion = maxX - minX + 1;
  const height_lesion = maxY - minY + 1;

  // Calculate perimeter from contour
  const perimeter = contour.length > 0 ? contour.length : Math.max(width_lesion, height_lesion) * 2;

  // Calculate circularity: 4π × area / perimeter²
  const circularity = perimeter > 0 ? (4 * Math.PI * area) / (perimeter * perimeter) : 0;

  // Convert area to mm²
  const areaMm2 = area / (calibration.pixelsPerMm * calibration.pixelsPerMm);

  // Calculate center intensity
  const centerIntensity = centerCount > 0 
    ? (centerR + centerG + centerB) / (centerCount * 3)
    : (totalR + totalG + totalB) / (area * 3);

  // Calculate average redness
  const avgRedness = totalRedness / area;
  const avgR = totalR / area;
  const avgG = totalG / area;
  const avgB = totalB / area;

  // Calculate normalized redness percentage
  const skinBrightness = (skinTone.r + skinTone.g + skinTone.b) / 3;
  const lesionBrightness = (avgR + avgG + avgB) / 3;
  const rednessPercent = skinBrightness > 0 
    ? Math.max(0, ((avgR - skinTone.r) / skinBrightness) * 100)
    : 0;

  return {
    id,
    x: minX,
    y: minY,
    width: width_lesion,
    height: height_lesion,
    area,
    areaMm2,
    perimeter,
    circularity,
    centerIntensity,
    redness: avgRedness,
    rednessPercent,
    type: 'papule', // Will be classified later
    isInflammatory: false, // Will be determined during classification
    contour,
    centerX,
    centerY,
  };
};

/**
 * Separate touching lesions using watershed-like algorithm
 */
const separateTouchingLesions = (
  lesions: Lesion[],
  width: number,
  height: number
): Lesion[] => {
  // Simple approach: if two lesions are very close and similar size, check if they should be merged
  // For now, we'll keep them separate but could implement distance transform + watershed here
  // This is a simplified version - full watershed would require more complex implementation
  
  const separated: Lesion[] = [];
  const processed = new Set<string>();

  for (const lesion of lesions) {
    if (processed.has(lesion.id)) continue;

    // Check for overlapping lesions
    let merged = false;
    for (const other of lesions) {
      if (other.id === lesion.id || processed.has(other.id)) continue;

      const distance = Math.sqrt(
        Math.pow(lesion.centerX - other.centerX, 2) +
        Math.pow(lesion.centerY - other.centerY, 2)
      );

      // If lesions are very close and similar, they might be touching
      // For now, we keep them separate but could merge if needed
      if (distance < 10 && Math.abs(lesion.area - other.area) < lesion.area * 0.5) {
        // Could merge here, but for accuracy, we'll keep separate
      }
    }

    if (!merged) {
      separated.push(lesion);
      processed.add(lesion.id);
    }
  }

  return separated;
};

/**
 * Filter lesions to remove false positives
 * Applies multiple criteria to ensure only real lesions are kept
 * VERY AGGRESSIVE FILTERING to prevent false positives
 */
const filterLesions = (lesions: Lesion[], calibration: CalibrationData): Lesion[] => {
  const filtered = lesions.filter(lesion => {
    // 1. Minimum area: at least 0.3mm² (increased from 0.2mm² for MUCH stricter filtering)
    const areaMm2 = lesion.area * (calibration.pixelsPerMm * calibration.pixelsPerMm);
    if (areaMm2 < 0.3) return false;
    
    // 2. Minimum pixel area: at least 30 pixels (increased from 20)
    if (lesion.area < 30) return false;
    
    // 3. Minimum circularity: at least 0.3 (filters very irregular noise)
    if (lesion.circularity < 0.3) return false;
    
    // 4. Minimum redness for inflammatory lesions: at least 30 (increased from 25)
    if (lesion.isInflammatory && lesion.redness < 30) return false;
    
    // 5. Minimum intensity difference: lesion should be noticeably different from skin
    // For dark lesions (comedones), center intensity should be < 90
    // For bright lesions (pustules), center intensity should be > 140
    if (lesion.centerIntensity > 100 && lesion.centerIntensity < 140) {
      // Suspicious middle range - might be normal skin texture
      if (lesion.redness < 35) return false; // Not red enough to be inflammatory
    }
    
    // 6. Aspect ratio: width/height should be reasonable (not extremely elongated)
    const aspectRatio = lesion.width / Math.max(lesion.height, 1);
    if (aspectRatio > 3 || aspectRatio < 0.33) return false; // Too elongated
    
    // 7. Additional validation: Lesion must have significant color difference
    // Check if the lesion stands out from background
    const colorDifference = Math.abs(lesion.centerIntensity - 128); // Distance from neutral gray
    if (colorDifference < 20 && lesion.redness < 30) return false; // Too similar to normal skin
    
    return true;
  });
  
  // 8. Limit total lesions to prevent over-detection - REDUCED to 30
  // Sort by area (largest first) and keep top 30 lesions max
  const sorted = filtered.sort((a, b) => {
    const areaA = a.area * (calibration.pixelsPerMm * calibration.pixelsPerMm);
    const areaB = b.area * (calibration.pixelsPerMm * calibration.pixelsPerMm);
    return areaB - areaA;
  });
  
  return sorted.slice(0, 30); // Maximum 30 lesions (reduced from 50)
};

/**
 * Classify lesion type based on precise rules
 */
export const classifyLesion = (lesion: Lesion): Lesion => {
  const { areaMm2, circularity, centerIntensity, redness } = lesion;

  // Pustule: area 0.3-5 mm², circularity > 0.6, high center intensity (bright spot)
  if (areaMm2 >= 0.3 && areaMm2 <= 5 && circularity > 0.6 && centerIntensity > 140) {
    return {
      ...lesion,
      type: 'pustule',
      isInflammatory: true,
    };
  }

  // Papule: area 0.2-3 mm², circularity 0.4-0.8, no bright center
  if (areaMm2 >= 0.2 && areaMm2 <= 3 && circularity >= 0.4 && circularity <= 0.8 && centerIntensity < 140) {
    return {
      ...lesion,
      type: 'papule',
      isInflammatory: true,
    };
  }

  // Nodule: area > 5 mm² OR low circularity (< 0.4)
  if (areaMm2 > 5 || circularity < 0.4) {
    return {
      ...lesion,
      type: 'nodule',
      isInflammatory: true,
    };
  }

  // Whitehead: small, bright, closed comedone
  if (areaMm2 < 0.5 && centerIntensity > 130 && circularity > 0.5) {
    return {
      ...lesion,
      type: 'whitehead',
      isInflammatory: false,
    };
  }

  // Blackhead: small, dark, open comedone
  if (areaMm2 < 0.5 && centerIntensity < 100 && circularity > 0.4) {
    return {
      ...lesion,
      type: 'blackhead',
      isInflammatory: false,
    };
  }

  // Default: comedone (non-inflammatory)
  return {
    ...lesion,
    type: 'comedone',
    isInflammatory: false,
  };
};

/**
 * Define Regions of Interest (ROIs) based on face landmarks
 * Simplified version - in production, use MediaPipe or similar for accurate landmarks
 */
export const defineROIs = (
  width: number,
  height: number
): Array<{ name: string; x: number; y: number; width: number; height: number }> => {
  // Simplified ROI definition (assumes face is centered)
  // In production, use face detection to get actual landmarks
  
  const centerX = width / 2;
  const centerY = height * 0.4; // Face typically in upper 40% of image

  return [
    {
      name: 'cheek_left',
      x: centerX - width * 0.25,
      y: centerY,
      width: width * 0.2,
      height: height * 0.15,
    },
    {
      name: 'cheek_right',
      x: centerX + width * 0.05,
      y: centerY,
      width: width * 0.2,
      height: height * 0.15,
    },
    {
      name: 'forehead',
      x: centerX - width * 0.15,
      y: centerY - height * 0.15,
      width: width * 0.3,
      height: height * 0.1,
    },
    {
      name: 'chin',
      x: centerX - width * 0.15,
      y: centerY + height * 0.2,
      width: width * 0.3,
      height: height * 0.1,
    },
  ];
};

/**
 * Calculate density per ROI
 */
export const calculateROIDensity = (
  lesions: Lesion[],
  rois: Array<{ name: string; x: number; y: number; width: number; height: number }>,
  calibration: CalibrationData
): ROIData[] => {
  return rois.map(roi => {
    // Find lesions within ROI
    const roiLesions = lesions.filter(lesion => {
      return (
        lesion.centerX >= roi.x &&
        lesion.centerX <= roi.x + roi.width &&
        lesion.centerY >= roi.y &&
        lesion.centerY <= roi.y + roi.height
      );
    });

    // Calculate ROI area in mm², then convert to cm²
    const roiAreaMm2 = (roi.width / calibration.pixelsPerMm) * (roi.height / calibration.pixelsPerMm);
    const roiAreaCm2 = roiAreaMm2 / 100;

    // Calculate density (lesions per cm²)
    const density = roiAreaCm2 > 0 ? roiLesions.length / roiAreaCm2 : 0;

    return {
      name: roi.name,
      x: roi.x,
      y: roi.y,
      width: roi.width,
      height: roi.height,
      areaMm2: roiAreaMm2,
      lesions: roiLesions,
      density,
    };
  });
};

/**
 * Main function: Comprehensive lesion-based analysis
 * Uses hybrid YOLO + rule-based approach for best accuracy
 */
export const analyzeLesions = async (
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  skinTone: { r: number; g: number; b: number },
  calibration: CalibrationData,
  imageBase64?: string,
  useYOLO: boolean = true
): Promise<LesionAnalysisResult> => {
  // Step 1: Detect all lesions (YOLO-guided if available, else rule-based)
  let detectedLesions: Lesion[];
  
  if (useYOLO && imageBase64) {
    try {
      detectedLesions = await detectLesionsWithYOLO(
        pixels,
        width,
        height,
        skinTone,
        calibration,
        imageBase64,
        true
      );
      console.log(`✅ YOLO-guided detection found ${detectedLesions.length} lesions`);
    } catch (error) {
      console.warn('⚠️ YOLO detection failed, using rule-based fallback:', error);
      detectedLesions = detectLesions(pixels, width, height, skinTone, calibration);
    }
  } else {
    detectedLesions = detectLesions(pixels, width, height, skinTone, calibration);
  }

  // Step 2: Post-process and filter lesions before classification
  const filteredLesions = filterLesions(detectedLesions, calibration);
  
  // Step 3: Classify each lesion
  const classifiedLesions = filteredLesions.map(lesion => classifyLesion(lesion));

  // Step 3: Define ROIs
  const roiDefinitions = defineROIs(width, height);

  // Step 4: Calculate density per ROI
  const rois = calculateROIDensity(classifiedLesions, roiDefinitions, calibration);

  // Step 5: Calculate overall metrics
  const totalCount = classifiedLesions.length;
  const comedones = classifiedLesions.filter(l => l.type === 'comedone').length;
  const whiteheads = classifiedLesions.filter(l => l.type === 'whitehead').length;
  const blackheads = classifiedLesions.filter(l => l.type === 'blackhead').length;
  const papules = classifiedLesions.filter(l => l.type === 'papule').length;
  const pustules = classifiedLesions.filter(l => l.type === 'pustule').length;
  const nodules = classifiedLesions.filter(l => l.type === 'nodule').length;
  const inflammatoryCount = classifiedLesions.filter(l => l.isInflammatory).length;
  const inflammatoryPercent = totalCount > 0 ? (inflammatoryCount / totalCount) * 100 : 0;

  // Average density across all ROIs
  const averageDensity = rois.length > 0
    ? rois.reduce((sum, roi) => sum + roi.density, 0) / rois.length
    : 0;

  // Average redness
  const averageRedness = totalCount > 0
    ? classifiedLesions.reduce((sum, l) => sum + l.redness, 0) / totalCount
    : 0;

  const averageRednessPercent = totalCount > 0
    ? classifiedLesions.reduce((sum, l) => sum + l.rednessPercent, 0) / totalCount
    : 0;

  // Determine severity - VERY CONSERVATIVE THRESHOLDS
  // Clear skin should ALWAYS show Mild, not Severe
  let severity: 'Mild' | 'Moderate' | 'Severe' = 'Mild';
  
  // Clear skin check: If very few lesions, always Mild
  if (totalCount <= 5) {
    severity = 'Mild';
  }
  // Severe: Only for truly severe cases - requires MULTIPLE criteria
  else if (
    (averageDensity > 8 && inflammatoryPercent > 70) || // High density AND high inflammation
    (totalCount > 80 && inflammatoryPercent > 50) || // Many lesions AND inflammation
    (nodules > 5) || // Multiple large nodules
    (totalCount > 100) // Extreme case
  ) {
    severity = 'Severe';
  } 
  // Moderate: Clear threshold - requires significant evidence
  else if (
    (averageDensity > 4 && inflammatoryPercent > 40) || // Moderate density AND inflammation
    (totalCount > 40 && inflammatoryPercent > 30) || // Many lesions with inflammation
    (nodules > 2 && totalCount > 30) // Multiple nodules with other lesions
  ) {
    severity = 'Moderate';
  }
  // Mild: Everything else (including clear skin with few lesions)
  else {
    severity = 'Mild';
  }

  // Create visual map
  const visualMap = {
    imageWidth: width,
    imageHeight: height,
    lesions: classifiedLesions.map(lesion => {
      let color = '#4A90E2'; // Default blue
      if (lesion.type === 'pustule') color = '#E74C3C'; // Red
      else if (lesion.type === 'papule') color = '#E67E22'; // Orange
      else if (lesion.type === 'nodule') color = '#8E44AD'; // Purple
      else if (lesion.type === 'whitehead') color = '#F39C12'; // Yellow
      else if (lesion.type === 'blackhead') color = '#34495E'; // Dark gray
      else if (lesion.type === 'comedone') color = '#95A5A6'; // Light gray

      return {
        id: lesion.id,
        x: lesion.centerX,
        y: lesion.centerY,
        type: lesion.type,
        color,
      };
    }),
  };

  return {
    calibration,
    lesions: classifiedLesions,
    rois,
    metrics: {
      totalCount,
      comedones,
      whiteheads,
      blackheads,
      papules,
      pustules,
      nodules,
      inflammatoryCount,
      inflammatoryPercent: Math.round(inflammatoryPercent * 10) / 10,
      averageDensity: Math.round(averageDensity * 10) / 10,
      averageRedness: Math.round(averageRedness * 10) / 10,
      averageRednessPercent: Math.round(averageRednessPercent * 10) / 10,
      severity,
    },
    visualMap,
  };
};
