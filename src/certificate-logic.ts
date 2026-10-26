export type CertificateVariant = "one-year" | "short" | "long-one-digit" | "long-two-digits";

export function normalizeCertificateYears(value: number) {
  if (!Number.isFinite(value)) return 1;
  return Math.min(99, Math.max(1, Math.trunc(value)));
}

export function getCertificateVariant(value: number): CertificateVariant {
  const years = normalizeCertificateYears(value);
  if (years === 1) return "one-year";
  if (years < 4) return "short";
  if (years < 10) return "long-one-digit";
  return "long-two-digits";
}

export function certificateUsesLongStandingWording(value: number) {
  return normalizeCertificateYears(value) >= 4;
}

export function certificateYearLabel(value: number) {
  return normalizeCertificateYears(value) === 1 ? "Jahr" : "Jahre";
}
