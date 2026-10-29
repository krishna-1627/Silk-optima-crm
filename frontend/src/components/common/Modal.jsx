import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

function Modal({
  isOpen,
  title,
  description,
  children,
  footer,
  onClose,
  icon,
  width = 'min(95vw, 560px)',
  scrollable = true,
  isLoading = false,
  closeOnOverlayClick = true,
  secondaryAction,
  primaryAction,
  hideCloseButton = false,
  className = '',
  initialFocusRef,
}) {
  const [render, setRender] = useState(isOpen);
  const overlayRef = useRef(null);
  const dialogRef = useRef(null);
  const originalOverflow = useRef(document.body.style.overflow);

  const titleId = useMemo(() => `modal-title-${Math.random().toString(36).slice(2, 10)}` , []);
  const descriptionId = useMemo(() => `modal-description-${Math.random().toString(36).slice(2, 10)}` , []);

  useEffect(() => {
    if (isOpen) setRender(true);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    originalOverflow.current = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow.current || 'auto';
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const dialog = dialogRef.current;
    const focusableSelectors = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const getFocusableElements = () =>
      dialog
        ? Array.from(dialog.querySelectorAll(focusableSelectors)).filter(
            (element) => !element.hasAttribute('disabled') && element.getAttribute('aria-hidden') !== 'true',
          )
        : [];
    const focusableElements = getFocusableElements();

    if (initialFocusRef?.current) {
      initialFocusRef.current.focus();
    } else if (focusableElements.length > 0) {
      const preferredElement = focusableElements.find((element) =>
        ['INPUT', 'SELECT', 'TEXTAREA'].includes(element.tagName),
      );
      (preferredElement || focusableElements[0]).focus();
    } else {
      dialog?.focus();
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose?.();
      }

      if (event.key === 'Tab' && focusableElements.length > 0) {
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.shiftKey && document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        } else if (!event.shiftKey && document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    let timeout;
    if (!isOpen && render) {
      timeout = window.setTimeout(() => setRender(false), 250);
    }

    return () => {
      if (timeout) window.clearTimeout(timeout);
    };
  }, [isOpen, render]);

  if (!render) return null;

  const handleOverlayClick = (event) => {
    if (!closeOnOverlayClick) return;
    if (event.target === overlayRef.current) onClose?.();
  };

  const renderFooter = footer ?? (
    <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
      {secondaryAction && (
        <button
          type="button"
          onClick={secondaryAction.onClick}
          disabled={secondaryAction.disabled || isLoading}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {secondaryAction.label}
        </button>
      )}
      {primaryAction && (
        <button
          type="button"
          onClick={primaryAction.onClick}
          disabled={primaryAction.disabled || isLoading}
          className={`rounded-xl px-4 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
            primaryAction.variant === 'secondary'
              ? 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
              : 'bg-cyan-600 text-white hover:bg-cyan-700'
          }`}
        >
          {primaryAction.loading || isLoading ? primaryAction.loadingLabel || 'Loading...' : primaryAction.label}
        </button>
      )}
    </div>
  );

  return createPortal(
    <div
      ref={overlayRef}
      className={`fixed inset-0 z-[99999] flex items-center justify-center bg-black/45 backdrop-blur-sm px-4 py-6 transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      style={{ transitionDuration: '250ms' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? titleId : undefined}
      aria-describedby={description ? descriptionId : undefined}
      onMouseDown={handleOverlayClick}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className={`relative w-full max-w-[calc(100vw-1.5rem)] ${className}`}
        style={{
          maxWidth: width,
          transition: 'transform 250ms ease-out, opacity 250ms ease-out',
          transform: isOpen ? 'translateY(0) scale(1)' : 'translateY(8px) scale(0.95)',
          opacity: isOpen ? 1 : 0,
        }}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="max-h-[calc(100dvh-1.5rem)] overflow-hidden rounded-[28px] bg-white p-4 shadow-2xl sm:p-8">
          <div className="flex items-start gap-4">
            <div className="min-w-0">
              {icon && <div className="mb-4">{icon}</div>}
              {title && (
                <h2 id={titleId} className="text-xl font-semibold text-slate-900">
                  {title}
                </h2>
              )}
              {description && (
                <p id={descriptionId} className="mt-2 text-sm leading-6 text-slate-600">
                  {description}
                </p>
              )}
            </div>
          </div>

          <div className={`mt-6 ${scrollable ? 'max-h-[min(70dvh,32rem)] overflow-y-auto pr-1' : ''}`}>{children}</div>

          {renderFooter && <div className="mt-6">{renderFooter}</div>}

          {!hideCloseButton && (
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 rounded-full border border-slate-200 bg-slate-100 p-2 text-slate-600 transition hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-400"
              aria-label="Close dialog"
            >
              ✕
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default Modal;
