// TODO: Handle cores number (in baseLoop.js)
// TODO: find a way to get most profitable servers and hack them in priority
// TODO: Create another loop to restart script automatically, so it can discover new
//    servers to hack without manual restart

/*
Basically, this script starts from 'home'. It list scan-analyze servers in range 1
then copy and start hacking servers between each other then propagate to other servers
in the current server's scan-analyze with range 1. This way you can reach any server and
hack it from home.

i.e:
 - Start from home
 - scan-alanyze
 - find 'n00dles' server
 - store 'n00dles' to HACKABLE_SERVERS_LIST
 - get n00dles server info
 - NUKE.exe it (open ports if required)
 - Copy scripts onto it
 - For each hackable server in HACKABLE_SERVERS_LIST, start weaken/grow/hack loop
	 (Note that a server can hack himself)
 - Fullfill the ram
 - Repeat from first step but directly from 'n00dles' server and so on...
*/

// List of required scripts
const SCRIPTS_LIST = ["autoBaseLoop.js", "autoLowcostBaseLoop.js", "baseLoop.js"];
// Main hack script to "hard" hack
const HACK_SCRIPT_NAME = "autoBaseLoop.js";
// Low cost hack script to fullfill remaining RAM
const LOWCOST_HACK_SCRIPT_NAME = "autoLowcostBaseLoop.js";
// List of hacked servers to avoid loops within recursivity
const HACKED_SERVERS_LIST = [];
// List of hackable servers (multi-scope + editable => var)
var HACKABLE_SERVERS_LIST = [];
// Growth target
const TARGET_GROWTH = 1.2;

/**
 * @param {NS} ns
 * @param {server} string
 * @param {playerHackLevel} number
 * @param {serversList} Array<string>
 * @param {targetGrowth} number
 */
async function execOnscannedServer(
	ns,
	server,
	playerHackLevel,
	serversList,
	targetGrowth,
	scriptRAMUsage,
	lowcostScriptRAMUsage
) {
	// First of all, clear server's running scripts
	ns.killall(server);

	/* ns.getServer() = {
		"cpuCores": 1,
		"ftpPortOpen": false,
		"hasAdminRights": true,
		"hostname": "n00dles",
		"httpPortOpen": false,
		"ip": "20.5.8.1",
		"isConnectedTo": false,
		"maxRam": 4,
		"organizationName": "Noodle Bar",
		"ramUsed": 4,
		"smtpPortOpen": false,
		"sqlPortOpen": false,
		"sshPortOpen": true,
		"purchasedByPlayer": false,
		"backdoorInstalled": false,
		"baseDifficulty": 1,
		"hackDifficulty": 1.004,
		"minDifficulty": 1, => ns.getServerMinSecurityLevel()
		"moneyAvailable": 1750000,
		"moneyMax": 1750000,
		"numOpenPortsRequired": 0,
		"openPortCount": 1,
		"requiredHackingSkill": 1,
		"serverGrowth": 3000
	} */
	const serverInfo = ns.getServer(server);
	const serverCoresNumber = serverInfo.cpuCores;
	const serverRequiredHackLevel = serverInfo.requiredHackingSkill;
	const serverMaxRAM = serverInfo.maxRam;
	const serverNumOpenPortsRequired = serverInfo.numOpenPortsRequired;
	const serverPurchasedByPlayer = serverInfo.purchasedByPlayer;

	// 64 / (3*10) => 2 threads for all scripts
	// 16 / (3*10) => 1 thread max, all scripts wont run at max cost
	const threadsToUse = Math.floor(serverMaxRAM / (scriptRAMUsage * serversList.length)) + 1 || 1;

	let serverOpenPortCount = serverInfo.openPortCount;

	// If we have enough hack level to hack the server
	if (playerHackLevel >= serverRequiredHackLevel) {
		// If server quires ports to be opened, open as much as possible (we don't care about opening only specific number)
		if (serverNumOpenPortsRequired > serverOpenPortCount) {
			// Check if we got port opening .exe, if yes, execute corresponding port-opening command
			if (!serverInfo.sshPortOpen && ns.fileExists("BruteSSH.exe", "home")) ns.brutessh(server), serverOpenPortCount++;
			if (!serverInfo.smtpPortOpen && ns.fileExists("relaySMTP.exe", "home"))
				ns.relaysmtp(server), serverOpenPortCount++;
			if (!serverInfo.sqlPortOpen && ns.fileExists("SQLInject.exe", "home"))
				ns.sqlinject(server), serverOpenPortCount++;
			if (!serverInfo.httpPortOpen && ns.fileExists("HTTPWorm.exe", "home")) ns.httpworm(server), serverOpenPortCount++;
			if (!serverInfo.ftpPortOpen && ns.fileExists("FTPCrack.exe", "home")) ns.ftpcrack(server), serverOpenPortCount++;
		}

		// If not enough ports are opened and server is not player's owned, shutdown script, no need to go further
		if (serverNumOpenPortsRequired > serverOpenPortCount && !serverPurchasedByPlayer)
			return ns.print("Can't hack server for now, stopping...");

		// Auto-NUKE.exe
		ns.nuke(server);

		// Auto-copy required scripts
		for (const script of SCRIPTS_LIST) {
			await ns.scp(script, server);
		}

		// Auto-launch scripts to hack each other server, we are using .every() to be able
		// To prematurely shutdown the loop (forEach doesn't support "break" keywork)
		// Any "false" will break the .every() loop
		serversList.every(async (serverTarget) => {
			// Can't execute hack methods if target has not been nuked
			if (!ns.hasRootAccess(serverTarget)) return 0;

			const serverRAMAvailable = serverMaxRAM - ns.getServerUsedRam(server);
			const targetRequiredGrowthRun = Math.ceil(ns.growthAnalyze(serverTarget, targetGrowth, serverCoresNumber));
			const targetMinSecLvl = ns.getServerMinSecurityLevel(serverTarget);

			// Launch big only if it's possible to start it at least N-Threads+1 more.
			// Else, prefer to fullfill with lowcost scripts
			// i.e: 7 >= 3.1*2
			if (serverRAMAvailable >= scriptRAMUsage * threadsToUse + 1) {
				ns.print(serversList.length);
				return ns.exec(
					HACK_SCRIPT_NAME,
					server,
					threadsToUse,
					serverTarget,
					targetRequiredGrowthRun,
					targetMinSecLvl,
					threadsToUse,
					serverCoresNumber
				);
			} else if (serverRAMAvailable >= lowcostScriptRAMUsage) {
				return ns.exec(LOWCOST_HACK_SCRIPT_NAME, server, 1, serverTarget);
			} else {
				// Not enough RAM for anything, breaking loop.
				return 0;
			}
		});
	}
}

