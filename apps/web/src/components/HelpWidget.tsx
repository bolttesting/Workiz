"use client";

import { useEffect, useId, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Phone, X } from "lucide-react";

const WHATSAPP_URL =
  "https://wa.me/97143208888?text=" +
  encodeURIComponent("Hi Workiz — I need help with company seats / training.");
const CALL_URL = "tel:+97143208888";

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

export function HelpWidget() {
  const [open, setOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="workiz-help">
      <AnimatePresence>
        {open ? (
          <motion.div
            id={panelId}
            role="dialog"
            aria-label="Need help"
            initial={reduceMotion ? false : { opacity: 0, y: 14, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: 10, scale: 0.96 }}
            transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
            className="workiz-help__panel"
          >
            <div className="workiz-help__header">
              <div className="workiz-help__title-row">
                <span className="workiz-help__live" aria-hidden="true" />
                <div>
                  <p className="workiz-help__title">Need help?</p>
                  <p className="workiz-help__subtitle">We typically reply within minutes</p>
                </div>
              </div>
              <button
                type="button"
                className="workiz-help__close"
                aria-label="Close help"
                onClick={() => setOpen(false)}
              >
                <X size={18} strokeWidth={1.8} />
              </button>
            </div>

            <div className="workiz-help__actions">
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="workiz-help__btn workiz-help__btn--whatsapp"
              >
                <WhatsAppIcon className="workiz-help__btn-icon" />
                WhatsApp
              </a>
              <a href={CALL_URL} className="workiz-help__btn workiz-help__btn--call">
                <Phone size={18} strokeWidth={2.2} aria-hidden="true" />
                Call
              </a>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <motion.button
        type="button"
        className="workiz-help__pill"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        whileHover={reduceMotion ? undefined : { scale: 1.03 }}
        whileTap={reduceMotion ? undefined : { scale: 0.98 }}
      >
        <span className="workiz-help__pill-icon">
          {open ? <X size={20} strokeWidth={2.2} /> : <WhatsAppIcon className="workiz-help__wa" />}
        </span>
        <span className="workiz-help__pill-label">{open ? "Close" : "Need help?"}</span>
      </motion.button>
    </div>
  );
}
