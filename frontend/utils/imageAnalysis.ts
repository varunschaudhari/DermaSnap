// Image processing and analysis utilities

// Convert image to grayscale for analysis
export const toGrayscale = (imageData: ImageData): ImageData => {
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    data[i] = gray;
    data[i + 1] = gray;
    data[i + 2] = gray;
  }
  return imageData;
};

// Convert RGB to LAB color space (simplified approximation)
export const rgbToLab = (r: number, g: number, b: number) => {
  // Normalize RGB values
  r = r / 255;
  g = g / 255;
  b = b / 255;

  // Apply gamma correction
  r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
  g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
  b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

  // Convert to XYZ
  let x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
  let y = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 1.0;
  let z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;

  // Convert XYZ to LAB
  x = x > 0.008856 ? Math.pow(x, 1 / 3) : (7.787 * x) + 16 / 116;
  y = y > 0.008856 ? Math.pow(y, 1 / 3) : (7.787 * y) + 16 / 116;
  z = z > 0.008856 ? Math.pow(z, 1 / 3) : (7.787 * z) + 16 / 116;

  const L = (116 * y) - 16;
  const A = 500 * (x - y);
  const B = 200 * (y - z);

  return { L, A, B };
};

// Detect skin tone for baseline
export const detectSkinTone = (pixels: Uint8ClampedArray, width: number, height: number) => {
  let totalR = 0, totalG = 0, totalB = 0;
  let count = 0;

  // Sample center region (30% of image)
  const startX = Math.floor(width * 0.35);
  const endX = Math.floor(width * 0.65);
  const startY = Math.floor(height * 0.35);
  const endY = Math.floor(height * 0.65);

  for (let y = startY; y < endY; y++) {
    for (let x = startX; x < endX; x++) {
      const idx = (y * width + x) * 4;
      const r = pixels[idx];
      const g = pixels[idx + 1];
      const b = pixels[idx + 2];

      // Check if pixel looks like skin
      if (r > 95 && g > 40 && b > 20 &&
          r > g && r > b &&
          Math.abs(r - g) > 15) {
        totalR += r;
        totalG += g;
        totalB += b;
        count++;
      }
    }
  }

  if (count === 0) return { r: 200, g: 150, b: 130 };

  return {
    r: Math.floor(totalR / count),
    g: Math.floor(totalG / count),
    b: Math.floor(totalB / count),
  };
};

// Analyze acne lesions
export const analyzeAcne = (pixels: Uint8ClampedArray, width: number, height: number, skinTone: any) => {
  const lesions: any[] = [];
  let totalRedness = 0;
  let poreCount = 0;
  let totalPoreSize = 0;

  // Create visited map
  const visited = new Array(width * height).fill(false);

  // Detect lesions using region growing
  for (let y = 10; y < height - 10; y += 3) {
    for (let x = 10; x < width - 10; x += 3) {
      const idx = (y * width + x) * 4;
      if (visited[y * width + x]) continue;

      const r = pixels[idx];
      const g = pixels[idx + 1];
      const b = pixels[idx + 2];

      // Detect red/inflamed areas (pustules/papules)
      const redness = r - ((g + b) / 2);
      const brightness = (r + g + b) / 3;

      if (redness > 20 && brightness > 80 && brightness < 220) {
        // Found potential lesion
        const lesion = growRegion(pixels, width, height, x, y, visited, 'inflammatory');
        if (lesion.area > 3 && lesion.area < 200) {
          lesion.type = classifyLesion(lesion);
          lesions.push(lesion);
          totalRedness += lesion.redness;
        }
      }
      // Detect dark spots (comedones)
      else if (brightness < 100 && r < skinTone.r - 40) {
        const lesion = growRegion(pixels, width, height, x, y, visited, 'comedonal');
        if (lesion.area > 2 && lesion.area < 150) {
          lesion.type = 'comedone';
          lesions.push(lesion);
        }
      }
      // Detect pores (small dark spots)
      else if (brightness < 120 && r < skinTone.r - 20) {
        const avgNeighborBrightness = getNeighborBrightness(pixels, width, height, x, y);
        if (avgNeighborBrightness - brightness > 30) {
          poreCount++;
          totalPoreSize += 2; // Approximate size
        }
      }
    }
  }

  // Calculate metrics
  const totalCount = lesions.length;
  const inflammatoryCount = lesions.filter(l => l.type !== 'comedone').length;
  const inflammatoryPercent = totalCount > 0 ? (inflammatoryCount / totalCount) * 100 : 0;
  
  const cmSquared = (width * height) / 10000; // Approximate cm²
  const density = totalCount / cmSquared;
  
  const avgRedness = totalCount > 0 ? totalRedness / totalCount : 0;
  const rednessPercent = (avgRedness / 128) * 100;

  const avgPoreSize = poreCount > 0 ? totalPoreSize / poreCount : 0;
  const poreDensity = poreCount / cmSquared;

  return {
    lesions,
    metrics: {
      totalCount,
      comedones: lesions.filter(l => l.type === 'comedone').length,
      pustules: lesions.filter(l => l.type === 'pustule').length,
      papules: lesions.filter(l => l.type === 'papule').length,
      nodules: lesions.filter(l => l.type === 'nodule').length,
      inflammatoryPercent: Math.round(inflammatoryPercent),
      density: density.toFixed(2),
      rednessPercent: Math.round(rednessPercent),
      poreCount,
      avgPoreSize: Math.round(avgPoreSize),
      poreDensity: poreDensity.toFixed(1),
    },
  };
};

