import { useState, useRef } from "react";
import { useDrag, usePinch } from "react-use-gesture";

const STATIC_CAR_IMAGE = "/src/assets/van.webp";

export default function ImageEditor() {
  const [logoImage, setLogoImage] = useState<string | null>(null);
  const [processedLogo, setProcessedLogo] = useState<string | null>(null);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 420, y: 60 });
  const [size, setSize] = useState<number>(100);
  const [loading, setLoading] = useState<boolean>(false);
  const [transparentColor, setTransparentColor] = useState<string>("#000000"); // Default to black
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
        if (r === selectedColor.r && g === selectedColor.g && b === selectedColor.b) {
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

  const bindLogoDrag = useDrag(({ delta: [dx, dy] }) => {
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
        ctx.drawImage(logoImg, adjustedX, adjustedY, adjustedSize, adjustedSize);
        const finalImage = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.href = finalImage;
        link.download = "custom_car.png";
        link.click();
      };
    };
  };

  return (
    <div className="flex flex-col items-center gap-8 p-8 min-h-screen bg-gray-950 text-white">
      <h1 className="text-3xl font-semibold tracking-wide mb-2">
        {processedLogo ? "Drag to move, slide to resize" : "Customize Your Opel"}
      </h1>
      <div className="flex items-center gap-4">
        <label className="text-gray-400">Choose The Transparent Color:</label>
        <input
          type="color"
          value={transparentColor}
          onChange={(e) => setTransparentColor(e.target.value)}
          className="w-10 h-10"
        />
      </div>
      <label className="cursor-pointer bg-white text-black px-5 py-2 rounded-lg font-medium hover:bg-gray-200 transition">
        Upload Logo
        <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
      </label>
      {loading && <p className="text-gray-400 text-sm">Processing logo...</p>}
      <div className="relative w-full max-w-2xl bg-gray-300 border border-gray-700 rounded-xl overflow-hidden shadow-lg">
        <img ref={imgRef} src={STATIC_CAR_IMAGE} alt="Car" className="w-full" />
        {processedLogo && (
          <div {...bindLogoDrag()} {...bindLogoPinch()} className="absolute cursor-move" style={{ left: position.x, top: position.y, width: `${size}px`, height: `${size}px` }}>
            <img src={processedLogo} alt="Logo" className="w-full h-full object-contain" />
          </div>
        )}
      </div>
      <button onClick={exportImage} disabled={!processedLogo} className="bg-yellow-500 text-black font-bold px-6 py-3 rounded-lg hover:bg-green-600 transition disabled:bg-gray-700">
        Export Image
      </button>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}