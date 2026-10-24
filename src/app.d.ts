declare global {
	namespace App {
		interface Locals {
			/** internal user id (HMAC of the Google subject), null when signed out */
			uid: string | null;
			/** true when this request is the implicit dev-mode voter (no sign-in) */
			devUser: boolean;
		}
		interface Error {
			message: string;
			code?: string;
		}
	}

	interface Window {
		google?: {
			accounts: {
				id: {
					initialize(config: {
						client_id: string;
						callback: (response: { credential: string }) => void;
						auto_select?: boolean;
						use_fedcm_for_prompt?: boolean;
						itp_support?: boolean;
						context?: string;
						ux_mode?: string;
					}): void;
					renderButton(element: HTMLElement, config: Record<string, unknown>): void;
					prompt(): void;
					disableAutoSelect(): void;
				};
			};
		};
	}
}

export {};
