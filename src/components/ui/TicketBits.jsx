import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Clock } from 'lucide-react';
import { ownerForDepartment } from '../../deptDirectory';

export function AnimatedCount({ value, enabled = true }) {
  const [display, setDisplay] = useState(value);
  const frameRef = useRef(null);

  useEffect(() => {
    if (!enabled || typeof value !== 'number') {
      setDisplay(value);
      return undefined;
    }
    const from = typeof display === 'number' ? display : 0;
    const start = performance.now();
    const duration = 480;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      setDisplay(Math.round(from + (value - from) * eased));
      if (t < 1) frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, enabled]);

  return <>{display}</>;
}

export function SlaTimer({ ticket, now }) {
  const timeRemaining = (ticket.escalatedAt + ticket.slaDuration) - now;
  if (timeRemaining <= 0) {
    return (
      <span className="font-bold text-rose-400 animate-pulse flex items-center gap-1">
        <AlertTriangle size={12} /> BREACHED
      </span>
    );
  }

  const totalSeconds = Math.floor(timeRemaining / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const formattedTime = [hours, minutes, seconds].map((n) => n.toString().padStart(2, '0')).join(':');
  const isCritical = timeRemaining < 600000;

  return (
    <span className={`font-mono font-bold flex items-center gap-1 ${isCritical ? 'text-amber-500 animate-pulse' : 'text-zinc-400'}`}>
      <Clock size={11} /> {formattedTime}
    </span>
  );
}

export function OwnerContactCard({ ticket }) {
  const owner = ownerForDepartment(ticket.department);
  const name = ticket.contact?.name || owner.name;
  const title = ticket.contact?.title || owner.title;
  const phone = ticket.contact?.phone || owner.phone;
  const email = ticket.contact?.email || owner.email;

  return (
    <div className="contact-card">
      <strong>{name}</strong>
      <div style={{ color: 'var(--muted)' }}>{title} · {ticket.department}</div>
      <div style={{ color: 'var(--ink)', marginTop: '0.35rem' }}>{phone} · {email}</div>
    </div>
  );
}
