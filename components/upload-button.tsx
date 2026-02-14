import { type ChangeEvent, type ReactElement, useRef } from "react";
import { FaFileUpload } from "react-icons/fa";

export default function UploadButton({
  onFile,
  loading = false,
}: {
  onFile: (f: File) => void;
  loading?: boolean;
}): ReactElement {
  const onChange = (evt: ChangeEvent<HTMLInputElement>) => {
    const file = evt.target.files?.[0];
    if (file) {
      onFile(file);
    }
  };
  const input = useRef<HTMLInputElement>(null);
  const click = () => {
    input.current?.click();
  };

  return (
    <div>
      <input
        ref={input}
        type="file"
        accept="image/svg+xml, image/png, image/jpeg"
        onChange={onChange}
        className="hidden"
      />
      <button
        className="w-full px-4 py-2 bg-slate-300 hover:bg-slate-400 text-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500 dark:text-white rounded disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
        disabled={loading}
        onClick={click}
        type="button"
      >
        <FaFileUpload />
        {loading ? "Loading..." : "Upload"}
      </button>
    </div>
  );
}
