'use client';

import { useEffect, useRef } from 'react';

export default function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const blobRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cursor = cursorRef.current;
    const blob = blobRef.current;
    if (!cursor || !blob) return;

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let blobX = mouseX;
    let blobY = mouseY;
    let rafId: number;

    const onMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      cursor.style.left = mouseX + 'px';
      cursor.style.top = mouseY + 'px';
    };

    const onDown = () => cursor.classList.add('clicking');
    const onUp = () => cursor.classList.remove('clicking');

    const onEnter = () => cursor.classList.add('hover');
    const onLeave = () => cursor.classList.remove('hover');

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('mouseup', onUp);

    const targets = () => document.querySelectorAll('a, button, [role="button"], input, textarea, select, label');

    const attachHover = () => {
      targets().forEach(el => {
        el.addEventListener('mouseenter', onEnter);
        el.addEventListener('mouseleave', onLeave);
      });
    };

    attachHover();

    // Re-attach on DOM changes (route changes add new buttons)
    const observer = new MutationObserver(attachHover);
    observer.observe(document.body, { childList: true, subtree: true });

    // Blob follows with lag
    const animateBlob = () => {
      blobX += (mouseX - blobX) * 0.07;
      blobY += (mouseY - blobY) * 0.07;
      blob.style.transform = `translate(${blobX - 240}px, ${blobY - 240}px)`;
      rafId = requestAnimationFrame(animateBlob);
    };
    animateBlob();

    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('mouseup', onUp);
      observer.disconnect();
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <>
      <div ref={cursorRef} className="nexora-cursor" aria-hidden="true" />
      <div ref={blobRef} className="blur-blob" aria-hidden="true" />
    </>
  );
}
