import Miso from "../miso/Miso";

export function FullPageLoader({ label = "Waking Miso up" }: { label?: string }) {
  return (
    <div className="page-loader" role="status" aria-live="polite">
      <Miso mood="sleepy" size={120} decorative />
      <p>{label}<span className="dots" aria-hidden="true"><i /><i /><i /></span></p>
    </div>
  );
}
