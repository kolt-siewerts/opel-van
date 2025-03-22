import { useState, useRef } from "react";
import { useDrag, usePinch } from "react-use-gesture";
import ChevronRightIcon from "./ChevronRightIcon";

const STATIC_CAR_IMAGE = "/src/assets/van.webp";

export default function ImageEditor() {
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

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => processImage(reader.result as string);
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
      setLogoImage(imageSrc);
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

  return (
    <div className="flex flex-col items-center p-16 text-gray-600 min-h-screen">
      <h1 className="text-4xl text-center tracking-wide mb-2">
        {processedLogo
          ? "Drag to move, slide to resize"
          : "Promote Your Business"}
      </h1>
      <p className="text-gray-400 text-center max-w-4/5 mt-3">
        Quis cillum elit ullamco reprehenderit. Aliqua officia nisi deserunt eu
        tempor pariatur. Lorem laboris magna adipisicing culpa consectetur
        commodo dolor sit sunt dolore sit deserunt in. Reprehenderit eiusmod ut
        qui eiusmod adipisicing ipsum commodo labore laboris dolore fugiat do
        sit. Anim qui et pariatur nulla excepteur.
      </p>

      {loading && <p className="text-gray-400 text-sm">Processing logo...</p>}
      <div className="relative w-full max-w-2xl overflow-hidden mt-16">
        <img ref={imgRef} src={STATIC_CAR_IMAGE} alt="Car" className="w-full" />
        {processedLogo && (
          <div
            {...bindLogoDrag()}
            {...bindLogoPinch()}
            className={`absolute ${
              isDragging
                ? "cursor-grabbing border-1 border-gray-500 animate-move-dash"
                : "cursor-grab"
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
      {processedLogo ? (
        <div className="flex items-center gap-3">
          <label className="text-gray-600 text-sm font-medium">
            Resize Logo
          </label>
          <input
            type="range"
            min="50"
            max="200"
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
            className="w-40 cursor-ew-resize appearance-none bg-gray-200 rounded-lg h-2 my-2 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="text-sm text-gray-500">{size}px</div>
        </div>
      ) : (
        <div className="flex items-center gap-4">
          <label className="text-gray-400">Choose The Transparent Color:</label>
          <input
            type="color"
            value={transparentColor}
            onChange={(e) => setTransparentColor(e.target.value)}
            className="w-10 h-10"
          />
        </div>
      )}

      <div className="flex items-center gap-3 mt-6">
        <label className="cursor-pointer bg-[#fafd1e] text-black pe-8 ps-6 py-2 rounded-full hover:bg-gray-200 transition">
          <div className="flex gap-1">
            <ChevronRightIcon />
            <span className="font-bold my-auto">Upload Your Image</span>
          </div>
          <input
            type="file"
            accept="image/*"
            onChange={handleLogoUpload}
            className="hidden"
          />
        </label>
        <button
          onClick={exportImage}
          disabled={!processedLogo}
          className="text-black px-8 py-3 rounded-full hover:bg-green-400 font-bold transition disabled:bg-gray-200 disabled:text-gray-500 disabled:opacity-75 disabled:cursor-not-allowed border cursor-pointer"
        >
          Export Image
        </button>
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}