// Region growing algorithm
const growRegion = (
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  startX: number,
  startY: number,
  visited: boolean[],
  type: string
) => {
  const queue = [[startX, startY]];
  const region: number[] = [];
  let totalR = 0, totalG = 0, totalB = 0;
  let minX = startX, maxX = startX, minY = startY, maxY = startY;

  const startIdx = (startY * width + startX) * 4;
  const targetR = pixels[startIdx];
  const targetG = pixels[startIdx + 1];
  const targetB = pixels[startIdx + 2];

  while (queue.length > 0 && region.length < 300) {
    const [x, y] = queue.shift()!;
    const idx = y * width + x;

    if (x < 0 || x >= width || y < 0 || y >= height || visited[idx]) continue;

    const pixelIdx = idx * 4;
    const r = pixels[pixelIdx];
    const g = pixels[pixelIdx + 1];
    const b = pixels[pixelIdx + 2];

    const diff = Math.abs(r - targetR) + Math.abs(g - targetG) + Math.abs(b - targetB);
    if (diff > 50) continue;

    visited[idx] = true;
    region.push(idx);
    totalR += r;
    totalG += g;
    totalB += b;

    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);

    queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }

  const area = region.length;
  const width_lesion = maxX - minX + 1;
  const height_lesion = maxY - minY + 1;
  const circularity = area > 0 ? (4 * Math.PI * area) / Math.pow(width_lesion + height_lesion, 2) : 0;

  const avgR = totalR / area;
  const avgG = totalG / area;
  const avgB = totalB / area;
  const redness = avgR - ((avgG + avgB) / 2);
  const centerIntensity = (avgR + avgG + avgB) / 3;

  return {
    x: minX,
    y: minY,
    width: width_lesion,
    height: height_lesion,
    area,
    circularity,
    centerIntensity,
    redness,
    avgColor: { r: avgR, g: avgG, b: avgB },
    type,
  };
};

// Classify lesion type
const classifyLesion = (lesion: any) => {
  const { area, circularity, centerIntensity } = lesion;

  // Pustule: small, circular, bright center
  if (area >= 3 && area <= 50 && circularity > 0.6 && centerIntensity > 150) {
    return 'pustule';
  }
  // Papule: small to medium, somewhat circular, no bright center
  else if (area >= 2 && area <= 30 && circularity >= 0.4 && centerIntensity < 150) {
    return 'papule';
  }
  // Nodule: large or irregular
  else if (area > 50 || circularity < 0.4) {
    return 'nodule';
  }

  return 'papule'; // Default
};

// Get neighbor brightness
const getNeighborBrightness = (
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number
) => {
  let total = 0;
  let count = 0;

  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const idx = (ny * width + nx) * 4;
        total += (pixels[idx] + pixels[idx + 1] + pixels[idx + 2]) / 3;
        count++;
      }
    }
  }

  return count > 0 ? total / count : 0;
};

