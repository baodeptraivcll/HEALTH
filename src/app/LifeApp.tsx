'use client';
import { useEffect, useRef } from 'react';
import { markup } from '../lib/template';
import { initialize } from '../lib/application';

export default function LifeApp() {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => { if (root.current) return initialize(root.current); }, []);
  // Retain the approved static layout; user content is inserted with textContent.
  return <div ref={root} dangerouslySetInnerHTML={{ __html: markup }} />;
}
