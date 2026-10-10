/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Coffee, Cpu, Database, FileCode, GitBranch, Globe, HardDrive, Layers, Monitor, Palette, Target, Zap } from 'lucide-react';

/** Icons that data files (career paths, learning tracks) refer to by name, so the data never contains emoji. */
const ICONS: Record<string, React.ElementType> = {
  Coffee,
  Cpu,
  Database,
  FileCode,
  GitBranch,
  Globe,
  HardDrive,
  Layers,
  Monitor,
  Palette,
  Target,
  Zap,
};

/** Renders the named icon; with `fallbackText`, an unknown name (e.g. "W3") is shown as text instead. */
export function NamedIcon({ name, className = 'h-4 w-4', fallbackText = false }: { name: string; className?: string; fallbackText?: boolean }) {
  const Icon = ICONS[name];
  if (Icon) return <Icon className={className} aria-hidden="true" />;
  return fallbackText ? <span aria-hidden="true">{name}</span> : null;
}
