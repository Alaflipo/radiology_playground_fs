
import { useState } from "react";
import CornerStoneMaskViewer from "../components/CornerStoneMaskViewer";

type MaskResult = {
  segmentNumber: number;
  segmentLabel: string;
  seriesId: string;
  instanceIds: string[];
};

export default function MaskUpload() {
  const [result, setResult] = useState<MaskResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function upload(file: File) {
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const body = new FormData();
      body.append("file", file);

      const response = await fetch(
        "http://localhost:8000/api/dicom/segmentations/first-mask",
        {
          method: "POST",
          body,
        }
      );

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data: MaskResult = await response.json();
      setResult(data);
    } catch (error) {
      setError(String(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section>
      <h2>Segmentation preview</h2>

      <input
        type="file"
        accept=".dcm"
        disabled={loading}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void upload(file);
        }}
      />

      {loading && <p>Extracting and storing the first segment...</p>}
      {error && <p role="alert">{error}</p>}

      {result && (
        <>
          <h3>{result.segmentLabel}</h3>
          <p>{result.instanceIds.length} mask slices</p>

          <CornerStoneMaskViewer instanceIds={result.instanceIds} />
        </>
      )}
    </section>
  );
}
