import { Button } from "@chakra-ui/react";
import { ChangeEvent, ReactElement, useRef } from "react";
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
        accept="image/svg+xml"
        onChange={onChange}
        className="hidden"
      />
      <Button
        className="w-full"
        isLoading={loading}
        onClick={click}
        leftIcon={<FaFileUpload />}
      >
        Upload
      </Button>
    </div>
  );
}
