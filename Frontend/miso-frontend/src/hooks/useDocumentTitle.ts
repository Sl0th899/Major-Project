import { useEffect } from "react";

export function useDocumentTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} | Miso` : "Miso, a cat therapist";
  }, [title]);
}
