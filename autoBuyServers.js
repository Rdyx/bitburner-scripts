/** @param {NS} ns */
function findHighestBuyableExponent(ns) {
  let exponent = 1;
  while (ns.getPurchasedServerCost(2 ** exponent) < ns.getPlayer().money) {
    exponent++;
  }
  exponent--;
  return exponent;
}

/**
 * @param {NS} ns
 * @param {Array<Server>} ownedServersList List of owned/purchased servers
 * @param {string} purchasedServersName Optionnal, default to "UwU" - Custom name for purchased servers
 * */
export function autoBuyServers(ns, ownedServersList, purchasedServersName = "UwU") {
  const exponent = findHighestBuyableExponent(ns);
  // Sort owned servers by maxRam ascending
  const ownedServersListSortedByRam = ownedServersList.sort((x, y) => (x.maxRam > y.maxRam ? 1 : -1));
  let buyableServers = Math.floor(ns.getPlayer().money / (110000 * (2 ** exponent / 2)));
  // Max 25 purchased servers
  buyableServers = buyableServers > 25 ? 25 : buyableServers;

  if (buyableServers != 0) {
    // If we have purchased maximum servers, we need to delete one and replace it
    if (ownedServersList.length === 25) {
      ownedServersListSortedByRam.every((server, i) => {
        const serverHostname = server.hostname;

        // If we have bought all servers we could or we have replaced all replacable servers, break
        if (buyableServers === 0 || i === ownedServersList) return 0;

        if (server.maxRam < 2 ** exponent) {
          ns.killall(serverHostname);
          ns.deleteServer(serverHostname);
          ns.purchaseServer(serverHostname, 2 ** exponent);
          buyableServers--;
          return 1;
        }
      });

      // If we have room for other servers, simply buy
    } else {
      while (buyableServers > 0) {
        if (ns.getPurchasedServers().length < 25) {
          ns.purchaseServer(purchasedServersName, 2 ** exponent);
          buyableServers--;
        } else {
          // If we reached max purchased servers cap while buying, restart function
          autoBuyServers(
            ns,
            ns.getPurchasedServers().map((server) => ns.getServer(server)),
            purchasedServersName
          );
        }
      }
    }
  }
}
