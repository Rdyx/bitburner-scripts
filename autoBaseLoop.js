import { baseLoop } from "baseLoop.js";

/** @param {NS} ns */
export async function main(ns) {
	const serverName = ns.args[0];
	const requiredGrowthRun = ns.args[1];
	const serverMinSecLvl = ns.args[2];
	const threadsNumber = ns.args[3];
	const coresNumber = ns.args[4];

	return await baseLoop(ns, serverName, requiredGrowthRun, serverMinSecLvl, threadsNumber, coresNumber);
}
