/**
 * useContract Hook
 * Generic React hook for instantiating smart contract instances
 * Automatically resolves network and handles provider/signer setup
 */

import { useEffect, useState } from 'react'
import type { Contract } from 'ethers'
import GraduateIDABI from '../abi/GraduateID.json'
import IssueCredentialABI from '../abi/IssueCredential.json'
import OnlineExamABI from '../abi/OnlineExam.json'
import HashCheckerABI from '../abi/HashChecker.json'
// Note: IDRegistry ABI will be available after compilation
// import IDRegistryABI from '../abi/IDRegistry.json'
import { getContract, getProvider, getSigner, getChainId } from '../lib/ethers'
import { getContractAddress } from '../config/contracts'
import { NETWORKS } from '../config/networks'

type ContractName = 'GraduateID' | 'IssueCredential' | 'OnlineExam' | 'HashChecker' | 'IDRegistry'
type ContractMode = 'read' | 'write'

const ABI_MAP: Record<ContractName, any> = {
  GraduateID: GraduateIDABI,
  IssueCredential: IssueCredentialABI,
  OnlineExam: OnlineExamABI,
  HashChecker: HashCheckerABI,
  // This will be populated after contract is compiled and ABI exported
  IDRegistry: []       // Will be updated after: npm run export:abis
}

/**
 * useContract Hook
 * 
 * Returns a ready-to-use contract instance for blockchain interactions
 * 
 * @param contractName - Name of the contract (GraduateID, IssueCredential, etc.)
 * @param mode - 'read' for read-only calls, 'write' for transactions that modify state
 * @returns Object containing contract instance, loading state, and error
 * 
 * @example
 * const { contract, isLoading, error } = useContract('GraduateID', 'read')
 * if (!error && contract) {
 *   const graduate = await contract.getGraduate(address)
 * }
 */
export function useContract(contractName: ContractName, mode: ContractMode = 'read') {
  const [contract, setContract] = useState<Contract | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const initializeContract = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Get current network
        const chainId = await getChainId()
        const networkEntry = Object.entries(NETWORKS).find(([, cfg]) => cfg.chainId === chainId)
        
        if (!networkEntry) {
          throw new Error(`Unsupported network with chainId ${chainId}. Please switch network.`)
        }

        const networkName = networkEntry[0]

        // Get contract address
        const address = getContractAddress(networkName, contractName)
        if (!address) {
          throw new Error(`Contract ${contractName} not deployed on ${networkName}`)
        }

        // Get ABI
        const abi = ABI_MAP[contractName]
        if (!abi) {
          throw new Error(`ABI not found for contract ${contractName}`)
        }

        // Get signer or provider based on mode
        const signerOrProvider = mode === 'write' ? await getSigner() : getProvider()

        // Create contract instance
        const contractInstance = await getContract(address, abi, signerOrProvider)

        if (isMounted) {
          setContract(contractInstance)
          setError(null)
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err?.message || 'Failed to initialize contract')
          setContract(null)
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    initializeContract()

    return () => {
      isMounted = false
    }
  }, [contractName, mode])

  return { contract, isLoading, error }
}
