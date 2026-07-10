export default function StatusBadge({ status }: { status: string }) {
  const cls = status === 'completed' ? 'pass' : status === 'running' ? 'running' : 'fail';
  return <span className={`badge ${cls}`}>{status}</span>;
}
