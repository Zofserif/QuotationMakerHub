"use client";

import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type PointerEvent,
} from "react";
import { Camera, Check, PenLine, RefreshCw, Upload, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cleanSignatureFromCanvas } from "@/lib/signatures/clean-signature";
import type { SourceMethod } from "@/lib/quotes/types";

function hasCameraApi() {
  return Boolean(navigator.mediaDevices?.getUserMedia);
}

export function SignatureModal({
  token,
  signatureFieldId,
  open,
  onClose,
  onUploaded,
}: {
  token: string;
  signatureFieldId: string;
  open: boolean;
  onClose: () => void;
  onUploaded: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [mode, setMode] = useState<SourceMethod>("camera");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isDrawing = useRef(false);

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
    await cleanAndPreview(canvas, "camera");
  }

  async function handleUpload(file?: File) {
    if (!file || !canvasRef.current) {
      return;
    }

    const image = new Image();
    image.onload = async () => {
      const canvas = canvasRef.current!;
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext("2d");
      context?.drawImage(image, 0, 0);
      URL.revokeObjectURL(image.src);
      await cleanAndPreview(canvas, "upload");
    };
    image.src = URL.createObjectURL(file);
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
  }

  async function approveSignature() {
    if (!dataUrl) {
      return;
    }

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

    onUploaded();
    onClose();
  }

  function startDraw(event: PointerEvent<HTMLCanvasElement>) {
    isDrawing.current = true;
    draw(event);
  }

  function draw(event: PointerEvent<HTMLCanvasElement>) {
    if (!isDrawing.current || !drawCanvasRef.current) {
      return;
    }

    const canvas = drawCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    context.lineWidth = 4;
    context.lineCap = "round";
    context.strokeStyle = "#111827";
    context.lineTo(event.clientX - rect.left, event.clientY - rect.top);
    context.stroke();
    context.beginPath();
    context.moveTo(event.clientX - rect.left, event.clientY - rect.top);
  }

  function endDraw() {
    isDrawing.current = false;
    drawCanvasRef.current?.getContext("2d")?.beginPath();
  }

  async function previewDrawing() {
    if (!drawCanvasRef.current || !canvasRef.current) {
      return;
    }

    const source = drawCanvasRef.current;
    const canvas = canvasRef.current;
    canvas.width = source.width;
    canvas.height = source.height;
    canvas.getContext("2d")?.drawImage(source, 0, 0);
    await cleanAndPreview(canvas, "draw");
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
          <Button aria-label="Close" variant="ghost" size="icon" onClick={onClose}>
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
              <label className="grid h-[320px] cursor-pointer place-items-center rounded-md border border-dashed border-stone-300 bg-white text-center text-sm text-stone-600">
                <span>
                  <Upload className="mx-auto mb-3 size-8 text-stone-400" />
                  Select PNG or JPEG signature image
                </span>
                <input
                  accept="image/png,image/jpeg,image/webp"
                  className="sr-only"
                  type="file"
                  onChange={(event) => handleUpload(event.target.files?.[0])}
                />
              </label>
            ) : (
              <canvas
                ref={drawCanvasRef}
                width={680}
                height={320}
                className="h-[320px] w-full touch-none rounded-md bg-white"
                onPointerDown={startDraw}
                onPointerMove={draw}
                onPointerUp={endDraw}
                onPointerLeave={endDraw}
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
                onClick={() => {
                  resetPreview();
                  setMode("draw");
                }}
              >
                <PenLine className="size-4" />
              </Button>
            </div>

            {mode === "camera" && !previewUrl ? (
              <Button className="w-full" type="button" onClick={captureCameraFrame}>
                <Camera className="size-4" />
                Capture
              </Button>
            ) : null}
            {mode === "draw" && !previewUrl ? (
              <Button className="w-full" type="button" onClick={previewDrawing}>
                <Check className="size-4" />
                Preview
              </Button>
            ) : null}
            {previewUrl ? (
              <>
                <Button
                  className="w-full"
                  type="button"
                  disabled={isPending}
                  onClick={() => startTransition(approveSignature)}
                >
                  <Check className="size-4" />
                  Approve
                </Button>
                <Button
                  className="w-full"
                  type="button"
                  variant="secondary"
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

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(blob);
  });
}
