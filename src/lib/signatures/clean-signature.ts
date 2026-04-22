"use client";

export type CleanSignatureOptions = {
  thresholdOffset?: number;
  alphaMultiplier?: number;
  minComponentSize?: number;
};

const DEFAULT_OPTIONS = {
  thresholdOffset: 25,
  alphaMultiplier: 8,
  minComponentSize: 12,
};

export async function cleanSignatureFromCanvas(
  sourceCanvas: HTMLCanvasElement,
  options?: CleanSignatureOptions,
): Promise<Blob> {
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
  const trimmed = trimTransparentBounds(imageData);

  const outputCanvas = document.createElement("canvas");
  outputCanvas.width = trimmed.width;
  outputCanvas.height = trimmed.height;

  const outputCtx = outputCanvas.getContext("2d");

  if (!outputCtx) {
    throw new Error("Output canvas context is unavailable");
  }

  outputCtx.putImageData(trimmed, 0, 0);

  return new Promise((resolve, reject) => {
    outputCanvas.toBlob((blob) => {
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

function trimTransparentBounds(imageData: ImageData) {
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
    return imageData;
  }

  const trimmedWidth = Math.max(1, maxX - minX + 8);
  const trimmedHeight = Math.max(1, maxY - minY + 8);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d")!;
  context.putImageData(imageData, 0, 0);

  return context.getImageData(
    Math.max(0, minX - 4),
    Math.max(0, minY - 4),
    Math.min(trimmedWidth, width - minX + 4),
    Math.min(trimmedHeight, height - minY + 4),
  );
}

function grayAt(data: Uint8ClampedArray, x: number, y: number, width: number) {
  const index = (y * width + x) * 4;
  return 0.299 * data[index] + 0.587 * data[index + 1] + 0.114 * data[index + 2];
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(value)));
}
