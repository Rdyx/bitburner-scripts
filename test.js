/**
 * @param {NS} ns
 * @param {number} nodesNumber
 */
function getNodesStats(ns, nodesNumber) {
	return Array(nodesNumber)
		.fill(0)
		.map((_, i) => ns.hacknet.getNodeStats(i));
}

function productionPerDollarsSpent(ns, production, dollars) {
	return production / dollars;
}

/**
 *
 * @param {number} level Hacknode Level
 * @param {number} ram Number of RAM
 * @param {number} cores Number of cores
 * @param {number} mult Optionnal, default to 1 - Multiplier
 * @returns number
 */
function calculateMoneyGainRate(level, ram, cores, mult = 1) {
	const gainPerLevel = 1.5;

	const levelMult = level * gainPerLevel;
	const ramMult = Math.pow(1.035, ram - 1);
	const coresMult = (cores + 5) / 6;
	return levelMult * ramMult * coresMult * mult;
}

/** @param {NS} ns */
export async function main(ns) {
	ns.tail();
	const ownedNodesNumber = ns.hacknet.numNodes();

	// This is kinda biaised since I destroyed the base BitNode... It should work the same way still
	const baseLevelProduction = 1.74;
	const baseRAMProduction = 0.061;
	const baseCoreProduction = 0.29;

	const nodesInfo = getNodesStats(ns, ownedNodesNumber);

	const efficientSpendingList = [
		{
			nodeIndex: ownedNodesNumber,
			productionPerDollarsSpent: productionPerDollarsSpent(ns, baseLevelProduction, ns.hacknet.getPurchaseNodeCost()),
			upgradeType: "buy_server",
		},
	];

	ns.print(nodesInfo);

	//for (let i = 0; i < ownedNodesNumber; i++) {
	for (const node of nodesInfo) {
		const nodeIndex = node.name.split("-").pop();

		let nodeObject = {
			nodeIndex: nodeIndex,
			productionPerDollarsSpent: 0,
			updateType: "",
		};

		const levelUpgradeCost = ns.hacknet.getLevelUpgradeCost(nodeIndex);
		const ramUpgradeCost = ns.hacknet.getRamUpgradeCost(nodeIndex);
		const coreProductionCost = ns.hacknet.getCoreUpgradeCost(nodeIndex);

		//gainRate/cost = prod/dollar

		const ramProduction = node.ram * node.level * baseRAMProduction;
		ns.print("ramprod ", nodeIndex, " ", ramProduction);
		ns.print(ns.hacknet.getRamUpgradeCost(0), " ", node.ram * 2);
	}

	// {'nodeIndex': 0, 'nodeProductionIncrease': 0, 'nodeUpgradeType': "buy_server"}

	// let buyNodes = 1;

	// while (buyNodes) {
	//   const buyNodeCost = ns.hacknet.getPurchaseNodeCost();
	//   // Get max of each, don't bother to buy lower upgrade levels (lazy mode on)
	//   const upgradeMaxNodeLevelsCost = 292914755.9116215; // ns.hacknet.getCoreUpgradeCost(n,15)
	//   const upgradeMaxNodeRAMCost = 4247930.409424215; // ns.hacknet.getRamUpgradeCost(n,6)
	//   const upgradeMaxNodeCoresCost = 21335671.049209587; // ns.hacknet.getLevelUpgradeCost(n,199)

	//   const overallBuyPrice = buyNodeCost+upgradeMaxNodeLevelsCost+upgradeMaxNodeRAMCost+upgradeMaxNodeCoresCost;

	//     if (ns.hacknet.numNodes() < maxWantedNodes && overallBuyPrice < ns.getPlayer().money) {
	//       // Buy node and upgrade everything at max
	//       const nodeNumber = ns.hacknet.purchaseNode();
	//       ns.hacknet.upgradeLevel(nodeNumber, 199)
	//       ns.hacknet.upgradeRam(nodeNumber, 6)
	//       ns.hacknet.upgradeCore(nodeNumber, 15)
	//     } else {
	//       buyNodes = 0;
	//     }
	// }
}
