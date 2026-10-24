<script lang="ts">
	import { PARTIES } from '$lib/parties';
	let { data } = $props();
	const lock = $derived(new Intl.DateTimeFormat('he-IL', { timeZone: 'Asia/Jerusalem', dateStyle: 'full', timeStyle: 'short' }).format(new Date(data.config.lockAt)));
	const coalition = PARTIES.filter((p) => p.bloc === 'coalition').map((p) => p.he).join(', ');
	const opposition = PARTIES.filter((p) => p.bloc === 'opposition').map((p) => p.he).join(', ');
	const arab = PARTIES.filter((p) => p.bloc === 'arab').map((p) => p.he).join(', ');
</script>

<svelte:head><title>איך זה עובד · תחזית הבחירות 2026</title></svelte:head>

<div class="container prose">
	<h1>איך זה עובד</h1>

	<div class="card">
		<h2>התחזית</h2>
		<p>כל משתתף מחלק 120 מנדטים. מפלגה שעוברת את אחוז החסימה (3.25%) מקבלת לפחות 4 מנדטים. אפשר גם לנחש את אחוז ההצבעה.</p>
		<p>אפשר לעדכן את התחזית כמה פעמים שרוצים עד <b>{lock}</b>, 24 שעות לפני פתיחת הקלפיות. כל גרסה נשמרת, ובמודל נספרת רק האחרונה.</p>
	</div>

	<div class="card">
		<h2>פרטיות</h2>
		<p>ההתחברות עם Google נועדה למנוע הצבעות בוטים, כך שלכל אדם תהיה תחזית אחת. כתובת המייל נשמרת בשרת ולא יעשה בה שום שימוש. בכל מקום באתר מופיע רק הכינוי, שבוחרים בעצמכם או מקבלים באקראי.</p>
	</div>

	<div class="card">
		<h2>המודל</h2>
		<ul>
			<li><b>מנדטים לכל מפלגה:</b> ממוצע כל התחזיות, ± טעות התקן של הממוצע ברמת ביטחון 95% (1.96·σ/√n). הטווח הבהיר הוא האחוזון ה-10 עד ה-90 של התחזיות.</li>
			<li><b>הכנסת לפי ממוצע התחזיות:</b> הממוצעים מעוגלים לכנסת של 120 בשיטת השארית הגדולה; מפלגה שממוצעה מתחת ל-3.9 מנדטים לא נכנסת.</li>
			<li><b>הסיכוי לגוש:</b> שיעור התחזיות שבהן הגוש מגיע ל-61 ומעלה, עם רווח סמך 95% (Wilson). שלוש האפשרויות זרות זו לזו ומסתכמות ל-100%.</li>
			<li><b>אחוז הצבעה:</b> ממוצע מי שמילא, ± טעות 95%.</li>
		</ul>
		<p>זה לא סקר: המשתתפים לא מדגם מייצג. זו "חוכמת ההמונים" של מי שבחר להשתתף.</p>
	</div>

	<div class="card">
		<h2>הגושים</h2>
		<ul>
			<li><b>גוש נתניהו:</b> {coalition}. מוצג בשתי גרסאות: "עמך ישראל בגוש נתניהו" ו"עמך ישראל לא משוייכת לגוש".</li>
			<li><b>גוש האופוזיציה:</b> {opposition}.</li>
			<li><b>מפלגות ערביות</b> (לא נספרות באף גוש): {arab}.</li>
			<li><b>עמך ישראל:</b> כשהיא לא משוייכת לגוש, היא נספרת בנפרד, כמו המפלגות הערביות, ולא באופוזיציה.</li>
			<li><b>אין 61:</b> אף אחד משני הגושים לא מגיע ל-61 בלי שיתוף פעולה עם מפלגה ערבית (וכשעמך ישראל לא משוייכת לגוש, גם בלי עמך ישראל).</li>
		</ul>
	</div>
</div>

<style>
	.prose { max-width: 760px; padding-top: 32px; display: flex; flex-direction: column; gap: 16px; }
	h1 { font-size: 2.1rem; font-weight: 800; }
	h2 { font-size: 1.2rem; font-weight: 700; margin-bottom: 8px; }
	p, li { color: var(--muted); }
	p:last-child { margin-bottom: 0; }
	ul { padding-inline-start: 20px; margin: 0; display: flex; flex-direction: column; gap: 6px; }
	b { color: var(--text); }
</style>
