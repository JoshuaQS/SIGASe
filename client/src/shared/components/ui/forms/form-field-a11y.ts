export function mergeAriaDescribedBy(...ids: Array<string | undefined | null>): string | undefined {
  const value = ids
    .flatMap((id) => (id ? id.split(/\s+/) : []))
    .map((id) => id.trim())
    .filter(Boolean);

  if (value.length === 0) return undefined;
  return Array.from(new Set(value)).join(' ');
}

export function buildFormFieldA11y({
  generatedBaseId,
  controlId,
  describedBy,
  hasError,
  messageId,
}: {
  generatedBaseId: string;
  controlId?: string;
  describedBy?: string;
  hasError?: boolean;
  messageId?: string;
}) {
  const resolvedControlId = controlId ?? `${generatedBaseId}-control`;
  const resolvedDescribedBy = mergeAriaDescribedBy(describedBy, messageId);

  return {
    controlId: resolvedControlId,
    describedBy: resolvedDescribedBy,
    ariaInvalid: hasError ? true : undefined,
  };
}