// Analyze pigmentation
export const analyzePigmentation = (pixels: Uint8ClampedArray, width: number, height: number, skinTone: any) => {
  const pigmentedRegions: any[] = [];
  let totalPigmentedPixels = 0;
  let totalIntensityDiff = 0;
  const visited = new Array(width * height).fill(false);

  // Create brown channel histogram
  const histogram = new Array(256).fill(0);

  for (let y = 10; y < height - 10; y += 2) {
    for (let x = 10; x < width - 10; x += 2) {
      const idx = (y * width + x) * 4;
      const r = pixels[idx];
      const g = pixels[idx + 1];
      const b = pixels[idx + 2];

      // Calculate brown channel (darker than skin tone)
      const brightness = (r + g + b) / 3;
      const isDark = brightness < (skinTone.r + skinTone.g + skinTone.b) / 3 - 30;
      const isBrownish = r > b && g > b * 1.1;

      histogram[Math.floor(brightness)] += 1;

      if (isDark && isBrownish && !visited[y * width + x]) {
        const region = growRegion(pixels, width, height, x, y, visited, 'pigmentation');
        if (region.area > 5) {
          const intensityDiff = ((skinTone.r + skinTone.g + skinTone.b) / 3) - region.centerIntensity;
          region.intensityDiff = intensityDiff;
          pigmentedRegions.push(region);
          totalPigmentedPixels += region.area;
          totalIntensityDiff += intensityDiff;
        }
      }
    }
  }

  const totalPixels = width * height;
  const pigmentedPercent = (totalPigmentedPixels / totalPixels) * 100;
  const avgIntensityDiff = pigmentedRegions.length > 0 ? totalIntensityDiff / pigmentedRegions.length : 0;

  // Calculate SHI (simplified)
  let shi = 0;
  for (let i = 0; i < 256; i++) {
    if (i < 64) shi += histogram[i] * 4; // Very dark
    else if (i < 128) shi += histogram[i] * 3; // Dark
    else if (i < 192) shi += histogram[i] * 2; // Normal
    else shi += histogram[i] * 1; // Light
  }
  shi = shi / totalPixels / 100;

  const cmSquared = (width * height) / 10000;
  const spotDensity = pigmentedRegions.length / cmSquared;

  return {
    regions: pigmentedRegions,
    metrics: {
      pigmentedPercent: pigmentedPercent.toFixed(2),
      avgIntensityDiff: Math.round(avgIntensityDiff),
      shi: shi.toFixed(2),
      spotCount: pigmentedRegions.length,
      spotDensity: spotDensity.toFixed(1),
    },
  };
};

// Analyze wrinkles
export const analyzeWrinkles = (pixels: Uint8ClampedArray, width: number, height: number) => {
  const wrinkleLines: any[] = [];
  
  // Apply edge detection (simplified Sobel)
  const edges = detectEdges(pixels, width, height);
  
  // Find lines in edge map
  const lines = findLines(edges, width, height);
  
  let totalLength = 0;
  let totalDepth = 0;

  for (const line of lines) {
    if (line.length > 10) { // Filter short lines
      wrinkleLines.push(line);
      totalLength += line.length;
      totalDepth += line.depth;
    }
  }

  const cmSquared = (width * height) / 10000;
  const countPerCm = wrinkleLines.length / cmSquared;
  const avgLength = wrinkleLines.length > 0 ? totalLength / wrinkleLines.length : 0;
  const avgDepth = wrinkleLines.length > 0 ? totalDepth / wrinkleLines.length : 0;
  const densityPercent = (edges.filter(e => e > 128).length / edges.length) * 100;

  return {
    lines: wrinkleLines,
    metrics: {
      count: wrinkleLines.length,
      countPerCm: countPerCm.toFixed(1),
      avgLength: Math.round(avgLength * 0.1), // pixels to mm approximation
      avgDepth: Math.round(avgDepth),
      densityPercent: densityPercent.toFixed(2),
    },
  };
};

// Edge detection (simplified Sobel)
const detectEdges = (pixels: Uint8ClampedArray, width: number, height: number): number[] => {
  const edges = new Array(width * height).fill(0);
  
  const sobelX = [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]];
  const sobelY = [[-1, -2, -1], [0, 0, 0], [1, 2, 1]];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let gx = 0, gy = 0;

      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const idx = ((y + ky) * width + (x + kx)) * 4;
          const gray = (pixels[idx] + pixels[idx + 1] + pixels[idx + 2]) / 3;
          gx += gray * sobelX[ky + 1][kx + 1];
          gy += gray * sobelY[ky + 1][kx + 1];
        }
      }

      const magnitude = Math.sqrt(gx * gx + gy * gy);
      edges[y * width + x] = Math.min(255, magnitude);
    }
  }

  return edges;
};

// Find lines in edge map
const findLines = (edges: number[], width: number, height: number): any[] => {
  const lines: any[] = [];
  const visited = new Array(width * height).fill(false);

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      if (edges[idx] > 128 && !visited[idx]) {
        const line = traceLine(edges, width, height, x, y, visited);
        if (line.points.length > 5) {
          line.length = line.points.length;
          line.depth = line.avgEdgeStrength;
          lines.push(line);
        }
      }
    }
  }

  return lines;
};

