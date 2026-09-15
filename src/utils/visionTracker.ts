import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { VisionStats } from '../types';

export interface NormalizedLandmark {
  x: number;
  y: number;
  z: number;
}

export type HandLandmarksCallback = (
  bladePos: { x: number; y: number },
  stats: VisionStats,
  allLandmarks: NormalizedLandmark[] | null
) => void;

// Hand landmark connection pairs (21 landmarks)
export const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],       // Thumb
  [0, 5], [5, 6], [6, 7], [7, 8],       // Index
  [5, 9], [9, 10], [10, 11], [11, 12],  // Middle
  [9, 13], [13, 14], [14, 15], [15, 16], // Ring
  [13, 17], [17, 18], [18, 19], [19, 20],// Pinky
  [0, 17]                               // Wrist base
];

export class VisionTracker {
  private handLandmarker: HandLandmarker | null = null;
  private video: HTMLVideoElement | null = null;
  private stream: MediaStream | null = null;
  private animationFrameId: number | null = null;
  private isRunning = false;
  private isInitializing = false;
  private pinchThreshold = 0.09;
  private smoothBladePos = { x: 0.5, y: 0.5 };
  private alpha = 0.92; // Responsive smoothing factor

  // FPS calculation
  private frameCount = 0;
  private currentFps = 60;
  private fpsTimer = performance.now();
  private lastDetectTimestamp = -1;

  public async initialize(): Promise<boolean> {
    if (this.handLandmarker) return true;
    if (this.isInitializing) {
      // Wait if already initializing
      let attempts = 0;
      while (this.isInitializing && attempts < 50) {
        await new Promise((r) => setTimeout(r, 100));
        attempts++;
        if (this.handLandmarker) return true;
      }
      return !!this.handLandmarker;
    }

    this.isInitializing = true;
    const wasmUrl = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm';
    const modelUrl = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

    try {
      console.log('[VisionTracker] Loading FilesetResolver with wasm:', wasmUrl);
      const vision = await FilesetResolver.forVisionTasks(wasmUrl);

      console.log('[VisionTracker] Creating HandLandmarker with GPU delegate...');
      this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: modelUrl,
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numHands: 1,
        minHandDetectionConfidence: 0.25,
        minHandPresenceConfidence: 0.25,
        minTrackingConfidence: 0.25,
      });

