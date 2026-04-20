/**
 * Contract address management for different networks
 * Stores and retrieves deployed contract addresses
 * 
 * ⚠️ AUTO-GENERATED - DO NOT EDIT MANUALLY
 * Updated by scripts/deploy.js on each deployment
 */

import type { ContractAddresses } from '../types'

export const CONTRACT_ADDRESSES: Record<string, ContractAddresses> = {
  localhost: {
    GraduateID: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    IssueCredential: '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9',
    OnlineExam: '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9',
    HashChecker: '0x0165878A594ca255338adfa4d48449f69242Eb8F',
    IDRegistry: '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707'
  },
  sepolia: {
    GraduateID: '',
    IssueCredential: '',
    OnlineExam: '',
    HashChecker: '',
    IDRegistry: ''
  },
  mainnet: {
    GraduateID: '',
    IssueCredential: '',
    OnlineExam: '',
    HashChecker: '',
    IDRegistry: ''
  }
}

export const getContractAddress = (network: string, contractName: keyof ContractAddresses): string => {
  const addresses = CONTRACT_ADDRESSES[network]
  if (!addresses) {
    throw new Error(`Unsupported network: ${network}`)
  }
  const address = addresses[contractName]
  if (!address) {
    throw new Error(`Contract ${contractName} not deployed on ${network}`)
  }
  return address
}