/**
 * @param {NS} ns
 * @param {scannedServer} string
 * @param {start} boolean
 */
export async function main(ns, scannedServer = "home", start = true) {
	// Small wait to avoid while(1) crash (Killable script)
	await ns.sleep(100);
	// Home + All purchased servers
	const ownedServersList = ["home"].concat(ns.getPurchasedServers());
	const serversList = ns.scan(scannedServer).filter((server) => {
		return !ownedServersList.includes(server) && ns.hasRootAccess(server);
	});
	const playerHackLevel = ns.getHackingLevel();
	const scriptRAMUsage = ns.getScriptRam(HACK_SCRIPT_NAME);
	const lowcostScriptRAMUsage = ns.getScriptRam(LOWCOST_HACK_SCRIPT_NAME);

	// Make a general hackable servers list to try to hack maximum servers between each others
	HACKABLE_SERVERS_LIST = [...new Set(HACKABLE_SERVERS_LIST.concat(serversList))];
	// Once a server has been hack, store it in a "already hacked servers list"
	HACKED_SERVERS_LIST.push(scannedServer);

	// It seems constants are saved between script runs, make sure to reset it when we manually start it
	if (scannedServer === "home" && start) {
		HACKED_SERVERS_LIST.length = 0;
	}

	// For each hackable server
	for (const server of HACKABLE_SERVERS_LIST) {
		//ns.print(`=============== HACKING ${server} FROM ${scannedServer}`)

		// Don't start script on an already hacked server, it's useless
		// Avoid loop between servers on scan-analyze N+X
		if (!HACKED_SERVERS_LIST.includes(server)) {
			await execOnscannedServer(
				ns,
				server,
				playerHackLevel,
				HACKABLE_SERVERS_LIST,
				TARGET_GROWTH,
				scriptRAMUsage,
				lowcostScriptRAMUsage
			);

			// Recursivity to hack scan-analyze N+X servers
			await main(ns, server, false);
		}
	}

	// Due to async calls, we can increment HACKABLE_SERVERS_LIST and when all other servers are hacked,
	// Start hacking as much servers as possible from our purchased servers
	if (scannedServer === "home" && start) {
		for (const ownedServer of ownedServersList.slice(1)) {
			await execOnscannedServer(
				ns,
				ownedServer,
				playerHackLevel,
				HACKABLE_SERVERS_LIST,
				TARGET_GROWTH,
				scriptRAMUsage,
				lowcostScriptRAMUsage
			);
		}
	}
}
