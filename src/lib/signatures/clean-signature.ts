"use client";

export type CleanSignatureOptions = {
  thresholdOffset?: number;
  alphaMultiplier?: number;
  minComponentSize?: number;
};

export type SignatureCropRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type CleanedSignaturePreview = {
  blob: Blob;
  crop: SignatureCropRect;
  width: number;
  height: number;
};

const DEFAULT_OPTIONS = {
  thresholdOffset: 25,
  alphaMultiplier: 8,
  minComponentSize: 12,
};

const AUTO_CROP_PADDING_PX = 4;

export async function cleanSignatureFromCanvas(
  sourceCanvas: HTMLCanvasElement,
  options?: CleanSignatureOptions,
): Promise<Blob> {
  const { crop, imageData } = cleanSignatureImageData(sourceCanvas, options);

  return exportImageDataAsPng(imageData, crop);
}

export async function prepareCleanSignaturePreview(
  sourceCanvas: HTMLCanvasElement,
  options?: CleanSignatureOptions,
): Promise<CleanedSignaturePreview> {
  const { crop, imageData } = cleanSignatureImageData(sourceCanvas, options);

  return {
    blob: await exportImageDataAsPng(imageData, {
      x: 0,
      y: 0,
      width: imageData.width,
      height: imageData.height,
    }),
    crop,
    width: imageData.width,
    height: imageData.height,
  };
}

function cleanSignatureImageData(
  sourceCanvas: HTMLCanvasElement,
  options?: CleanSignatureOptions,
) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const ctx = sourceCanvas.getContext("2d", { willReadFrequently: true });

  if (!ctx) {
    throw new Error("Canvas context is unavailable");
  }

  const imageData = ctx.getImageData(
    0,
    0,
    sourceCanvas.width,
    sourceCanvas.height,
  );
  const background = estimateBackgroundBrightness(imageData);
  removeBackground(imageData, background, opts);
  removeSmallNoiseComponents(imageData, opts.minComponentSize);

  return {
    crop: getTransparentBounds(imageData, AUTO_CROP_PADDING_PX),
    imageData,
  };
}

export function cropSignaturePreview(
  previewImage: HTMLImageElement,
  crop: SignatureCropRect,
) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(crop.width));
  canvas.height = Math.max(1, Math.round(crop.height));

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Output canvas context is unavailable");
  }

  context.drawImage(
    previewImage,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    canvas.width,
    canvas.height,
  );

  return canvasToPngBlob(canvas);
}

function exportImageDataAsPng(imageData: ImageData, crop: SignatureCropRect) {
  const outputCanvas = document.createElement("canvas");
  outputCanvas.width = Math.max(1, Math.round(crop.width));
  outputCanvas.height = Math.max(1, Math.round(crop.height));

  const outputCtx = outputCanvas.getContext("2d");

  if (!outputCtx) {
    throw new Error("Output canvas context is unavailable");
  }

  outputCtx.putImageData(imageData, -Math.round(crop.x), -Math.round(crop.y));

  return canvasToPngBlob(outputCanvas);
}

function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Could not export signature PNG"));
        return;
      }

      resolve(blob);
    }, "image/png");
  });
}

function estimateBackgroundBrightness(imageData: ImageData) {
  const { data, width, height } = imageData;
  const samples: number[] = [];

  for (let x = 0; x < width; x += 8) {
    samples.push(grayAt(data, x, 0, width));
    samples.push(grayAt(data, x, height - 1, width));
  }

  for (let y = 0; y < height; y += 8) {
    samples.push(grayAt(data, 0, y, width));
    samples.push(grayAt(data, width - 1, y, width));
  }

  samples.sort((a, b) => a - b);
  return samples[Math.floor(samples.length * 0.85)] ?? 245;
}

function removeBackground(
  imageData: ImageData,
  background: number,
  options: Required<CleanSignatureOptions>,
) {
  const { data } = imageData;

  for (let index = 0; index < data.length; index += 4) {
    const gray =
      0.299 * data[index] + 0.587 * data[index + 1] + 0.114 * data[index + 2];
    const delta = background - gray;

    if (gray > background - options.thresholdOffset) {
      data[index + 3] = 0;
      continue;
    }

    data[index] = 0;
    data[index + 1] = 0;
    data[index + 2] = 0;
    data[index + 3] = clamp(delta * options.alphaMultiplier, 80, 255);
  }
}

function removeSmallNoiseComponents(imageData: ImageData, minSize: number) {
  const { data, width, height } = imageData;
  const visited = new Uint8Array(width * height);
  const stack: number[] = [];

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const start = y * width + x;

      if (visited[start] || data[start * 4 + 3] === 0) {
        continue;
      }

      const component: number[] = [];
      stack.push(start);
      visited[start] = 1;

      while (stack.length > 0) {
        const current = stack.pop()!;
        component.push(current);
        const cx = current % width;
        const cy = Math.floor(current / width);
        const neighbors = [
          [cx + 1, cy],
          [cx - 1, cy],
          [cx, cy + 1],
          [cx, cy - 1],
        ];

        for (const [nx, ny] of neighbors) {
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
            continue;
          }

          const next = ny * width + nx;

          if (!visited[next] && data[next * 4 + 3] > 0) {
            visited[next] = 1;
            stack.push(next);
          }
        }
      }

      if (component.length < minSize) {
        for (const pixelIndex of component) {
          data[pixelIndex * 4 + 3] = 0;
        }
      }
    }
  }
}

function getTransparentBounds(
  imageData: ImageData,
  paddingPx: number,
): SignatureCropRect {
  const { data, width, height } = imageData;
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * 4 + 3] === 0) {
        continue;
      }

      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (minX > maxX || minY > maxY) {
    return {
      x: 0,
      y: 0,
      width,
      height,
    };
  }

  const x = Math.max(0, minX - paddingPx);
  const y = Math.max(0, minY - paddingPx);
  const right = Math.min(width, maxX + paddingPx + 1);
  const bottom = Math.min(height, maxY + paddingPx + 1);

  return {
    x,
    y,
    width: Math.max(1, right - x),
    height: Math.max(1, bottom - y),
  };
}

function grayAt(data: Uint8ClampedArray, x: number, y: number, width: number) {
  const index = (y * width + x) * 4;
  return 0.299 * data[index] + 0.587 * data[index + 1] + 0.114 * data[index + 2];
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(value)));
}
