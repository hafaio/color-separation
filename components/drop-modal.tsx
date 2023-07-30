import { useColorModeValue } from "@chakra-ui/react";
import { ReactElement } from "react";

export default function DropModal({ show }: { show: boolean }): ReactElement {
  return (
    <div
      className={`w-screen h-screen fixed backdrop-blur-sm z-10 flex flex-col items-center justify-center ${
        show ? "block" : "hidden"
      }`}
    >
      <div
        className={`w-96 p-4 space-y-2 rounded-md shadow-md ${useColorModeValue(
          "bg-white",
          "bg-gray-900",
        )}`}
      >
        <h1 className="font-bold text-lg">Drag & Drop an SVG to Upload</h1>
        <p>Drop a compatible SVG anywhere to begin separating its colors.</p>
      </div>
    </div>
  );
}
