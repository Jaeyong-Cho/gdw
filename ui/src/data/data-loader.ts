/**
 * @fileoverview Data loader for situation guides and flows
 */

import { SituationGuide, SituationFlow } from '../types';

/**
 * @brief Load situation guides from JSON file
 * @return Promise resolving to guides map
 * 
 * @pre None
 * @post Guides are loaded from JSON file
 */
export async function loadSituationGuides(): Promise<Record<string, SituationGuide>> {
  try {
    const response = await fetch('/data/situation-guides.json');
    if (!response.ok) {
      throw new Error(`Failed to load situation guides: ${response.statusText}`);
    }
    const data = await response.json();
    return data as Record<string, SituationGuide>;
  } catch (error) {
    console.error('Error loading situation guides:', error);
    return {};
  }
}

/**
 * @brief Load situation flows from JSON file
 * @return Promise resolving to flows map
 * 
 * @pre None
 * @post Flows are loaded from JSON file
 */
export async function loadSituationFlows(): Promise<Record<string, SituationFlow>> {
  try {
    const response = await fetch('/data/situation-flows.json');
    if (!response.ok) {
      throw new Error(`Failed to load situation flows: ${response.statusText}`);
    }
    const data = await response.json();
    return data as Record<string, SituationFlow>;
  } catch (error) {
    console.error('Error loading situation flows:', error);
    return {};
  }
}

/**
 * @brief Cache for loaded guides
 */
let guidesCache: Record<string, SituationGuide> | null = null;

/**
 * @brief Cache for loaded flows
 */
let flowsCache: Record<string, SituationFlow> | null = null;

/**
 * @brief Get situation guides (cached)
 * @return Promise resolving to guides map
 */
export async function getSituationGuides(): Promise<Record<string, SituationGuide>> {
  if (!guidesCache) {
    guidesCache = await loadSituationGuides();
  }
  return guidesCache;
}

/**
 * @brief Get situation flows (cached)
 * @return Promise resolving to flows map
 */
export async function getSituationFlows(): Promise<Record<string, SituationFlow>> {
  if (!flowsCache) {
    flowsCache = await loadSituationFlows();
  }
  return flowsCache;
}

/**
 * @brief Reload data (clear cache and reload)
 */
export async function reloadData(): Promise<void> {
  guidesCache = null;
  flowsCache = null;
  await Promise.all([getSituationGuides(), getSituationFlows()]);
}
