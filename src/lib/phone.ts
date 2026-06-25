export function normalizeDigits(value: string): string {
  return value.replace(/\D/g, '');
}

export function formatVenezuelaPhone(value: string): string {
  const digits = normalizeDigits(value);
  if (!digits) return value;

  if (digits.length <= 3) return digits;

  if (digits.startsWith('0800') && digits.length === 11) {
    return `0800 ${digits.slice(4, 7)} ${digits.slice(7)}`;
  }

  if (digits.startsWith('58') && digits.length > 10) {
    const local = digits.slice(2);
    if (local.length === 10) {
      return `+58 ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
    }
    return `+${digits}`;
  }

  if (digits.startsWith('0') && digits.length === 11) {
    const local = digits.slice(1);
    return `+58 ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
  }

  if (digits.length === 10) {
    return `+58 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  }

  return `+${digits}`;
}

export function toTelHref(value: string): string | undefined {
  const digits = normalizeDigits(value);
  if (!digits) return undefined;

  if (digits.startsWith('0800') && digits.length === 11) {
    return `tel:${digits}`;
  }

  if (digits.startsWith('58')) {
    return `tel:+${digits}`;
  }

  if (digits.startsWith('0') && digits.length >= 10) {
    return `tel:+58${digits.slice(1)}`;
  }

  if (digits.length <= 3) {
    return `tel:${digits}`;
  }

  return `tel:+58${digits}`;
}
