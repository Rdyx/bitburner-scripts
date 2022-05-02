import { baseLoop } from "baseLoops.js";

/** @param {NS} ns */
export async function main(ns) {
  const serverName = ns.args[0];
  const serverMinSecLvl = ns.args[1];
  const threadsNumber = ns.args[2];
  const serverCoresNumber = ns.args[3];

  return await baseLoop(ns, serverName, serverMinSecLvl, threadsNumber, serverCoresNumber);
}
