const Decimal  = require('decimal.js');
const { sellConfig, commissionConfig } = require('./controllers/config-loader') // Import loaded configs

function UserCanSellCoin(parentAmount, childAmount, parentLevel, pointBalance) {
    console.log("functionsfunctionsfunctionsfunctionsfunctions",parentAmount,childAmount,parentLevel,pointBalance)
  if (parentLevel === 1) {
    const decimalChildAmount = new Decimal(childAmount || 0);
    const decimalParentAmount = new Decimal(parentAmount || 0);
    const decimalPointBalance = new Decimal(pointBalance || 0);

    if (decimalChildAmount.isZero() || decimalParentAmount.isZero()) {
      return { amount: 0, coins: 0 };
    }

    let maximumSellAmount = new Decimal(0);
    const systemBuyOneCoin = new Decimal(sellConfig.systemBuyOneCoin || 22); // Default to 22 if not in config
    let youCanSellWith = new Decimal(0);
    let tierFound = false;

    if (sellConfig.sellTiers) { // Check if sellTiers config exists
      for (const tier of sellConfig.sellTiers) {
        const parentRange = tier.parentAmountRange;
        const childRange = tier.childAmountRange;

        const parentAmountInRange = decimalParentAmount.gte(parentRange.min) && (parentRange.max === null || decimalParentAmount.lt(parentRange.max));
        const childAmountInRange = decimalChildAmount.gte(childRange.min) && (childRange.max === null || decimalChildAmount.lt(childRange.max));

        if (parentAmountInRange && childAmountInRange) {
          maximumSellAmount = decimalChildAmount.mul(tier.maximumSellAmountMultiplier);
          youCanSellWith = new Decimal(tier.youCanSellWith);
          if (tier.multiplierAdjustment) {
            maximumSellAmount = maximumSellAmount.mul(tier.multiplierAdjustment);
          }
          tierFound = true;
          break;
        }
      }
    }

    if (!tierFound) {
      return { amount: 0, coins: 0 };
    }

    const userCanSellNumberOfCoin = maximumSellAmount.div(systemBuyOneCoin).floor();

    if (userCanSellNumberOfCoin.gt(decimalPointBalance)) {
      return {
        amount: decimalPointBalance.mul(youCanSellWith).toNumber(),
        coins: decimalPointBalance.toNumber()
      };
    } else {
      return {
        amount: userCanSellNumberOfCoin.mul(youCanSellWith).toNumber(),
        coins: userCanSellNumberOfCoin.toNumber()
      };
    }
  } else {
    return { amount: 0, coins: 0 };
  }
}

function calculateCommission(X, Y, parentLevel) {


  if (parentLevel < 1 || parentLevel > 3) {
    return null;
  }

  const levelConfig = commissionConfig.commissionTiers?.[parentLevel.toString()]; // Optional chaining for safety
  if (!levelConfig) {
    return null;
  }

  let baseRate, bonusRate;

  let selectedParentAmountTier = null;
  if (levelConfig.parentAmountTiers) { // Check if parentAmountTiers config exists
    for (const parentAmountTier of levelConfig.parentAmountTiers) {
      const minParentAmount = new Decimal(parentAmountTier.minParentAmount);
      const maxParentAmount = parentAmountTier.maxParentAmount === null ? null : new Decimal(parentAmountTier.maxParentAmount);
      const decimalParentAmount = new Decimal(X);

      if (decimalParentAmount.gte(minParentAmount) && (maxParentAmount === null || decimalParentAmount.lt(maxParentAmount))) {
        selectedParentAmountTier = parentAmountTier;
        break;
      }
    }
  }

  if (selectedParentAmountTier) {
    baseRate = new Decimal(selectedParentAmountTier.baseRate);
    bonusRate = new Decimal(selectedParentAmountTier.bonusRate);
  } else {
    baseRate = new Decimal(levelConfig.baseRate); // Fallback if no parentAmountTier matched
    bonusRate = new Decimal(levelConfig.bonusRate);
  }

  const decimalX = new Decimal(X);
  const decimalY = new Decimal(Y);

  if (decimalY.lte(decimalX)) {
    return decimalY.mul(baseRate).toNumber();
  } else {
    const commission = decimalX.mul(baseRate).plus(decimalY.sub(decimalX).mul(bonusRate));
    return commission.toNumber();
  }
}

module.exports = { UserCanSellCoin, calculateCommission };