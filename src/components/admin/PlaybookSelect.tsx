import { DEFAULT_PLAYBOOK_ID, listPlaybooks } from "@/lib/build/playbook-registry";

type PlaybookSelectProps = {
  name?: string;
  defaultValue?: string;
  className?: string;
};

export function PlaybookSelect({
  name = "playbook_id",
  defaultValue = DEFAULT_PLAYBOOK_ID,
  className = "field-input",
}: PlaybookSelectProps) {
  const playbooks = listPlaybooks();

  return (
    <select name={name} defaultValue={defaultValue} className={className}>
      {playbooks.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name} ({p.state}) — {p.phaseCount} phases, {p.taskCount} tasks
        </option>
      ))}
    </select>
  );
}
