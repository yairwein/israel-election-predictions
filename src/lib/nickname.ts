const ANIMALS = ['ינשוף', 'צבי', 'שועל', 'נשר', 'דולפין', 'זאב', 'דוב', 'נמר', 'קיפוד', 'שפן', 'דורבן', 'עפרוני', 'אריה', 'צב', 'פלמינגו', 'גמל', 'תוכי', 'סנאי', 'פינגווין', 'ברדלס', 'עורב', 'שחף', 'יען', 'בונה'];
const ADJECTIVES = ['זריז', 'חכם', 'שקט', 'אמיץ', 'סקרן', 'עליז', 'נועז', 'ערני', 'מחושב', 'אופטימי', 'ספקן', 'רגוע', 'חד', 'ממולח', 'צנוע', 'נלהב', 'מפוכח', 'נחוש', 'סבלני', 'מהיר'];

function pick<T>(arr: T[]): T {
	return arr[Math.floor(Math.random() * arr.length)];
}

/** A friendly random Hebrew nickname, e.g. "שועל ממולח 42". */
export function randomNickname(): string {
	return `${pick(ANIMALS)} ${pick(ADJECTIVES)} ${10 + Math.floor(Math.random() * 90)}`;
}
