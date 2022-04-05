import { NS } from '@ns'

export enum MessageType {
	normal,
	debugLow,
	debugHigh,
	success,
	info,
	warning,
	fail,
	error
}

export interface ILogConfig {
	type?: MessageType;
	includeTimestamp?: boolean;
	logToTerminal?: boolean;
	sendToast?: boolean;
	consoleLog?: boolean;
}

export class ScriptLogger {
	#ns : NS | undefined;

	loggerCode : string;

	loggerName : string;

	logLevel : number;

	toastSet : boolean

	/**
	 * @param {string} loggerCode Prefix at the beginning of toast messages => [CODE].
	 * @param {string} loggerName Full name of this logger agent.
	 **/
	constructor(ns : NS, loggerCode : string, loggerName : string) {
		this.#ns = ns;
		this.loggerCode = loggerCode.toUpperCase();
		this.loggerName = loggerName;
		this.logLevel = 1;
		this.toastSet = true;

		this.log(`${this.loggerName} script logger started`, { type: MessageType.info });
	}

	setLogLevel(level : number) : void {
		this.logLevel = level;
	}

	disableToasts() : void {
		this.toastSet = false;
	}

	/** Print and toast script logger initialisation complete message.
	 * @param {boolean} toast True if this message should be displayed as a toast.
	 * @param {boolean} terminal True if this message should be displayed on the home terminal.
	 * */
	initialisedMessage(toast : boolean, terminal : boolean) : void {
		this.log(`${this.loggerName} has finished initialising`, {
			type: MessageType.info,
			includeTimestamp: false,
			logToTerminal: terminal,
			sendToast: toast,
			consoleLog: false
		});
	}

	/**
	 * Print a message to the script log, and also execute a toast message if desired.
	 * @param {string} message Message to print.
	 * @param {MessageType} type Type of toast message to display.
	 **/
	log(message : string, config? : ILogConfig) : void {

		// Parse the config parameter supplied
		if (!config) config = {}
		if (!config.type) config.type = MessageType.normal;
		if (!config.includeTimestamp) config.includeTimestamp = true;
		if (!config.logToTerminal) config.logToTerminal = false;
		if (!config.sendToast) config.sendToast = false;
		if (!config.consoleLog) config.consoleLog = false;

		if (this.logLevel === 0) return;
		if (config.type === MessageType.debugLow && this.logLevel < 2) return;
		if (config.type === MessageType.debugHigh && this.logLevel < 3) return;

		let prefix = "";
		let toastType = "";

		switch (config.type) {
			case MessageType.debugLow:
				prefix = "DEBUG";
				toastType = "info";
				//config.consoleLog = true;
				break;
			case MessageType.debugHigh:
				prefix = "DEBUG";
				toastType = "info";
				//config.consoleLog = true;
				break;
			case MessageType.success:
				prefix = "SUCCESS";
				toastType = "success";
				break;
			case MessageType.info:
				prefix = "INFO";
				toastType = "info";
				break;
			case MessageType.warning:
				prefix = "WARNING";
				toastType = "warning";
				break;
			case MessageType.fail:
				prefix = "FAIL";
				toastType = "error";
				break;
			case MessageType.error:
				prefix = "ERROR";
				toastType = "error";
				break;
		}

		if (prefix !== "") prefix = prefix + " ".repeat(7 - prefix.length) + " | ";

		let time = "";

		if (config?.includeTimestamp) {
			const now = new Date(Date.now());
			time = `[${now.toTimeString().substring(0, 8)}] `;
		}

		if (!this.#ns) throw new Error("NS object not defined.");

		this.#ns.print(`${prefix}${time}${message}`);
		if (config.logToTerminal) this.#ns.tprintf(`${prefix}${time}${message}`);
		if (config.sendToast && this.toastSet) this.#ns.toast(`[${this.loggerCode}] ${message}`, toastType);
		if (config.consoleLog) console.log(message);
	}

	/**
	 * Print a message to the script log, and an optional toast, then exit the current script.
	 * @param {string} message Message to print.
	 * @param {MessageType} toastMessage Toast message to display.
	 **/
	async abort(message : string, config? : ILogConfig) : Promise<void> {

		// Parse the config parameter supplied
		if (!config) config = {}
		if (!config.type) config.type = MessageType.error;
		if (!config.includeTimestamp) config.includeTimestamp = true;
		if (!config.logToTerminal) config.logToTerminal = false;
		if (!config.sendToast) config.sendToast = true;
		if (!config.consoleLog) config.consoleLog = false;

		this.log(message, config)

		if (!this.#ns) throw new Error("NS object not defined.");

		this.#ns.tail();
		await this.#ns.asleep(5000);
		this.#ns.exit();
		await this.#ns.asleep(1000);
	}
}
