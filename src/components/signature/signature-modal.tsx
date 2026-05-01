"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
} from "react";
import {
  Camera,
  Check,
  Crop,
  LoaderCircle,
  PenLine,
  RefreshCw,
  Upload,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  cropSignaturePreview,
  prepareCleanSignaturePreview,
  type SignatureCropRect,
} from "@/lib/signatures/clean-signature";
import type { SourceMethod } from "@/lib/quotes/types";
import { cn } from "@/lib/utils";

const DRAW_LINE_WIDTH = 4;
const DRAW_STROKE_STYLE = "#111827";
const MIN_CROP_SIZE_PX = 24;

type PendingSignatureAction = "approve" | "capture" | "preview" | "upload";
type CropDragAction =
  | "move"
  | "n"
  | "e"
  | "s"
  | "w"
  | "ne"
  | "nw"
  | "se"
  | "sw";

type CropDragState = {
  action: CropDragAction;
  frameHeight: number;
  frameWidth: number;
  pointerId: number;
  startCrop: SignatureCropRect;
  startX: number;
  startY: number;
};

const CROP_HANDLES: Array<{
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
    action: "n",
    className: "left-1/2 -top-2.5 -translate-x-1/2 cursor-ns-resize",
    label: "Resize crop from top",
  },
  {
    action: "ne",
    className: "-right-2.5 -top-2.5 cursor-nesw-resize",
    label: "Resize crop from top right",
  },
  {
    action: "e",
    className: "-right-2.5 top-1/2 -translate-y-1/2 cursor-ew-resize",
    label: "Resize crop from right",
  },
  {
    action: "se",
    className: "-bottom-2.5 -right-2.5 cursor-nwse-resize",
    label: "Resize crop from bottom right",
  },
  {
    action: "s",
    className: "-bottom-2.5 left-1/2 -translate-x-1/2 cursor-ns-resize",
    label: "Resize crop from bottom",
  },
  {
    action: "sw",
    className: "-bottom-2.5 -left-2.5 cursor-nesw-resize",
    label: "Resize crop from bottom left",
  },
  {
    action: "w",
    className: "-left-2.5 top-1/2 -translate-y-1/2 cursor-ew-resize",
    label: "Resize crop from left",
  },
];

function hasCameraApi() {
  return Boolean(navigator.mediaDevices?.getUserMedia);
}

