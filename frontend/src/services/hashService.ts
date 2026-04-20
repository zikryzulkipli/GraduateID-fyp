import type { Contract } from 'ethers'
import HashCheckerABI from '../abi/HashChecker.json'
import { getContractAddress } from '../config/contracts'
import { NETWORKS } from '../config/networks'
import { getContract, getChainId, getProvider, handleContractError } from '../lib/ethers'

type ContractMode = 'read' | 'write'

const resolveNetworkName = async (): Promise<string> => {
  const chainId = await getChainId()
  const entry = Object.entries(NETWORKS).find(([, cfg]) => cfg.chainId === chainId)
  if (!entry) {
    throw new Error(`Unsupported network with chainId ${chainId}. Please switch network.`)
  }
  return entry[0]
}

const getHashCheckerContract = async (_mode: ContractMode = 'read'): Promise<Contract> => {
  const network = await resolveNetworkName()
  const address = getContractAddress(network, 'HashChecker')
  const provider = getProvider()
  return getContract(address, HashCheckerABI, provider)
}

/**
 * Verify an IPFS hash against the blockchain (read-only)
 * @param ipfsHash - The IPFS hash to verify
 * @param contractInstance - Optional pre-instantiated contract (useful when called from components with useContract hook)
 */
export const verifyHashOnChain = async (ipfsHash: string, contractInstance?: Contract): Promise<boolean> => {
  if (!ipfsHash) {
    throw new Error('IPFS hash is required')
  }

  try {
    const contract = contractInstance || await getHashCheckerContract('read')
    const isValid = await contract.verifyHash(ipfsHash)
    return Boolean(isValid)
  } catch (error: any) {
    throw new Error(handleContractError(error))
  }
}

/**
 * Format hash for display (shortened version)
 */
export const formatHash = (hash: string, prefixLength = 10, suffixLength = 8): string => {
  if (hash.length <= prefixLength + suffixLength) {
    return hash
  }
  return `${hash.substring(0, prefixLength)}...${hash.substring(hash.length - suffixLength)}`
}
