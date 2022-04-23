import { baseLoop } from "baseLoop.js";

/** @param {NS} ns */
export async function main(ns) {
	return await baseLoop(ns, ns.args[0], ns.args[1], ns.args[2]);
}
