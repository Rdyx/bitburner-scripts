/**
 * @param {NS} ns
 * @param {serverName} string
 */
function getCurrServerSecLvl(ns, serverName) {
	return ns.getServerSecurityLevel(serverName);
}

/**
 * @param {NS} ns
 * @param {serverName} string
 * @param {currServerSecLvl} number
 * @param {serverMinSecLvl} number
 * @param {weakenServerLvlStatus} number
 */
async function weakenServer(ns, serverName, currServerSecLvl, serverMinSecLvl, weakenServerLvlStatus) {
	// 1.5 > 1 && 1.5-1 >= .25
	while (currServerSecLvl > serverMinSecLvl && currServerSecLvl - serverMinSecLvl >= weakenServerLvlStatus) {
		ns.print(`${Math.floor((currServerSecLvl - serverMinSecLvl) / weakenServerLvlStatus)} weaken run(s) remaining.`);
		await ns.weaken(serverName);
		currServerSecLvl = getCurrServerSecLvl(ns, serverName);
	}
}

/**
 * @param {NS} ns
 * @param {serverName} string
 * @param {requiredGrowthRun} number
 */
async function growServer(ns, serverName, requiredGrowthRun) {
	let i = 0;
	while (i < requiredGrowthRun) {
		ns.print(`${requiredGrowthRun - i} grow run(s) required.`);
		await ns.grow(serverName);
		i++;
	}
}

/**
 * Requires 3.10GB RAM
 * @param {NS} ns
 * @param {serverName} string
 * @param {int} targetGrowth
 */
export async function baseLoop(ns, serverName, requiredGrowthRun, serverMinSecLvl) {
	while (1) {
		//const requiredGrowthRun = Math.ceil(ns.growthAnalyze(serverName, targetGrowth));
		//const serverMinSecLvl = ns.getServerMinSecurityLevel(serverName);
		const weakenServerLvlStatus = ns.weakenAnalyze(1);

		let currServerSecLvl = getCurrServerSecLvl(ns, serverName);

		await weakenServer(ns, serverName, currServerSecLvl, serverMinSecLvl, weakenServerLvlStatus);
		await growServer(ns, serverName, requiredGrowthRun);

		await ns.hack(serverName);
	}
}

/**
 * Requires 2.00GB RAM
 * @param {NS} ns
 * @param {serverName} string
 */
export async function lowcostBaseLoop(ns, serverName) {
	while (1) {
		await ns.weaken(serverName);
		await ns.grow(serverName);
		await ns.hack(serverName);
	}
}

/**
 * Requires 1.70GB RAM
 * @param {NS} ns
 * @param {serverName} string
 */
export async function lowcostNoGrowthBaseLoop(ns, serverName) {
	while (1) {
		await ns.hack(serverName);
	}
}
