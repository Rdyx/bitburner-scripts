/**
 * @param {NS} ns
 * @param {number} playerHackLevel Current player hack level
 * @param {Server} server Server info
 */
export function tryNukeServer(ns, playerHackLevel, server) {
  const serverRequiredHackLevel = server.requiredHackingSkill;
  const serverNumOpenPortsRequired = server.numOpenPortsRequired;
  const serverHostname = server.hostname;

  let serverOpenPortCount = server.openPortCount;

  // If player doesn't have required hack level, no need to go further
  // Due to game design, we can also determine if a server has been hacked by
  // its current number of ports opened (default to 0)
  if (
    playerHackLevel < serverRequiredHackLevel ||
    (serverOpenPortCount >= serverNumOpenPortsRequired && serverNumOpenPortsRequired !== 0)
  )
    return;

  // Try to hack each port
  if (!server.sshPortOpen && ns.fileExists("BruteSSH.exe", "home")) ns.brutessh(serverHostname), serverOpenPortCount++;
  if (!server.smtpPortOpen && ns.fileExists("relaySMTP.exe", "home"))
    ns.relaysmtp(serverHostname), serverOpenPortCount++;
  if (!server.sqlPortOpen && ns.fileExists("SQLInject.exe", "home"))
    ns.sqlinject(serverHostname), serverOpenPortCount++;
  if (!server.httpPortOpen && ns.fileExists("HTTPWorm.exe", "home")) ns.httpworm(serverHostname), serverOpenPortCount++;
  if (!server.ftpPortOpen && ns.fileExists("FTPCrack.exe", "home")) ns.ftpcrack(serverHostname), serverOpenPortCount++;

  // If we have opened enough ports, nuke the server
  return serverOpenPortCount >= serverNumOpenPortsRequired
    ? (ns.nuke(serverHostname), (server.hasAdminRights = true))
    : ns.print(`Can't hack ${serverHostname} for now...`);
}

/** @param {NS} ns */
export function main(ns) {
  tryNukeServer(ns, ns.getHackingLevel(), ns.getServer(ns.args[0]));
}
