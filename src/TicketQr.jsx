import React, { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

/** Ticket QR for wardens / desk scan — encodes ticket deep-link payload. */
export default function TicketQr({ ticketId, size = 148, label = 'Show this QR at the desk' }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!ticketId || !canvasRef.current) return;
    const payload = JSON.stringify({
      app: 'campus-triage',
      ticketId,
      url: `${window.location.origin}/?ticket=${encodeURIComponent(ticketId)}`,
    });
    QRCode.toCanvas(canvasRef.current, payload, {
      width: size,
      margin: 1,
      color: { dark: '#2a2f4a', light: '#ffffff' },
    }).catch(() => {});
  }, [ticketId, size]);

  if (!ticketId) return null;

  return (
    <div className="ticket-qr">
      <div className="ticket-qr-label">{label}</div>
      <canvas ref={canvasRef} width={size} height={size} aria-label={`QR for ${ticketId}`} />
      <p className="ticket-qr-caption">Scan · {ticketId}</p>
    </div>
  );
}
