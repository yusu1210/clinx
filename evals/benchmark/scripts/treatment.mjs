export function treatmentPrompt(arm) {
  if (!['baseline', 'skill', 'skill-cli'].includes(arm)) throw new Error('Invalid benchmark arm');
  return arm === 'baseline'
    ? ''
    : arm === 'skill'
      ? '\nRead `.benchmark/clinx-delivery/SKILL.md` and only the references that are relevant to the next action.\n'
      : '\nRead `.benchmark/clinx-delivery/SKILL.md` and only relevant references. The reviewed clinx CLI is available at `.benchmark/bin/clinx`; use it only when it materially helps this task, not because it is present.\n';
}
