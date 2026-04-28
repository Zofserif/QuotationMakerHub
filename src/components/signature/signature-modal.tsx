"use client";

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent,
} from "react";
import {
  Camera,
  Check,
  LoaderCircle,
  PenLine,
  RefreshCw,
  Upload,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cleanSignatureFromCanvas } from "@/lib/signatures/clean-signature";
import type { SourceMethod } from "@/lib/quotes/types";
import { cn } from "@/lib/utils";

const DRAW_LINE_WIDTH = 4;
const DRAW_STROKE_STYLE = "#111827";

type PendingSignatureAction = "approve" | "capture" | "preview" | "upload";

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
  const [mode, setMode] = useState<SourceMethod>("camera");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
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
      const blob = await cleanSignatureFromCanvas(canvas);
      const nextDataUrl = await blobToDataUrl(blob);
      setDataUrl(nextDataUrl);
      setPreviewUrl(nextDataUrl);
      setMode(source);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signature cleanup failed.");
    }
  }

  function resetPreview() {
    setPreviewUrl(null);
    setDataUrl(null);
    setError(null);
    hasDrawnInk.current = false;
  }

  async function approveSignature() {
    if (!dataUrl) {
      return;
    }

    if (onApproveSignature) {
      try {
        await onApproveSignature({
          imageBase64: dataUrl,
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
          imageBase64: dataUrl,
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
              <div className="grid h-full place-items-center rounded-md bg-[linear-gradient(45deg,#f5f5f4_25%,transparent_25%),linear-gradient(-45deg,#f5f5f4_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#f5f5f4_75%),linear-gradient(-45deg,transparent_75%,#f5f5f4_75%)] bg-[length:24px_24px] bg-[position:0_0,0_12px,12px_-12px,-12px_0]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt="Cleaned signature preview"
                  className="max-h-48 max-w-full object-contain"
                  src={previewUrl}
                />
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
