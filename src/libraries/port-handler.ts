import { NS } from '@ns'

export enum PortNumber {
	CodingContractSolution = 1,
	HackModeSwap,
	DecommisionServerRequest,
	DecommisionServerConfirm,
	HackTargetInfoRequest,
	HackTargetInfoResponse,
	StockWorth,
	StockSellFlag,
	StockData,
	HacknetData,
	CorpData,
	SleeveData,
	BladeburnerData,
	GangData,
	ScriptExecutionRequest,
	ScriptExecutionRequestBulk,
	ScriptExecutionResponse,
	ScriptExecutionResponseBulk
}

/**
 * Given a port number, peek the contents queued. If empty, return null.
 * @param ns NS object parameter.
 * @param port Port to peek.
 */
export function peekPort<T>(ns : NS, port : number) : T | undefined
export function peekPort<T>(ns : NS, port : PortNumber) : T | undefined
export function peekPort<T>(ns : NS, port : PortNumber | number) : T | undefined {
    const data = ns.peek(port);
    return data === "NULL PORT DATA" ? undefined : JSON.parse(data) as T;
}

/**
 * Given a port number, read the next data item queued.
 * @param ns NS object parameter.
 * @param port Port to read data from.
 */
export async function readFromPort<T>(ns : NS, port : number) : Promise<T>
export async function readFromPort<T>(ns : NS, port : PortNumber) : Promise<T>
export async function readFromPort<T>(ns : NS, port : PortNumber | number) : Promise<T> {
    while (ns.peek(port) === "NULL PORT DATA") { await ns.asleep(500); }
    return JSON.parse(ns.readPort(port)) as T;
}

/**
 * Given a port number, try to write the given data into the queue.
 * @param ns NS object parameter.
 * @param port Port to write data to.
 */
export async function writeToPort<T>(ns : NS, port : number, data : T) : Promise<void>
export async function writeToPort<T>(ns : NS, port : PortNumber, data : T) : Promise<void>
export async function writeToPort<T>(ns : NS, port : PortNumber | number, data : T) : Promise<void> {
    const dataStr = JSON.stringify(data);
    while (!await ns.tryWritePort(port, dataStr)) { await ns.asleep(500); }
}

/**
 * Given a port number, purge all existing data queued.
 * @param ns NS object parameter.
 * @param port Port to purge.
 */
export function purgePort(ns : NS, port : number) : void
export function purgePort(ns : NS, port : PortNumber) : void
export function purgePort(ns : NS, port : PortNumber | number) : void {
    ns.clearPort(port);
}
