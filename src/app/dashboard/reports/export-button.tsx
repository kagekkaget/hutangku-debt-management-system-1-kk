"use client";

import { Button } from "@/components/ui";

export function ExportButton({ csv, filename }: { csv: string; filename: string }) {
  function download() {
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <Button variant="secondary" onClick={download}>
      ⬇ Ekspor CSV
    </Button>
  );
}
