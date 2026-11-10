import type {Stage} from './types';
import {zoom} from './zoom';

/** The site's page transition ("Zoom", picked on 2026-11-04). */
export function createTransition(stage: Stage) {
  return zoom(stage);
}

export type {Stage, Transition} from './types';
