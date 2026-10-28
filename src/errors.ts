// obsidian を import しないファイルからも使えるように、api.ts から分けている

/** EmDash の API が返すエラー、または通信そのものの失敗 */
export class EmDashError extends Error {
	/** HTTP ステータス。通信できなかったときは 0 */
	status: number;
	/** EmDash のエラーコード（INSUFFICIENT_SCOPE など）。わからなければ空文字 */
	code: string;
	timedOut: boolean;

	constructor(message: string, status: number, code = '', timedOut = false) {
		super(message);
		this.name = 'EmDashError';
		this.status = status;
		this.code = code;
		this.timedOut = timedOut;
	}
}
