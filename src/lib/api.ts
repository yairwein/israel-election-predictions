/** Small fetch wrapper for our JSON API. Throws Error(message) with the server's Hebrew message. */
export async function api<T = unknown>(method: string, url: string, body?: unknown): Promise<T> {
	const res = await fetch(url, {
		method,
		headers: body !== undefined ? { 'content-type': 'application/json' } : undefined,
		body: body !== undefined ? JSON.stringify(body) : undefined,
		credentials: 'same-origin'
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		const err = new Error((data as { message?: string }).message || `שגיאה (${res.status})`) as Error & { code?: string; status?: number };
		err.code = (data as { code?: string }).code;
		err.status = res.status;
		throw err;
	}
	return data as T;
}