// Trace line from starting point
const traceLine = (
  edges: number[],
  width: number,
  height: number,
  startX: number,
  startY: number,
  visited: boolean[]
): any => {
  const points: [number, number][] = [];
  let totalEdgeStrength = 0;
  const queue: [number, number][] = [[startX, startY]];

  while (queue.length > 0 && points.length < 200) {
    const [x, y] = queue.shift()!;
    const idx = y * width + x;

    if (x < 1 || x >= width - 1 || y < 1 || y >= height - 1 || visited[idx]) continue;
    if (edges[idx] < 128) continue;

    visited[idx] = true;
    points.push([x, y]);
    totalEdgeStrength += edges[idx];

    // Check neighbors
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        queue.push([x + dx, y + dy]);
      }
    }
  }

  return {
    points,
    length: points.length,
    avgEdgeStrength: points.length > 0 ? totalEdgeStrength / points.length : 0,
    startX,
    startY,
  };
};

// Get severity level
export const getSeverityLevel = (metrics: any, type: string) => {
  if (type === 'acne') {
    const { density, inflammatoryPercent } = metrics;
    if (parseFloat(density) > 3 || inflammatoryPercent > 50) return 'Severe';
    if (parseFloat(density) > 1 || inflammatoryPercent > 20) return 'Moderate';
    return 'Mild';
  } else if (type === 'pigmentation') {
    const { pigmentedPercent, avgIntensityDiff } = metrics;
    if (parseFloat(pigmentedPercent) >= 30 || avgIntensityDiff > 50) return 'Severe';
    if (parseFloat(pigmentedPercent) >= 10 || avgIntensityDiff > 20) return 'Moderate';
    return 'Mild';
  } else if (type === 'wrinkles') {
    const { countPerCm, avgLength, avgDepth } = metrics;
    if (parseFloat(countPerCm) > 10 || avgLength > 40 || avgDepth > 50) return 'Severe';
    if (parseFloat(countPerCm) > 5 || avgLength > 20 || avgDepth > 20) return 'Moderate';
    return 'Mild';
  }
  return 'Mild';
};

// Get recommendations
export const getRecommendations = (severity: string, type: string) => {
  const recommendations: any = {
    acne: {
      Mild: {
        duration: '2-4 weeks',
        treatments: [
          'Tea tree oil (5% concentration)',
          'Gentle cleanser twice daily',
          'Non-comedogenic moisturizer',
          'Avoid touching face',
        ],
      },
      Moderate: {
        duration: '4-8 weeks',
        treatments: [
          'Benzoyl peroxide (2.5-5%)',
          'Salicylic acid cleanser',
          'Oil-free moisturizer with niacinamide',
          'Consider over-the-counter retinol',
        ],
      },
      Severe: {
        duration: 'Consult dermatologist',
        treatments: [
          'Professional evaluation recommended',
          'May require prescription medication',
          'Possible treatments: antibiotics, isotretinoin',
          'Professional extraction if needed',
        ],
      },
    },
    pigmentation: {
      Mild: {
        duration: '4-8 weeks',
        treatments: [
          'Vitamin C serum daily',
          'SPF 30+ sunscreen (essential)',
          'Gentle exfoliation 2x/week',
          'Kojic acid or licorice extract',
        ],
      },
      Moderate: {
        duration: '8-12 weeks',
        treatments: [
          'Niacinamide serum (10%)',
          'Alpha arbutin or tranexamic acid',
          'SPF 50+ sunscreen (reapply every 2 hours)',
          'Consider AHA/BHA chemical peels',
        ],
      },
      Severe: {
        duration: 'Consult dermatologist',
        treatments: [
          'Professional evaluation recommended',
          'May require prescription hydroquinone',
          'Laser therapy or chemical peels',
          'Strict sun protection essential',
        ],
      },
    },
    wrinkles: {
      Mild: {
        duration: '4-8 weeks',
        treatments: [
          'Retinol serum at night',
          'Peptide moisturizer',
          'SPF daily',
          'Hyaluronic acid for hydration',
        ],
      },
      Moderate: {
        duration: '8-12 weeks',
        treatments: [
          'Higher strength retinoid',
          'Vitamin C + peptides',
          'Consider professional treatments',
          'Face exercises and massage',
        ],
      },
      Severe: {
        duration: 'Consult dermatologist',
        treatments: [
          'Professional evaluation recommended',
          'Prescription tretinoin',
          'Botox or dermal fillers',
          'Laser resurfacing or microneedling',
        ],
      },
    },
  };

  return recommendations[type]?.[severity] || recommendations[type]?.Mild;
};