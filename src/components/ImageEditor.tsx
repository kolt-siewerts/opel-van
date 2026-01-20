import { useState, useRef, useEffect, useMemo } from "react";
import { useDrag, usePinch } from "react-use-gesture";
import { useI18n, type Locale } from "../hooks/useI18n";

const VAN_MODELS = ["combo", "movano", "vivaro"] as const;
type VanModel = (typeof VAN_MODELS)[number];
const DEFAULT_MODEL: VanModel = "vivaro";

const LOCALES = ["en", "de"] as const;
const DEFAULT_LOCALE: Locale = "en";

function getUrlParams(): { model: VanModel; lang: Locale } {
  const params = new URLSearchParams(window.location.search);

  const model = params.get("model");
  const validModel = model && VAN_MODELS.includes(model as VanModel)
    ? (model as VanModel)
    : DEFAULT_MODEL;

  const lang = params.get("lang");
  const validLang = lang && LOCALES.includes(lang as Locale)
    ? (lang as Locale)
    : DEFAULT_LOCALE;

  return { model: validModel, lang: validLang };
}

type Step = 1 | 2 | 3;

export default function ImageEditor() {
  const { model: vanModel, lang } = useMemo(() => getUrlParams(), []);
  const { t } = useI18n(lang);
  const carImage = `images/${vanModel}.webp`;
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [logoImage, setLogoImage] = useState<string | null>(null);
  const [processedLogo, setProcessedLogo] = useState<string | null>(null);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [size, setSize] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [aspectRatio, setAspectRatio] = useState<number>(1);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Set initial logo position and size based on image dimensions once loaded
  useEffect(() => {
    if (processedLogo && imgRef.current && position === null) {
      const img = imgRef.current;

      const updatePositionAndSize = () => {
        const imgWidth = img.clientWidth;
        const imgHeight = img.clientHeight;

        // Only update if we have valid dimensions
        if (imgWidth > 0 && imgHeight > 0) {
          // Position logo at roughly 55% from left and 10% from top of the van image
          setPosition({
            x: Math.round(imgWidth * 0.55),
            y: Math.round(imgHeight * 0.1),
          });
          // Set initial size relative to image width (about 15% of image width)
          if (size === null) {
            setSize(Math.round(imgWidth * 0.15));
          }
          return true;
        }
        return false;
      };

      // Try immediately if image is already loaded with dimensions
      if (img.complete && updatePositionAndSize()) {
        return;
      }

      // Use ResizeObserver to detect when image has dimensions (more reliable on mobile)
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
            updatePositionAndSize();
            resizeObserver.disconnect();
          }
        }
      });

      resizeObserver.observe(img);

      // Also listen for load event as fallback
      const handleLoad = () => {
        if (updatePositionAndSize()) {
          resizeObserver.disconnect();
        }
      };
      img.addEventListener("load", handleLoad);

      return () => {
        resizeObserver.disconnect();
        img.removeEventListener("load", handleLoad);
      };
    }
  }, [processedLogo, position, size]);

  // Process image whenever logoImage changes
  useEffect(() => {
    if (logoImage) {
      processImage(logoImage);
    }
  }, [logoImage]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setLogoImage(reader.result as string);
      setCurrentStep(2);
    };
    reader.readAsDataURL(file);
  };

  const processImage = (imageSrc: string) => {
    setLoading(true);
    const img = new Image();
    // Only set crossOrigin for non-data URLs (not needed for uploaded files)
    if (!imageSrc.startsWith("data:")) {
      img.crossOrigin = "anonymous";
    }

    img.onload = () => {
      setAspectRatio(img.width / img.height);
      setProcessedLogo(imageSrc);
      setLoading(false);
    };

    img.onerror = () => {
      console.error("Failed to load image");
      setLoading(false);
    };

    img.src = imageSrc;
  };

  const bindLogoDrag = useDrag(
    ({ active, delta: [dx, dy] }) => {
      setIsDragging(active);
      setPosition((prev) => prev ? { x: prev.x + dx, y: prev.y + dy } : prev);
    },
    {
      filterTaps: true, // Prevents drag from triggering on simple taps
      pointer: { touch: true }, // Enable touch pointer events
    }
  );

  const bindLogoPinch = usePinch(
    ({ movement: [d] }) => {
      setSize((prev) => Math.max(30, (prev ?? 100) + d));
    },
    {
      pointer: { touch: true },
    }
  );

  const exportImage = async () => {
    if (!canvasRef.current || !processedLogo || !imgRef.current || !position || !size) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const loadImage = (src: string): Promise<HTMLImageElement> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
      });
    };

    try {
      const [carImg, logoImg] = await Promise.all([
        loadImage(carImage),
        loadImage(processedLogo),
      ]);

      canvas.width = carImg.width;
      canvas.height = carImg.height;

      // Fill with white background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.drawImage(carImg, 0, 0);

      const displayedWidth = imgRef.current!.clientWidth;
      const displayedHeight = imgRef.current!.clientHeight;
      const scaleX = carImg.width / displayedWidth;
      const scaleY = carImg.height / displayedHeight;
      const adjustedX = position.x * scaleX;
      const adjustedY = position.y * scaleY;
      const adjustedWidth = size * scaleX;
      const adjustedHeight = (size / aspectRatio) * scaleY;

      ctx.drawImage(
        logoImg,
        adjustedX,
        adjustedY,
        adjustedWidth,
        adjustedHeight
      );

      const finalImage = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = finalImage;
      link.download = "custom_car.png";
      link.click();
    } catch (error) {
      console.error("Failed to export image:", error);
    }
  };

  return (
    <div className="flex flex-col items-center px-4 py-6 sm:px-[24px] sm:py-[40px] text-black min-h-screen gap-6 sm:gap-[40px]">
      {/* Step indicator */}
      <div className="flex items-center justify-center">
        {[1, 2, 3].map((step) => (
          <div key={step} className="flex items-center">
            <div
              className={`size-8 rounded-full flex items-center justify-center font-bold ${currentStep >= step
                ? "bg-[#f7ff14] text-black"
                : "bg-gray-200 text-gray-500"
                }`}
            >
              {step}
            </div>
            {step < 3 && (
              <div
                className={`w-16 h-1 ${currentStep > step ? "bg-[#f7ff14]" : "bg-gray-200"
                  }`}
              />
            )}
          </div>
        ))}
      </div>

      <div className="flex flex-col items-center gap-3 sm:gap-[16px] text-center max-w-[800px]">
        <h1 className="text-2xl sm:text-[32px] leading-tight sm:leading-[40px] font-light">
          {t(`steps.${currentStep}.title`)}
        </h1>
        <p className="text-sm sm:text-[16px] leading-relaxed sm:leading-[24px] tracking-[0.32px] font-light">
          {t(`steps.${currentStep}.description`)}
        </p>
      </div>

      {/* Show car image on all steps */}
      <div className="relative w-full max-w-2xl overflow-hidden">
        <img ref={imgRef} src={carImage} alt="Car" className="w-full" />
        {processedLogo && currentStep > 1 && position && size && (
          <div
            {...(currentStep === 2 ? bindLogoDrag() : {})}
            {...(currentStep === 2 ? bindLogoPinch() : {})}
            className={`absolute select-none ${
              currentStep === 2
                ? isDragging
                  ? "cursor-grabbing"
                  : "cursor-grab"
                : ""
            }`}
            style={{
              // Offset position by padding to keep logo visually in same place
              left: position.x - (currentStep === 2 ? 12 : 0),
              top: position.y - (currentStep === 2 ? 12 : 0),
              // Add padding for larger touch target on step 2
              padding: currentStep === 2 ? "12px" : "0",
              width: currentStep === 2 ? `${size + 24}px` : `${size}px`,
              height: currentStep === 2 ? `${size / aspectRatio + 24}px` : `${size / aspectRatio}px`,
              touchAction: "none", // Prevent browser handling of touch gestures
            }}
          >
            <img
              src={processedLogo}
              alt="Logo"
              className="w-full h-full object-contain pointer-events-none"
              draggable={false}
            />
          </div>
        )}
      </div>

      {/* Step 1: Upload logo */}
      {currentStep === 1 && (
        <div>
          <label className="cursor-pointer bg-[#f7ff14] text-black px-5 sm:px-[24px] h-11 sm:h-[48px] rounded-full hover:bg-black hover:text-white transition font-bold text-sm sm:text-[16px] leading-[16px] flex items-center gap-2">
            <span>{t("buttons.uploadLogo")}</span>
            <svg
              className="size-5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
              />
            </svg>
            <input
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="hidden"
            />
          </label>
        </div>
      )}

      {/* Step 2: Customize logo */}
      {currentStep === 2 && (
        <div className="flex flex-col gap-4 w-full max-w-md px-2">
          <div className="flex flex-col sm:flex-row justify-center items-center gap-3 sm:gap-[16px]">
            <label className="text-black text-sm sm:text-[16px] leading-[24px] font-light whitespace-nowrap">{t("labels.scaleLogo")}</label>
            <input
              type="range"
              min="30"
              max="250"
              value={size ?? 100}
              onChange={(e) => setSize(Number(e.target.value))}
              className="w-full sm:flex-1 cursor-ew-resize appearance-none bg-gray-200 rounded-lg h-2 transition-all focus:outline-none focus:ring-2 focus:ring-[#f7ff14] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:bg-black [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-ew-resize [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:bg-black [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:cursor-ew-resize"
            />
          </div>

          <div className="flex justify-center gap-3 sm:gap-[24px] mt-4">
            <button
              onClick={() => setCurrentStep(1)}
              className="text-black px-5 sm:px-[24px] h-11 sm:h-[48px] rounded-full hover:bg-black hover:text-white font-bold text-sm sm:text-[16px] leading-[16px] transition border border-black cursor-pointer"
            >
              {t("buttons.back")}
            </button>
            <button
              onClick={() => setCurrentStep(3)}
              disabled={loading}
              className="bg-[#f7ff14] text-black px-5 sm:px-[24px] cursor-pointer text-nowrap h-11 sm:h-[48px] rounded-full hover:bg-black hover:text-white transition font-bold text-sm sm:text-[16px] leading-[16px] disabled:bg-gray-300 disabled:text-gray-100"
            >
              {t("buttons.next")}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Export image */}
      {currentStep === 3 && (
        <div className="flex justify-center gap-3 sm:gap-[24px]">
          <button
            onClick={() => setCurrentStep(2)}
            className="text-black px-5 sm:px-[24px] h-11 sm:h-[48px] rounded-full hover:bg-black hover:text-white font-bold text-sm sm:text-[16px] leading-[16px] transition border border-black cursor-pointer"
          >
            {t("buttons.back")}
          </button>
          <button
            onClick={exportImage}
            className="bg-[#f7ff14] text-black px-5 sm:px-[24px] h-11 sm:h-[48px] rounded-full hover:bg-black hover:text-white font-bold text-sm sm:text-[16px] leading-[16px] transition cursor-pointer"
          >
            {t("buttons.export")}
          </button>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}