      this.isInitializing = false;
      console.log('[VisionTracker] Successfully initialized HandLandmarker (GPU)');
      return true;
    } catch (err) {
      console.warn('[VisionTracker] GPU initialization failed, falling back to CPU:', err);
      try {
        const vision = await FilesetResolver.forVisionTasks(wasmUrl);
        this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: modelUrl,
            delegate: 'CPU',
          },
          runningMode: 'VIDEO',
          numHands: 1,
          minHandDetectionConfidence: 0.2,
          minHandPresenceConfidence: 0.2,
          minTrackingConfidence: 0.2,
        });
        this.isInitializing = false;
        console.log('[VisionTracker] Successfully initialized HandLandmarker (CPU)');
        return true;
      } catch (cpuErr) {
        console.error('[VisionTracker] Failed to initialize HandLandmarker on both GPU & CPU:', cpuErr);
        this.isInitializing = false;
        return false;
      }
    }
  }

  public async startCamera(
    videoElement: HTMLVideoElement,
    callback: HandLandmarksCallback,
    pinchOnlyMode: boolean = false
  ): Promise<{ success: boolean; error?: string }> {
    try {
      this.video = videoElement;

      // Stop existing stream if any
      if (this.stream) {
        this.stream.getTracks().forEach((track) => track.stop());
        this.stream = null;
      }

      // Initialize landmarker if not yet ready
      if (!this.handLandmarker) {
        const ready = await this.initialize();
        if (!ready) {
          return { success: false, error: 'Could not load AI hand tracking model' };
        }
      }

      // Request webcam stream with flexible constraints
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 320 },
          height: { ideal: 240 },
        },
        audio: false,
      });

      videoElement.srcObject = this.stream;
      videoElement.setAttribute('playsinline', 'true');
      videoElement.muted = true;

      await new Promise<void>((resolve, reject) => {
        let isResolved = false;
        const onReady = () => {
          if (!isResolved) {
            isResolved = true;
            videoElement.play().catch(console.warn);
            resolve();
          }
        };

        videoElement.onloadeddata = onReady;
        videoElement.onloadedmetadata = onReady;

        // Fallback timeout to prevent hanging
        setTimeout(() => {
          if (!isResolved) {
            isResolved = true;
            videoElement.play().catch(console.warn);
            resolve();
          }
        }, 1200);
      });

      this.isRunning = true;
      this.startLoop(callback, pinchOnlyMode);
      return { success: true };
    } catch (err: unknown) {
      console.error('[VisionTracker] Camera start failed:', err);
      const message = err instanceof Error ? err.message : 'Webcam permission denied';
      return { success: false, error: message };
    }
  }

  private startLoop(callback: HandLandmarksCallback, pinchOnlyMode: boolean) {
    let lastVideoTime = -1;
    // Run detection at ~30fps via setTimeout so it doesn't compete with the game's rAF loop
    const DETECT_INTERVAL = 33;

    const processLoop = () => {
      if (!this.isRunning) return;

      const now = performance.now();
      this.frameCount++;
      if (now - this.fpsTimer >= 500) {
        this.currentFps = Math.round((this.frameCount * 1000) / (now - this.fpsTimer));
        this.frameCount = 0;
        this.fpsTimer = now;
      }

      const video = this.video;
      if (video && this.handLandmarker && video.readyState >= 2) {
        if (video.currentTime !== lastVideoTime) {
          lastVideoTime = video.currentTime;
          try {
            const timestamp = now > this.lastDetectTimestamp ? now : this.lastDetectTimestamp + 1;
            this.lastDetectTimestamp = timestamp;

            const results = this.handLandmarker.detectForVideo(video, timestamp);
            if (results && results.landmarks && results.landmarks.length > 0) {
              const hand = results.landmarks[0];
              const indexTip = hand[8];
              const thumbTip = hand[4];

              const dx = thumbTip.x - indexTip.x;
              const dy = thumbTip.y - indexTip.y;
              const pinchDistance = Math.sqrt(dx * dx + dy * dy);
              const isPinching = pinchDistance < this.pinchThreshold;

              const mirroredX = 1 - indexTip.x;
              const targetY = indexTip.y;

              this.smoothBladePos.x = this.alpha * mirroredX + (1 - this.alpha) * this.smoothBladePos.x;
              this.smoothBladePos.y = this.alpha * targetY + (1 - this.alpha) * this.smoothBladePos.y;

              const stats: VisionStats = {
                fps: this.currentFps,
                isTracking: true,
                handDetected: true,
                landmarkCount: 21,
                indexFinger: { x: mirroredX, y: targetY, z: indexTip.z },
                thumbFinger: { x: 1 - thumbTip.x, y: thumbTip.y, z: thumbTip.z },
                pinchDistance: Math.round(pinchDistance * 1000) / 1000,
                isPinching,
                detectionConfidence: 0.95,
                cameraActive: true,
                cameraError: null,
                inputMode: 'hand',
              };

              if (!pinchOnlyMode || isPinching) {
                callback({ x: this.smoothBladePos.x, y: this.smoothBladePos.y }, stats, hand);
              } else {
                callback({ x: -1, y: -1 }, stats, hand);
              }
            } else {
              const stats: VisionStats = {
                fps: this.currentFps,
                isTracking: true,
                handDetected: false,
                landmarkCount: 0,
                indexFinger: null,
                thumbFinger: null,
                pinchDistance: 0,
                isPinching: false,
                detectionConfidence: 0,
                cameraActive: true,
                cameraError: null,
                inputMode: 'hand',
              };
              callback({ x: -1, y: -1 }, stats, null);
            }
          } catch (detectionErr) {
            console.warn('[VisionTracker] Frame detection warning:', detectionErr);
          }
        }
      }

      this.animationFrameId = setTimeout(processLoop, DETECT_INTERVAL) as unknown as number;
    };

    this.animationFrameId = setTimeout(processLoop, DETECT_INTERVAL) as unknown as number;
  }

  public stopCamera() {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      clearTimeout(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    if (this.video) {
      this.video.srcObject = null;
    }
    this.lastDetectTimestamp = -1;
  }
}

export const visionTracker = new VisionTracker();
