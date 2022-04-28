import { baseLoop } from "baseLoop.js";

/** @param {NS} ns */
export async function main(ns) {
  const serverName = ns.args[0];
  const growthTarget = ns.args[1];
  const growthRunsCap = ns.args[2];
  const serverMinSecLvl = ns.args[3];
  const threadsNumber = ns.args[4];
  const serverCoresNumber = ns.args[5];

  return await baseLoop(ns, serverName, growthTarget, growthRunsCap, serverMinSecLvl, threadsNumber, serverCoresNumber);
}
