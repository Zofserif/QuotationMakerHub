"use client";

import {
  Check,
  Crop,
  LoaderCircle,
  RefreshCw,
  X,
} from "lucide-react";
import {
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
} from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const jpegMimeType = "image/jpeg";
const jpegQuality = 0.9;
const minCropWidthPx = 32;
const croppableImageMimeTypes = [
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

type CropDragAction = "move" | "ne" | "nw" | "se" | "sw";

type CropRect = {
  height: number;
  width: number;
  x: number;
  y: number;
};

type ImageSize = {
  height: number;
  width: number;
};

type CropDragState = {
  action: CropDragAction;
  frameHeight: number;
  frameWidth: number;
  pointerId: number;
  startCrop: CropRect;
  startX: number;
  startY: number;
};

export type ImageCropResult = {
  blob: Blob;
  dataUrl: string;
  file: File;
  height: number;
  mimeType: typeof jpegMimeType;
  width: number;
};

export type ImageCropSource = {
  file: File;
  objectUrl: string;
};

export const imageCropAccept = croppableImageMimeTypes.join(",");

export function isCroppableImageFile(file: File) {
  return croppableImageMimeTypes.some((mimeType) => mimeType === file.type);
}

const cropHandles: Array<{
  action: Exclude<CropDragAction, "move">;
  className: string;
  label: string;
}> = [
  {
    action: "nw",
    className: "-left-2.5 -top-2.5 cursor-nwse-resize",
    label: "Resize crop from top left",
  },
  {
    action: "ne",
    className: "-right-2.5 -top-2.5 cursor-nesw-resize",
    label: "Resize crop from top right",
  },
  {
    action: "se",
    className: "-bottom-2.5 -right-2.5 cursor-nwse-resize",
    label: "Resize crop from bottom right",
  },
  {
    action: "sw",
    className: "-bottom-2.5 -left-2.5 cursor-nesw-resize",
    label: "Resize crop from bottom left",
  },
];

export function ImageCropModal({
  aspectRatio,
  file,
  maxOutputHeight,
  maxOutputWidth,
  objectUrl,
  onCancel,
  onConfirm,
  open,
  title,
}: {
  aspectRatio: number;
  file: File | null;
  maxOutputHeight: number;
  maxOutputWidth: number;
  objectUrl: string | null;
  onCancel: () => void;
  onConfirm: (result: ImageCropResult) => Promise<void> | void;
  open: boolean;
  title: string;
}) {
  const imageRef = useRef<HTMLImageElement | null>(null);
  const cropFrameRef = useRef<HTMLDivElement | null>(null);
  const cropDragRef = useRef<CropDragState | null>(null);
  const [imageSize, setImageSize] = useState<ImageSize | null>(null);
  const [crop, setCrop] = useState<CropRect | null>(null);
  const [autoCrop, setAutoCrop] = useState<CropRect | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  if (!open || !file || !objectUrl) {
    return null;
  }

  function handleImageLoad() {
    const image = imageRef.current;

    if (!image || image.naturalWidth === 0 || image.naturalHeight === 0) {
      setError("Could not load image dimensions.");
      return;
    }

    const nextSize = {
      width: image.naturalWidth,
      height: image.naturalHeight,
    };
    const nextCrop = getCenteredAspectCrop(nextSize, aspectRatio);

    setImageSize(nextSize);
    setAutoCrop(nextCrop);
    setCrop(nextCrop);
    setError(null);
  }

  function resetCrop() {
    if (!autoCrop) {
      return;
    }

    setCrop(autoCrop);
    setError(null);
  }

  function startCropDrag(
    event: PointerEvent<HTMLElement>,
    action: CropDragAction,
  ) {
    if (!crop || !cropFrameRef.current) {
      return;
    }

    const frameRect = cropFrameRef.current.getBoundingClientRect();

    if (frameRect.width === 0 || frameRect.height === 0) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    cropFrameRef.current.setPointerCapture(event.pointerId);
    cropDragRef.current = {
      action,
      frameHeight: frameRect.height,
      frameWidth: frameRect.width,
      pointerId: event.pointerId,
      startCrop: crop,
      startX: event.clientX,
      startY: event.clientY,
    };
    setError(null);
  }

  function updateCropDrag(event: PointerEvent<HTMLDivElement>) {
    const dragState = cropDragRef.current;

    if (!dragState || dragState.pointerId !== event.pointerId || !imageSize) {
      return;
    }

    event.preventDefault();
    const deltaX =
      (event.clientX - dragState.startX) *
      (imageSize.width / dragState.frameWidth);
    const deltaY =
      (event.clientY - dragState.startY) *
      (imageSize.height / dragState.frameHeight);

    setCrop(
      resizeCropRect(dragState.action, dragState.startCrop, deltaX, deltaY, {
        aspectRatio,
        bounds: imageSize,
      }),
    );
  }

  function endCropDrag(event: PointerEvent<HTMLDivElement>) {
    if (cropDragRef.current?.pointerId !== event.pointerId) {
      return;
    }

    if (cropFrameRef.current?.hasPointerCapture(event.pointerId)) {
      cropFrameRef.current.releasePointerCapture(event.pointerId);
    }

    cropDragRef.current = null;
  }

  async function confirmCrop() {
    const activeFile = file;

    if (!crop || !imageRef.current || !activeFile) {
      setError("Image crop is not ready.");
      return;
    }

    setIsConfirming(true);
    setError(null);

    try {
      const result = await cropImageToJpeg({
        crop,
        file: activeFile,
        image: imageRef.current,
        maxOutputHeight,
        maxOutputWidth,
      });
      await onConfirm(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not crop selected image.",
      );
    } finally {
      setIsConfirming(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-stone-950/60 p-4">
      <div className="w-full max-w-4xl overflow-hidden rounded-lg bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-stone-200 px-5 py-4">
          <div>
            <h2 className="font-semibold text-stone-950">{title}</h2>
            <p className="text-sm text-stone-500">
              Adjust the crop before the image is saved.
            </p>
          </div>
          <Button
            aria-label="Cancel crop"
            disabled={isConfirming}
            size="icon"
            type="button"
            variant="ghost"
            onClick={onCancel}
          >
            <X className="size-5" />
          </Button>
        </header>

        <div className="grid gap-4 p-5 lg:grid-cols-[1fr_240px]">
          <div className="min-h-[360px] rounded-lg border border-stone-200 bg-stone-50 p-3">
            <div className="grid min-h-[360px] place-items-center rounded-md bg-[linear-gradient(45deg,#f5f5f4_25%,transparent_25%),linear-gradient(-45deg,#f5f5f4_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#f5f5f4_75%),linear-gradient(-45deg,transparent_75%,#f5f5f4_75%)] bg-[length:24px_24px] bg-[position:0_0,0_12px,12px_-12px,-12px_0] p-4">
              {objectUrl ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    ref={imageRef}
                    alt=""
                    className="hidden"
                    src={objectUrl}
                    onError={() => setError("Could not load selected image.")}
                    onLoad={handleImageLoad}
                  />
                  {imageSize && crop ? (
                    <div
                      ref={cropFrameRef}
                      className="relative max-w-full touch-none select-none overflow-hidden rounded-md"
                      style={getPreviewFrameStyle(imageSize)}
                      onPointerCancel={endCropDrag}
                      onPointerMove={updateCropDrag}
                      onPointerUp={endCropDrag}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        alt=""
                        className="absolute inset-0 h-full w-full select-none"
                        draggable={false}
                        src={objectUrl}
                      />
                      <button
                        aria-label="Move crop area"
                        className="absolute z-10 touch-none cursor-move bg-transparent"
                        style={getCropStyle(crop, imageSize)}
                        type="button"
                        onPointerDown={(event) => startCropDrag(event, "move")}
                      />
                      <div
                        className="pointer-events-none absolute z-20 border-2 border-stone-950"
                        style={{
                          ...getCropStyle(crop, imageSize),
                          boxShadow: "0 0 0 9999px rgb(28 25 23 / 0.35)",
                        }}
                      />
                      <div
                        className="pointer-events-none absolute z-30"
                        style={getCropStyle(crop, imageSize)}
                      >
                        {cropHandles.map((handle) => (
                          <button
                            aria-label={handle.label}
                            className={cn(
                              "pointer-events-auto absolute size-5 touch-none rounded-full border-2 border-stone-950 bg-white shadow-sm",
                              handle.className,
                            )}
                            key={handle.action}
                            type="button"
                            onPointerDown={(event) =>
                              startCropDrag(event, handle.action)
                            }
                          />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <LoaderCircle
                      aria-hidden="true"
                      className="size-8 animate-spin text-stone-400"
                    />
                  )}
                </>
              ) : null}
            </div>
          </div>

          <aside className="space-y-3">
            <Button
              className="w-full"
              disabled={isConfirming || !crop}
              loading={isConfirming}
              loadingText="Cropping..."
              type="button"
              onClick={() => void confirmCrop()}
            >
              <Check className="size-4" />
              Confirm crop
            </Button>
            <Button
              className="w-full"
              disabled={isConfirming || !autoCrop}
              type="button"
              variant="secondary"
              onClick={resetCrop}
            >
              <Crop className="size-4" />
              Reset crop
            </Button>
            <Button
              className="w-full"
              disabled={isConfirming}
              type="button"
              variant="secondary"
              onClick={onCancel}
            >
              <RefreshCw className="size-4" />
              Choose another
            </Button>
            {error ? (
              <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </p>
            ) : null}
          </aside>
        </div>
      </div>
    </div>
  );
}

function getCenteredAspectCrop(size: ImageSize, aspectRatio: number): CropRect {
  let width = size.width;
  let height = width / aspectRatio;

  if (height > size.height) {
    height = size.height;
    width = height * aspectRatio;
  }

  return {
    height: Math.round(height),
    width: Math.round(width),
    x: Math.round((size.width - width) / 2),
    y: Math.round((size.height - height) / 2),
  };
}

function getPreviewFrameStyle(size: ImageSize): CSSProperties {
  const ratio = size.width / size.height;

  return {
    aspectRatio: `${size.width} / ${size.height}`,
    width: `min(100%, ${Math.max(1, Math.round(ratio * 420))}px)`,
  };
}

function getCropStyle(crop: CropRect, size: ImageSize): CSSProperties {
  return {
    height: `${(crop.height / size.height) * 100}%`,
    left: `${(crop.x / size.width) * 100}%`,
    top: `${(crop.y / size.height) * 100}%`,
    width: `${(crop.width / size.width) * 100}%`,
  };
}

function resizeCropRect(
  action: CropDragAction,
  startCrop: CropRect,
  deltaX: number,
  deltaY: number,
  options: {
    aspectRatio: number;
    bounds: ImageSize;
  },
): CropRect {
  if (action === "move") {
    return {
      height: Math.round(startCrop.height),
      width: Math.round(startCrop.width),
      x: Math.round(
        clamp(startCrop.x + deltaX, 0, options.bounds.width - startCrop.width),
      ),
      y: Math.round(
        clamp(startCrop.y + deltaY, 0, options.bounds.height - startCrop.height),
      ),
    };
  }

  const anchor = getAnchorPoint(action, startCrop);
  const horizontalWidth = action.includes("e")
    ? startCrop.width + deltaX
    : startCrop.width - deltaX;
  const verticalWidth = action.includes("s")
    ? (startCrop.height + deltaY) * options.aspectRatio
    : (startCrop.height - deltaY) * options.aspectRatio;
  const rawWidth =
    Math.abs(horizontalWidth - startCrop.width) >=
    Math.abs(verticalWidth - startCrop.width)
      ? horizontalWidth
      : verticalWidth;
  const maxWidth = getMaxWidthFromAnchor(action, anchor, options);
  const minWidth = Math.min(minCropWidthPx, maxWidth);
  const width = clamp(rawWidth, minWidth, maxWidth);
  const height = width / options.aspectRatio;
  const x = action.includes("e") ? anchor.x : anchor.x - width;
  const y = action.includes("s") ? anchor.y : anchor.y - height;

  return {
    height: Math.round(height),
    width: Math.round(width),
    x: Math.round(clamp(x, 0, options.bounds.width - width)),
    y: Math.round(clamp(y, 0, options.bounds.height - height)),
  };
}

function getAnchorPoint(action: Exclude<CropDragAction, "move">, crop: CropRect) {
  return {
    x: action.includes("e") ? crop.x : crop.x + crop.width,
    y: action.includes("s") ? crop.y : crop.y + crop.height,
  };
}

function getMaxWidthFromAnchor(
  action: Exclude<CropDragAction, "move">,
  anchor: {
    x: number;
    y: number;
  },
  options: {
    aspectRatio: number;
    bounds: ImageSize;
  },
) {
  const maxWidthByX = action.includes("e")
    ? options.bounds.width - anchor.x
    : anchor.x;
  const maxHeightByY = action.includes("s")
    ? options.bounds.height - anchor.y
    : anchor.y;

  return Math.max(
    1,
    Math.min(maxWidthByX, maxHeightByY * options.aspectRatio),
  );
}

async function cropImageToJpeg({
  crop,
  file,
  image,
  maxOutputHeight,
  maxOutputWidth,
}: {
  crop: CropRect;
  file: File;
  image: HTMLImageElement;
  maxOutputHeight: number;
  maxOutputWidth: number;
}) {
  const scale = Math.min(
    1,
    maxOutputWidth / crop.width,
    maxOutputHeight / crop.height,
  );
  const outputWidth = Math.max(1, Math.round(crop.width * scale));
  const outputHeight = Math.max(1, Math.round(crop.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = outputWidth;
  canvas.height = outputHeight;

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas context is unavailable.");
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, outputWidth, outputHeight);
  context.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    outputWidth,
    outputHeight,
  );

  const blob = await canvasToBlob(canvas);
  const dataUrl = await blobToDataUrl(blob);
  const croppedFile = new File([blob], getJpegFileName(file.name), {
    type: jpegMimeType,
  });

  return {
    blob,
    dataUrl,
    file: croppedFile,
    height: outputHeight,
    mimeType: jpegMimeType,
    width: outputWidth,
  } satisfies ImageCropResult;
}

function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Could not export cropped image."));
          return;
        }

        resolve(blob);
      },
      jpegMimeType,
      jpegQuality,
    );
  });
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(blob);
  });
}

function getJpegFileName(name: string) {
  const baseName = name.replace(/\.[^.]+$/, "");
  return `${baseName || "cropped-image"}.jpg`;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, max));
}
