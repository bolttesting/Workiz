export type PublicContact = {
  whatsapp: string;
  phone: string;
  emails: string[];
  address: string;
};

export const CONTACT_DEFAULTS: PublicContact = {
  whatsapp: "+971 4 320 8888",
  phone: "+971 4 320 8888",
  emails: ["hello@workiz.com"],
  address: "Workiz Support Solutions - FZCO, Dubai Silicon Oasis, Dubai, United Arab Emirates",
};

export function whatsappHref(number: string) {
  const digits = number.replace(/\D/g, "");
  if (digits.length < 7) return null;
  const text = encodeURIComponent("Hi Workiz — I need help with company seats / training.");
  return `https://wa.me/${digits}?text=${text}`;
}

export function telHref(number: string) {
  const cleaned = number.replace(/[^\d+]/g, "");
  if (cleaned.replace(/\D/g, "").length < 7) return null;
  return `tel:${cleaned}`;
}

export async function fetchPublicContact(): Promise<PublicContact> {
  try {
    const api = process.env.NEXT_PUBLIC_API_URL || process.env.API_INTERNAL_URL || "http://localhost:4000";
    const res = await fetch(`${api}/contact`, { cache: "no-store" });
    if (!res.ok) return CONTACT_DEFAULTS;
    const json = (await res.json()) as { contact?: Partial<PublicContact> };
    const contact = json.contact ?? {};
    return {
      whatsapp: contact.whatsapp ?? CONTACT_DEFAULTS.whatsapp,
      phone: contact.phone ?? CONTACT_DEFAULTS.phone,
      emails: Array.isArray(contact.emails) ? contact.emails : CONTACT_DEFAULTS.emails,
      address: contact.address ?? CONTACT_DEFAULTS.address,
    };
  } catch {
    return CONTACT_DEFAULTS;
  }
}
