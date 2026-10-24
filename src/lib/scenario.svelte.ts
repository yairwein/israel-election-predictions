import type { ScenarioId } from './parties';

/** One shared choice for where עמך ישראל is counted, used by every toggle on the site. */
export const SCENARIO_LABELS: Record<ScenarioId, string> = {
	with_amcha: 'עמך ישראל בגוש נתניהו',
	without_amcha: 'עמך ישראל לא משוייכת לגוש'
};

export const SCENARIO_ORDER: ScenarioId[] = ['with_amcha', 'without_amcha'];

const KEY = 'scenario';

export const scenario = $state<{ id: ScenarioId }>({ id: 'with_amcha' });

export function setScenario(id: ScenarioId) {
	scenario.id = id;
	try {
		localStorage.setItem(KEY, id);
	} catch {
		/* private mode */
	}
}

export function restoreScenario() {
	try {
		const v = localStorage.getItem(KEY);
		if (v === 'with_amcha' || v === 'without_amcha') scenario.id = v;
	} catch {
		/* private mode */
	}
}
