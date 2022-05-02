import { lowcostBaseLoop } from "baseLoops.js";

/** @param {NS} ns */
export async function main(ns) {
  return await lowcostBaseLoop(ns, ns.args[0]);
}
