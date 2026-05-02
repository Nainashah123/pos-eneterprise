'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { NotFoundException } from '@zxing/library';
import { X, Camera, CameraOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils/cn';

interface BarcodeScannerProps {
  open: boolean;
  onClose: () => void;
  onDetected: (barcode: string) => void;
}

export function BarcodeScanner({ open, onClose, onDetected }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [lastDetected, setLastDetected] = useState<string | null>(null);

  const stopScanner = useCallback(() => {
    if (readerRef.current) {
      BrowserMultiFormatReader.releaseAllStreams();
      readerRef.current = null;
    }
    setScanning(false);
  }, []);

  const startScanner = useCallback(async () => {
    if (!videoRef.current) return;
    setError(null);
    setScanning(true);
    try {
      const reader = new BrowserMultiFormatReader();
      readerRef.current = reader;

      const devices = await BrowserMultiFormatReader.listVideoInputDevices();
      if (devices.length === 0) {
        setError('No camera found on this device.');
        setScanning(false);
        return;
      }

      // Prefer rear camera on mobile
      const device = devices.find((d) =>
        d.label.toLowerCase().includes('back') ||
        d.label.toLowerCase().includes('rear') ||
        d.label.toLowerCase().includes('environment')
      ) ?? devices[0];

      await reader.decodeFromVideoDevice(
        device.deviceId,
        videoRef.current,
        (result, err) => {
          if (result) {
            const code = result.getText();
            setLastDetected(code);
            onDetected(code);
            // Brief pause before allowing next scan
            setTimeout(() => setLastDetected(null), 2000);
          }
          if (err && !(err instanceof NotFoundException)) {
            console.error('Scan error:', err);
          }
        }
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Camera access denied.';
      setError(
        msg.includes('Permission') || msg.includes('NotAllowed')
          ? 'Camera permission denied. Please allow camera access in your browser settings.'
          : `Camera error: ${msg}`
      );
      setScanning(false);
    }
  }, [onDetected]);

  useEffect(() => {
    if (open) {
      startScanner();
    } else {
      stopScanner();
      setError(null);
      setLastDetected(null);
    }
    return () => { stopScanner(); };
  }, [open, startScanner, stopScanner]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="relative w-full max-w-sm bg-gray-950 rounded-3xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-indigo-400" />
            <p className="text-sm font-semibold text-white">Barcode Scanner</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Camera viewport */}
        <div className="relative aspect-square bg-black">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            autoPlay
            muted
            playsInline
          />

          {/* Scanning overlay */}
          {scanning && !error && (
            <>
              {/* Corner brackets */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="relative w-52 h-52">
                  {/* Corners */}
                  {[
                    'top-0 left-0 border-t-2 border-l-2 rounded-tl-lg',
                    'top-0 right-0 border-t-2 border-r-2 rounded-tr-lg',
                    'bottom-0 left-0 border-b-2 border-l-2 rounded-bl-lg',
                    'bottom-0 right-0 border-b-2 border-r-2 rounded-br-lg',
                  ].map((cls, i) => (
                    <div key={i} className={cn('absolute w-8 h-8 border-indigo-400', cls)} />
                  ))}
                  {/* Scan line */}
                  <motion.div
                    animate={{ y: [0, 192, 0] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
                    className="absolute left-0 right-0 h-0.5 bg-indigo-400/80 shadow-lg shadow-indigo-400/50"
                  />
                </div>
              </div>
            </>
          )}

          {/* Success flash */}
          <AnimatePresence>
            {lastDetected && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center"
              >
                <div className="bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-lg">
                  ✓ {lastDetected}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error state */}
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
              <CameraOff className="h-12 w-12 text-gray-500 mb-3" />
              <p className="text-sm text-gray-300">{error}</p>
              <button
                onClick={startScanner}
                className="mt-4 text-xs bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors"
              >
                Retry
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 text-center">
          <p className="text-xs text-gray-400">
            {scanning && !error
              ? 'Point camera at a barcode or QR code'
              : 'Scanner inactive'}
          </p>
          <p className="text-[10px] text-gray-600 mt-1">
            Supports EAN-13, QR, Code 128, DataMatrix and more
          </p>
        </div>
      </motion.div>
    </div>
  );
}