export function SignatureModal({
  open,
  onClose,
  onUploaded,
  token,
  signatureFieldId,
  onApproveSignature,
}: {
  open: boolean;
  onClose: () => void;
  onUploaded: () => void;
  token?: string;
  signatureFieldId?: string;
  onApproveSignature?: (input: {
    imageBase64: string;
    sourceMethod: SourceMethod;
  }) => Promise<void>;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cropFrameRef = useRef<HTMLDivElement | null>(null);
  const previewImageRef = useRef<HTMLImageElement | null>(null);
  const previewObjectUrlRef = useRef<string | null>(null);
  const cropDragRef = useRef<CropDragState | null>(null);
  const [mode, setMode] = useState<SourceMethod>("camera");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewSize, setPreviewSize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [autoCrop, setAutoCrop] = useState<SignatureCropRect | null>(null);
  const [crop, setCrop] = useState<SignatureCropRect | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] =
    useState<PendingSignatureAction | null>(null);
  const isDrawing = useRef(false);
  const hasDrawnInk = useRef(false);
  const isProcessing = pendingAction !== null;

  useEffect(() => {
    if (!open || mode !== "camera") {
      return;
    }

    let stream: MediaStream | null = null;

    async function startCamera() {
      if (!window.isSecureContext || !hasCameraApi()) {
        setMode("draw");
        setError(
          "Camera capture needs HTTPS on phones. Use Draw or Upload, or open this app through an HTTPS tunnel.",
        );
        return;
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch {
        setMode("draw");
        setError("Camera access was unavailable. Use Draw or Upload instead.");
      }
    }

    startCamera();

    return () => {
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [open, mode]);

  useEffect(() => {
    return () => {
      if (previewObjectUrlRef.current) {
        URL.revokeObjectURL(previewObjectUrlRef.current);
        previewObjectUrlRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!open || mode !== "draw" || previewUrl) {
      return;
    }

    const canvas = drawCanvasRef.current;

    if (!canvas) {
      return;
    }

    const drawCanvas = canvas;

    function resizeDrawCanvas() {
      const rect = drawCanvas.getBoundingClientRect();
      const pixelRatio = window.devicePixelRatio || 1;
      const nextWidth = Math.max(1, Math.round(rect.width * pixelRatio));
      const nextHeight = Math.max(1, Math.round(rect.height * pixelRatio));

      if (drawCanvas.width === nextWidth && drawCanvas.height === nextHeight) {
        return;
      }

      const snapshot = document.createElement("canvas");
      snapshot.width = drawCanvas.width;
      snapshot.height = drawCanvas.height;
      snapshot.getContext("2d")?.drawImage(drawCanvas, 0, 0);

      drawCanvas.width = nextWidth;
      drawCanvas.height = nextHeight;

      const context = drawCanvas.getContext("2d");

      if (!context || !hasDrawnInk.current) {
        return;
      }

      context.drawImage(snapshot, 0, 0, nextWidth, nextHeight);
    }

    resizeDrawCanvas();

    const resizeObserver = new ResizeObserver(resizeDrawCanvas);
    resizeObserver.observe(drawCanvas);
    window.addEventListener("resize", resizeDrawCanvas);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", resizeDrawCanvas);
    };
  }, [open, mode, previewUrl]);

  if (!open) {
    return null;
  }

  async function captureCameraFrame() {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) {
      return;
    }

    canvas.width = video.videoWidth || 960;
    canvas.height = video.videoHeight || 540;
    const context = canvas.getContext("2d");
    context?.drawImage(video, 0, 0, canvas.width, canvas.height);
    setPendingAction("capture");

    try {
      await cleanAndPreview(canvas, "camera");
    } finally {
      setPendingAction(null);
    }
  }

  async function handleUpload(file?: File) {
    if (!file || !canvasRef.current) {
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPendingAction("upload");

    try {
      const image = await loadImage(objectUrl);
      const canvas = canvasRef.current;

      if (!canvas) {
        return;
      }

      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext("2d");
      context?.drawImage(image, 0, 0);
      await cleanAndPreview(canvas, "upload");
    } catch {
      setError("Could not process signature image.");
    } finally {
      URL.revokeObjectURL(objectUrl);
      setPendingAction(null);
    }
  }

  async function cleanAndPreview(canvas: HTMLCanvasElement, source: SourceMethod) {
    try {
      setError(null);
      const nextPreview = await prepareCleanSignaturePreview(canvas);
      const nextPreviewUrl = URL.createObjectURL(nextPreview.blob);

      replacePreviewObjectUrl(nextPreviewUrl);
      setPreviewSize({
        width: nextPreview.width,
        height: nextPreview.height,
      });
      setAutoCrop(nextPreview.crop);
      setCrop(nextPreview.crop);
      setMode(source);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signature cleanup failed.");
    }
  }

  function resetPreview() {
    replacePreviewObjectUrl(null);
    setPreviewSize(null);
    setAutoCrop(null);
    setCrop(null);
    setError(null);
    cropDragRef.current = null;
    previewImageRef.current = null;
    clearDrawCanvas();
    hasDrawnInk.current = false;
  }

  function resetCrop() {
    if (!autoCrop) {
      return;
    }

    setCrop(autoCrop);
    setError(null);
  }

  function replacePreviewObjectUrl(nextUrl: string | null) {
    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current);
    }

    previewObjectUrlRef.current = nextUrl;
    setPreviewUrl(nextUrl);
  }

  function clearDrawCanvas() {
    const drawCanvas = drawCanvasRef.current;
    const context = drawCanvas?.getContext("2d");

    if (!drawCanvas || !context) {
      return;
    }

    context.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
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

    if (!dragState || dragState.pointerId !== event.pointerId || !previewSize) {
      return;
    }

    event.preventDefault();
    const deltaX =
      (event.clientX - dragState.startX) *
      (previewSize.width / dragState.frameWidth);
    const deltaY =
      (event.clientY - dragState.startY) *
      (previewSize.height / dragState.frameHeight);

    setCrop(
      resizeCropRect(dragState.action, dragState.startCrop, deltaX, deltaY, {
        width: previewSize.width,
        height: previewSize.height,
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

  async function approveSignature() {
    if (!crop || !previewImageRef.current) {
      setError("Signature preview is not ready.");
      return;
    }

    let croppedDataUrl: string;

    try {
      const croppedBlob = await cropSignaturePreview(
        previewImageRef.current,
        crop,
      );
      croppedDataUrl = await blobToDataUrl(croppedBlob);
    } catch {
      setError("Could not crop signature preview.");
      return;
    }

    if (onApproveSignature) {
      try {
        await onApproveSignature({
          imageBase64: croppedDataUrl,
          sourceMethod: mode,
        });
      } catch (error) {
        setError(
          error instanceof Error ? error.message : "Could not place signature.",
        );
        return;
      }
    } else {
      const response = await fetch(`/api/client-link/${token}/signature`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          signatureFieldId,
          imageBase64: croppedDataUrl,
          sourceMethod: mode,
        }),
      });

      if (!response.ok) {
        const payload = await response.json();
        setError(payload.error?.message ?? "Could not place signature.");
        return;
      }
    }

    onUploaded();
    onClose();
  }

  function startDraw(event: PointerEvent<HTMLCanvasElement>) {
    const canvas = event.currentTarget;
    const point = getCanvasPoint(canvas, event);
    const context = canvas.getContext("2d");

    if (!point || !context) {
      return;
    }

    event.preventDefault();
    canvas.setPointerCapture(event.pointerId);
    isDrawing.current = true;
    setError(null);
    configureDrawContext(context, point.scale);
    context.beginPath();
    context.moveTo(point.x, point.y);
  }

  function draw(event: PointerEvent<HTMLCanvasElement>) {
    if (!isDrawing.current || !drawCanvasRef.current) {
      return;
    }

    const canvas = drawCanvasRef.current;
    const point = getCanvasPoint(canvas, event);
    const context = canvas.getContext("2d");

    if (!point || !context) {
      return;
    }

    event.preventDefault();
    configureDrawContext(context, point.scale);
    context.lineTo(point.x, point.y);
    context.stroke();
    context.beginPath();
    context.moveTo(point.x, point.y);
    hasDrawnInk.current = true;
  }

  function endDraw(event: PointerEvent<HTMLCanvasElement>) {
    isDrawing.current = false;
    event.currentTarget.getContext("2d")?.beginPath();

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  async function previewDrawing() {
    if (!drawCanvasRef.current || !canvasRef.current) {
      return;
    }

    if (!hasDrawnInk.current) {
      setError("Draw your signature before previewing.");
      return;
    }

    const source = drawCanvasRef.current;
    const canvas = canvasRef.current;
    canvas.width = source.width;
    canvas.height = source.height;
    const context = canvas.getContext("2d");

    if (!context) {
      setError("Canvas context is unavailable");
      return;
    }

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(source, 0, 0);
    setPendingAction("preview");

    try {
      await cleanAndPreview(canvas, "draw");
    } finally {
      setPendingAction(null);
    }
  }

  async function handleApproveSignature() {
    setPendingAction("approve");

    try {
      await approveSignature();
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-stone-950/60 p-4">
      <div className="w-full max-w-3xl overflow-hidden rounded-lg bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-stone-200 px-5 py-4">
          <div>
            <h2 className="font-semibold text-stone-950">Place signature</h2>
            <p className="text-sm text-stone-500">
              Capture, upload, or draw a clean signature.
            </p>
          </div>
          <Button
            aria-label="Close"
            variant="ghost"
            size="icon"
            disabled={isProcessing}
            onClick={onClose}
          >
            <X className="size-5" />
          </Button>
        </header>

        <div className="grid gap-4 p-5 lg:grid-cols-[1fr_240px]">
          <div className="min-h-[320px] rounded-lg border border-stone-200 bg-stone-50 p-3">
            {previewUrl ? (
              <div className="grid min-h-[320px] place-items-center rounded-md bg-[linear-gradient(45deg,#f5f5f4_25%,transparent_25%),linear-gradient(-45deg,#f5f5f4_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#f5f5f4_75%),linear-gradient(-45deg,transparent_75%,#f5f5f4_75%)] bg-[length:24px_24px] bg-[position:0_0,0_12px,12px_-12px,-12px_0] p-4">
                {previewSize && crop ? (
                  <div
                    ref={cropFrameRef}
                    className="relative max-w-full touch-none select-none overflow-hidden rounded-md"
                    style={getPreviewFrameStyle(previewSize)}
                    onPointerMove={updateCropDrag}
                    onPointerUp={endCropDrag}
                    onPointerCancel={endCropDrag}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      ref={previewImageRef}
                      alt="Cleaned signature preview"
                      className="absolute inset-0 h-full w-full select-none"
                      draggable={false}
                      src={previewUrl}
                    />
                    <button
                      aria-label="Move crop area"
                      className="absolute z-10 touch-none cursor-move bg-transparent"
                      style={getCropStyle(crop, previewSize)}
                      type="button"
                      onPointerDown={(event) => startCropDrag(event, "move")}
                    />
                    <div
                      className="pointer-events-none absolute z-20 border-2 border-stone-950"
                      style={{
                        ...getCropStyle(crop, previewSize),
                        boxShadow: "0 0 0 9999px rgb(28 25 23 / 0.35)",
                      }}
                    />
                    <div
                      className="pointer-events-none absolute z-30"
                      style={getCropStyle(crop, previewSize)}
                    >
                      {CROP_HANDLES.map((handle) => (
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
                ) : null}
              </div>
            ) : mode === "camera" ? (
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="h-[320px] w-full rounded-md bg-stone-950 object-cover"
              />
            ) : mode === "upload" ? (
              <label
                aria-busy={pendingAction === "upload" || undefined}
                className={cn(
                  "grid h-[320px] cursor-pointer place-items-center rounded-md border border-dashed border-stone-300 bg-white text-center text-sm text-stone-600",
                  isProcessing && "pointer-events-none opacity-70",
                )}
              >
                <span>
                  {pendingAction === "upload" ? (
                    <LoaderCircle
                      aria-hidden="true"
                      className="mx-auto mb-3 size-8 animate-spin text-stone-400"
                    />
                  ) : (
                    <Upload className="mx-auto mb-3 size-8 text-stone-400" />
                  )}
                  {pendingAction === "upload"
                    ? "Processing signature image..."
                    : "Select PNG or JPEG signature image"}
                </span>
                <input
                  accept="image/png,image/jpeg,image/webp"
                  className="sr-only"
                  disabled={isProcessing}
                  type="file"
                  onChange={(event) => void handleUpload(event.target.files?.[0])}
                />
              </label>
            ) : (
              <canvas
                ref={drawCanvasRef}
                className="h-[320px] w-full touch-none rounded-md bg-white"
                onPointerDown={startDraw}
                onPointerMove={draw}
                onPointerUp={endDraw}
                onPointerCancel={endDraw}
              />
            )}
            <canvas ref={canvasRef} className="hidden" />
          </div>

          <aside className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                variant={mode === "camera" ? "primary" : "secondary"}
                size="sm"
                title="Camera"
                disabled={isProcessing}
                onClick={() => {
                  resetPreview();
                  setMode("camera");
                }}
              >
                <Camera className="size-4" />
              </Button>
              <Button
                type="button"
                variant={mode === "upload" ? "primary" : "secondary"}
                size="sm"
                title="Upload"
                disabled={isProcessing}
                onClick={() => {
                  resetPreview();
                  setMode("upload");
                }}
              >
                <Upload className="size-4" />
              </Button>
              <Button
                type="button"
                variant={mode === "draw" ? "primary" : "secondary"}
                size="sm"
                title="Draw"
                disabled={isProcessing}
                onClick={() => {
                  resetPreview();
                  setMode("draw");
                }}
              >
                <PenLine className="size-4" />
              </Button>
            </div>

            {mode === "camera" && !previewUrl ? (
              <Button
                className="w-full"
                type="button"
                disabled={isProcessing}
                loading={pendingAction === "capture"}
                loadingText="Processing..."
                onClick={() => void captureCameraFrame()}
              >
                <Camera className="size-4" />
                Capture
              </Button>
            ) : null}
            {mode === "draw" && !previewUrl ? (
              <Button
                className="w-full"
                type="button"
                disabled={isProcessing}
                loading={pendingAction === "preview"}
                loadingText="Processing..."
                onClick={() => void previewDrawing()}
              >
                <Check className="size-4" />
                Preview
              </Button>
            ) : null}
            {previewUrl ? (
              <>
                <Button
                  className="w-full"
                  type="button"
                  disabled={isProcessing}
                  loading={pendingAction === "approve"}
                  loadingText="Approving..."
                  onClick={() => void handleApproveSignature()}
                >
                  <Check className="size-4" />
                  Approve
                </Button>
                <Button
                  className="w-full"
                  type="button"
                  variant="secondary"
                  disabled={isProcessing || !autoCrop}
                  onClick={resetCrop}
                >
                  <Crop className="size-4" />
                  Reset crop
                </Button>
                <Button
                  className="w-full"
                  type="button"
                  variant="secondary"
                  disabled={isProcessing}
                  onClick={resetPreview}
                >
                  <RefreshCw className="size-4" />
                  Retake
                </Button>
              </>
            ) : null}
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

function getCanvasPoint(
  canvas: HTMLCanvasElement,
  event: PointerEvent<HTMLCanvasElement>,
) {
  const rect = canvas.getBoundingClientRect();

  if (rect.width === 0 || rect.height === 0) {
    return null;
  }

  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
    scale: Math.max(scaleX, scaleY),
  };
}

function configureDrawContext(
  context: CanvasRenderingContext2D,
  coordinateScale: number,
) {
  context.lineWidth = DRAW_LINE_WIDTH * coordinateScale;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.strokeStyle = DRAW_STROKE_STYLE;
}

function getPreviewFrameStyle(size: {
  width: number;
  height: number;
}): CSSProperties {
  const ratio = size.width / size.height;

  return {
    aspectRatio: `${size.width} / ${size.height}`,
    width: `min(100%, ${Math.max(1, Math.round(ratio * 320))}px)`,
  };
}

function getCropStyle(
  crop: SignatureCropRect,
  size: {
    width: number;
    height: number;
  },
): CSSProperties {
  return {
    height: `${(crop.height / size.height) * 100}%`,
    left: `${(crop.x / size.width) * 100}%`,
    top: `${(crop.y / size.height) * 100}%`,
    width: `${(crop.width / size.width) * 100}%`,
  };
}

function resizeCropRect(
  action: CropDragAction,
  startCrop: SignatureCropRect,
  deltaX: number,
  deltaY: number,
  bounds: {
    width: number;
    height: number;
  },
): SignatureCropRect {
  const minWidth = Math.min(MIN_CROP_SIZE_PX, bounds.width);
  const minHeight = Math.min(MIN_CROP_SIZE_PX, bounds.height);

  if (action === "move") {
    return {
      x: Math.round(
        clamp(startCrop.x + deltaX, 0, bounds.width - startCrop.width),
      ),
      y: Math.round(
        clamp(startCrop.y + deltaY, 0, bounds.height - startCrop.height),
      ),
      width: Math.round(startCrop.width),
      height: Math.round(startCrop.height),
    };
  }

  let left = startCrop.x;
  let top = startCrop.y;
  let right = startCrop.x + startCrop.width;
  let bottom = startCrop.y + startCrop.height;

  if (action.includes("w")) {
    left = clamp(left + deltaX, 0, right - minWidth);
  }

  if (action.includes("e")) {
    right = clamp(right + deltaX, left + minWidth, bounds.width);
  }

  if (action.includes("n")) {
    top = clamp(top + deltaY, 0, bottom - minHeight);
  }

  if (action.includes("s")) {
    bottom = clamp(bottom + deltaY, top + minHeight, bounds.height);
  }

  return {
    x: Math.round(left),
    y: Math.round(top),
    width: Math.round(right - left),
    height: Math.round(bottom - top),
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, max));
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(blob);
  });
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onerror = () => reject(new Error("Could not load image."));
    image.onload = () => resolve(image);
    image.src = src;
  });
}
