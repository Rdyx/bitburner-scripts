import { lowcostBaseLoop } from "baseLoop.js";

/** @param {NS} ns */
export async function main(ns) {
  return await lowcostBaseLoop(ns, ns.args[0]);
}
