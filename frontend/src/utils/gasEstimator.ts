/**
 * Gas estimation utilities for blockchain transactions
 * Helps users understand transaction costs and prevent failed transactions
 */

import { ethers, type Provider, type TransactionRequest } from 'ethers'

/**
 * Estimate gas for a transaction
 * Returns estimated gas units and cost in ETH
 * 
 * @param provider - Ethers provider
 * @param transaction - Transaction to estimate
 * @returns Object with gasLimit and estimatedCost in ETH
 * 
 * @example
 * const estimate = await estimateGas(provider, {
 *   to: contractAddress,
 *   data: encodedFunctionData
 * })
 * console.log(`Estimated cost: ${estimate.estimatedCost} ETH`)
 */
export async function estimateGas(
  provider: Provider,
  transaction: TransactionRequest
): Promise<{ gasLimit: bigint; estimatedCost: string }> {
  try {
    // Get gas estimate from provider
    const gasLimit = await provider.estimateGas(transaction)
    
    // Get current gas price (fallback to 2 gwei if not available)
    let gasPrice: bigint
    try {
      const feeData = await provider.getFeeData()
      gasPrice = feeData.gasPrice || ethers.parseUnits('2', 'gwei')
    } catch {
      // Fallback gas price for local networks
      gasPrice = ethers.parseUnits('2', 'gwei')
    }
    
    // Calculate total cost: gasLimit * gasPrice
    const totalCost = gasLimit * gasPrice
    
    // Convert to ETH string (with 6 decimal places for readability)
    const estimatedCost = parseFloat(ethers.formatEther(totalCost)).toFixed(6)
    
    return {
      gasLimit,
      estimatedCost
    }
  } catch (error: any) {
    console.error('Gas estimation failed:', error)
    
    // Return safe default values
    return {
      gasLimit: BigInt(100000), // Default gas limit
      estimatedCost: '0.001' // Default ~0.001 ETH
    }
  }
}

/**
 * Check if user has sufficient balance for transaction
 * Compares user balance with estimated transaction cost
 * 
 * @param provider - Ethers provider
 * @param address - User's wallet address
 * @param transaction - Transaction to check
 * @returns Object with hasSufficient flag, balance, and estimated cost
 * 
 * @example
 * const check = await checkSufficientBalance(provider, userAddress, tx)
 * if (!check.hasSufficient) {
 *   alert(`Insufficient balance. You have ${check.balance} ETH but need ${check.estimatedCost} ETH`)
 * }
 */
export async function checkSufficientBalance(
  provider: Provider,
  address: string,
  transaction: TransactionRequest
): Promise<{
  hasSufficient: boolean
  balance: string
  estimatedCost: string
  shortfall: string
}> {
  try {
    // Get user's current balance
    const balanceWei = await provider.getBalance(address)
    const balance = ethers.formatEther(balanceWei)
    
    // Estimate gas for transaction
    const { estimatedCost } = await estimateGas(provider, transaction)
    
    // Convert back to BigInt for comparison
    const balanceBigInt = balanceWei
    const costBigInt = ethers.parseEther(estimatedCost)
    
    // Add 10% buffer for gas price fluctuations
    const costWithBuffer = costBigInt + (costBigInt / BigInt(10))
    
    const hasSufficient = balanceBigInt >= costWithBuffer
    
    // Calculate shortfall if insufficient
    let shortfall = '0'
    if (!hasSufficient) {
      const shortfallWei = costWithBuffer - balanceBigInt
      shortfall = ethers.formatEther(shortfallWei)
    }
    
    return {
      hasSufficient,
      balance: parseFloat(balance).toFixed(6),
      estimatedCost,
      shortfall: parseFloat(shortfall).toFixed(6)
    }
  } catch (error: any) {
    console.error('Balance check failed:', error)
    
    // Return safe default (assume insufficient to prevent failed txs)
    return {
      hasSufficient: false,
      balance: '0',
      estimatedCost: '0.001',
      shortfall: '0.001'
    }
  }
}

/**
 * Format gas cost for display
 * Converts wei to ETH and formats nicely
 * 
 * @param gasCostWei - Gas cost in wei (BigInt)
 * @returns Formatted string like "0.001234 ETH"
 */
export function formatGasCost(gasCostWei: bigint): string {
  const eth = ethers.formatEther(gasCostWei)
  const formatted = parseFloat(eth).toFixed(6)
  return `${formatted} ETH`
}

/**
 * Get estimated gas with buffer
 * Adds 20% buffer to gas estimate to prevent out-of-gas errors
 * 
 * @param provider - Ethers provider
 * @param transaction - Transaction to estimate
 * @returns Gas limit with 20% buffer
 */
export async function getGasLimitWithBuffer(
  provider: Provider,
  transaction: TransactionRequest
): Promise<bigint> {
  try {
    const { gasLimit } = await estimateGas(provider, transaction)
    
    // Add 20% buffer
    const buffer = gasLimit / BigInt(5) // 20% = 1/5
    return gasLimit + buffer
  } catch (error: any) {
    console.error('Gas estimation with buffer failed:', error)
    
    // Return safe default
    return BigInt(120000) // 100k + 20% buffer
  }
}

/**
 * Check if transaction will likely fail due to gas
 * Performs dry-run estimation and checks for errors
 * 
 * @param provider - Ethers provider
 * @param transaction - Transaction to check
 * @returns Object with willFail flag and reason
 */
export async function checkTransactionWillFail(
  provider: Provider,
  transaction: TransactionRequest
): Promise<{ willFail: boolean; reason: string }> {
  try {
    // Try to estimate gas - if this fails, transaction will fail
    await provider.estimateGas(transaction)
    
    return {
      willFail: false,
      reason: ''
    }
  } catch (error: any) {
    // Extract failure reason
    let reason = 'Transaction will likely fail'
    
    const errorMsg = error.message?.toLowerCase() || ''
    
    if (errorMsg.includes('insufficient funds')) {
      reason = 'Insufficient funds for gas'
    } else if (errorMsg.includes('execution reverted')) {
      reason = 'Transaction will be reverted by contract'
    } else if (errorMsg.includes('gas required exceeds')) {
      reason = 'Gas required exceeds block limit'
    } else if (error.reason) {
      reason = error.reason
    }
    
    return {
      willFail: true,
      reason
    }
  }
}

/**
 * Format balance for display
 * Shows balance in ETH with appropriate decimals
 * 
 * @param balanceWei - Balance in wei (string or BigInt)
 * @param decimals - Number of decimal places (default: 4)
 * @returns Formatted balance string
 */
export function formatBalance(balanceWei: string | bigint, decimals: number = 4): string {
  const balance = ethers.formatEther(balanceWei)
  return parseFloat(balance).toFixed(decimals)
}
