interface Props {
  status: string;
}

export default function StatusBadge({ status }: Props) {
  const cls = (status ?? '').toLowerCase().replace(/[^a-z_]/g, '_');
  return <span className={`badge ${cls}`}>{status}</span>;
}
