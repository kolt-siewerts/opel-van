import { useState, useRef, useEffect } from "react";
import { useDrag, usePinch } from "react-use-gesture";
import ChevronRightIcon from "./ChevronRightIcon";

const STATIC_CAR_IMAGE = "van.webp";

type Step = 1 | 2 | 3;

export default function ImageEditor() {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [logoImage, setLogoImage] = useState<string | null>(null);
  const [processedLogo, setProcessedLogo] = useState<string | null>(null);
  const [position, setPosition] = useState<{ x: number; y: number }>({
    x: 420,
    y: 60,
  });
  const [size, setSize] = useState<number>(100);
  const [loading, setLoading] = useState<boolean>(false);
  const [transparentColor, setTransparentColor] = useState<string>("#ffffff"); // Default to white
  const [isDragging, setIsDragging] = useState<boolean>(false); // Track dragging state
  const imgRef = useRef<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Process image whenever transparentColor or logoImage changes
  useEffect(() => {
    if (logoImage) {
      processImage(logoImage);
    }
  }, [transparentColor, logoImage]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setLogoImage(reader.result as string);
      setCurrentStep(2); // Move to step 2 after upload
    };
    reader.readAsDataURL(file);
  };

  const processImage = (imageSrc: string) => {
    setLoading(true);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageSrc;

    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Convert the selected color to RGB
      const selectedColor = hexToRgb(transparentColor);

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Check if the pixel color matches the selected color
        if (
          r === selectedColor.r &&
          g === selectedColor.g &&
          b === selectedColor.b
        ) {
          data[i + 3] = 0; // Set alpha to 0 (transparent)
        }
      }

      ctx.putImageData(imageData, 0, 0);
      setProcessedLogo(canvas.toDataURL("image/png"));
      setLoading(false);
    };
  };

  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
      : { r: 0, g: 0, b: 0 };
  };

  const bindLogoDrag = useDrag(({ active, delta: [dx, dy] }) => {
    setIsDragging(active); // Update dragging state
    setPosition((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
  });

  const bindLogoPinch = usePinch(({ movement: [d] }) => {
    setSize((prev) => Math.max(50, prev + d));
  });

  const exportImage = () => {
    if (!canvasRef.current || !processedLogo || !imgRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const carImg = new Image();
    const logoImg = new Image();

    carImg.src = STATIC_CAR_IMAGE;
    logoImg.src = processedLogo;

    carImg.onload = () => {
      canvas.width = carImg.width;
      canvas.height = carImg.height;
      ctx.drawImage(carImg, 0, 0);

      const displayedWidth = imgRef.current!.clientWidth;
      const displayedHeight = imgRef.current!.clientHeight;
      const scaleX = carImg.width / displayedWidth;
      const scaleY = carImg.height / displayedHeight;
      const adjustedX = position.x * scaleX;
      const adjustedY = position.y * scaleY;
      const adjustedSize = size * scaleX;

      logoImg.onload = () => {
        ctx.drawImage(
          logoImg,
          adjustedX,
          adjustedY,
          adjustedSize,
          adjustedSize
        );
        const finalImage = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.href = finalImage;
        link.download = "custom_car.png";
        link.click();
      };
    };
  };

  // Step titles and descriptions
  const stepConfig = {
    1: {
      title: "Promote Your Business",
      description: "Start by uploading your company logo to place on the van.",
    },
    2: {
      title: "Customize Your Logo",
      description: "Adjust the transparency and size of your logo.",
    },
    3: {
      title: "Export Your Design",
      description: "Download your customized van design.",
    },
  };

  return (
    <div className="flex flex-col items-center p-14 text-black min-h-screen">
      {/* Step indicator */}
      <div className="flex items-center justify-center mb-10">
        {[1, 2, 3].map((step) => (
          <div key={step} className="flex items-center">
            <div
              className={`size-8 rounded-full flex items-center justify-center ${currentStep >= step
                ? "bg-[#fafd1e] text-black"
                : "bg-gray-200 text-gray-500"
                }`}
            >
              {step}
            </div>
            {step < 3 && (
              <div
                className={`w-16 h-1 ${currentStep > step ? "bg-[#fafd1e]" : "bg-gray-200"
                  }`}
              />
            )}
          </div>
        ))}
      </div>

      <h1 className="text-5xl text-center tracking-wide mb-4">
        {stepConfig[currentStep].title}
      </h1>
      <p className="text-center max-w-4/5 mt-3 mb-8">
        {stepConfig[currentStep].description}
      </p>

      {/* {loading && <p className="text-gray-400 text-sm">Processing logo...</p>} */}

      {/* Show car image on all steps */}
      <div className="relative w-full max-w-2xl overflow-hidden mt-6">
        <img ref={imgRef} src={STATIC_CAR_IMAGE} alt="Car" className="w-full" />
        {processedLogo && currentStep > 1 && (
          <div
            {...(currentStep === 2 ? bindLogoDrag() : {})}
            {...(currentStep === 2 ? bindLogoPinch() : {})}
            className={`absolute ${isDragging && currentStep === 2
              ? "cursor-grabbing border-1 border-gray-500 animate-move-dash"
              : currentStep === 2
                ? "cursor-grab"
                : ""
              }`}
            style={{
              left: position.x,
              top: position.y,
              width: `${size}px`,
              height: `${size}px`,
            }}
          >
            <img
              src={processedLogo}
              alt="Logo"
              className="w-full h-full object-contain"
            />
          </div>
        )}
      </div>

      {/* Step 1: Upload logo */}
      {currentStep === 1 && (
        <div className="mt-8">
          <label className="cursor-pointer bg-[#fafd1e] text-black px-8 py-4 rounded-full hover:bg-black hover:text-white transition text-lg font-bold flex items-center gap-2">
            <ChevronRightIcon />
            <span>Upload Your Logo</span>
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
        <div className="flex flex-col gap-4 w-full max-w-md">
          <div className="flex justify-center items-center gap-4">
            <label className="text-gray-600 font-medium">
              Choose the transparent color:
            </label>
            <input
              type="color"
              value={transparentColor}
              onChange={(e) => setTransparentColor(e.target.value)}
              className="w-10 h-10 cursor-pointer border border-black"
            />
          </div>

          <div className="flex justify-center items-center gap-3">
            <label className="text-gray-600 font-medium">Scale the logo</label>
            <input
              type="range"
              min="50"
              max="200"
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
              className="flex-1 cursor-ew-resize appearance-none bg-gray-200 rounded-lg h-2 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="text-sm text-gray-500 w-12">{size}px</div>
          </div>

          <div className="flex justify-center gap-4 mt-4">
            <button
              onClick={() => setCurrentStep(1)}
              className="text-black px-8 py-3 rounded-full hover:bg-black hover:text-white font-bold transition border cursor-pointer"
            >
              Back
            </button>
            <button
              onClick={() => setCurrentStep(3)}
              disabled={loading}
              className="bg-[#fafd1e] text-black px-8 w-1/2 cursor-pointer text-nowrap py-3 rounded-full hover:bg-black hover:text-white transition font-bold disabled:bg-gray-300 disabled:text-gray-100"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Export image */}
      {currentStep === 3 && (
        <div className="flex justify-center gap-4 mt-8">
          <button
            onClick={() => setCurrentStep(2)}
            className="text-black px-8 py-3 rounded-full hover:bg-black hover:text-white font-bold transition border cursor-pointer"
          >
            Back
          </button>
          <button
            onClick={exportImage}
            className="bg-[#fafd1e] text-black px-14 py-3 rounded-full hover:bg-black hover:text-white font-bold transition cursor-pointer"
          >
            Export Image
          </button>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
