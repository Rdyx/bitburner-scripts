/**
 * @param {NS} ns
 * @param {number} maxWantedNodes Optionnal, default 30 - Maximum hacknet nodes we want to autobuy
 */
export function autoBuyAndUpgradeHacknetNodes(ns, maxWantedNodes = 30) {
  let buyNodes = 1;

  while (buyNodes) {
    const buyNodeCost = ns.hacknet.getPurchaseNodeCost();
    // Get max of each, don't bother to buy lower upgrade levels (lazy mode on)
    const upgradeMaxNodeLevelsCost = 292914755.9116215; // ns.hacknet.getCoreUpgradeCost(n,15)
    const upgradeMaxNodeRAMCost = 4247930.409424215; // ns.hacknet.getRamUpgradeCost(n,6)
    const upgradeMaxNodeCoresCost = 21335671.049209587; // ns.hacknet.getLevelUpgradeCost(n,199)

    const overallBuyPrice = buyNodeCost + upgradeMaxNodeLevelsCost + upgradeMaxNodeRAMCost + upgradeMaxNodeCoresCost;

    if (ns.hacknet.numNodes() < maxWantedNodes && overallBuyPrice < ns.getPlayer().money) {
      // Buy node and upgrade everything at max
      const nodeNumber = ns.hacknet.purchaseNode();
      ns.hacknet.upgradeLevel(nodeNumber, 199);
      ns.hacknet.upgradeRam(nodeNumber, 6);
      ns.hacknet.upgradeCore(nodeNumber, 15);
    } else {
      buyNodes = 0;
    }
  }
}
