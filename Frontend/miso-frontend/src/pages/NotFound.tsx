import { ButtonLink } from "../components/ui/Button";
import { StatePanel } from "../components/ui/StatePanel";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

export default function NotFound() {
  useDocumentTitle("Page not found");
  return (
    <main className="page-center page-center--full">
      <StatePanel mood="sleepy" title="This page wandered off" size={170} actions={<ButtonLink to="/">Back to Miso</ButtonLink>}>
        <p>Cats do that. The link may be old or mistyped.</p>
      </StatePanel>
    </main>
  );
}
