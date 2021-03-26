import { Contract } from '@ethersproject/contracts'
import { ChainId, WETH } from '@pancakeswap-libs/sdk'
import { abi as IUniswapV2PairABI } from '@uniswap/v2-core/build/IUniswapV2Pair.json'
import { useMemo } from 'react'
// eslint-disable-next-line import/no-unresolved
import {Web3ReactContextInterface} from "@web3-react/core/dist/types";
import {Web3Provider} from "@ethersproject/providers";
import ENS_ABI from '../constants/abis/ens-registrar.json'
import ENS_PUBLIC_RESOLVER_ABI from '../constants/abis/ens-public-resolver.json'
import { ERC20_BYTES32_ABI } from '../constants/abis/erc20'
import ERC20_ABI from '../constants/abis/erc20.json'
import WETH_ABI from '../constants/abis/weth.json'
import { MULTICALL_ABI, MULTICALL_NETWORKS } from '../constants/multicall'
import { getContract } from '../utils'

// returns null on errors
function useContract(connection: Web3ReactContextInterface<Web3Provider>, address: string | undefined, ABI: any, withSignerIfPossible = true): Contract | null {
  const { library, account } = connection

  return useMemo(() => {
    if (!address || !ABI || !library) return null
    try {
      return getContract(address, ABI, library, withSignerIfPossible && account ? account : undefined)
    } catch (error) {
      console.error('Failed to get contract', error)
      return null
    }
  }, [address, ABI, library, withSignerIfPossible, account])
}

export function useTokenContract(connection: Web3ReactContextInterface<Web3Provider>, tokenAddress?: string, withSignerIfPossible?: boolean): Contract | null {
  return useContract(connection, tokenAddress, ERC20_ABI, withSignerIfPossible)
}

export function useWETHContract(connection: Web3ReactContextInterface<Web3Provider>, withSignerIfPossible?: boolean): Contract | null {
  const { chainId } = connection
  return useContract(connection, chainId ? WETH[chainId].address : undefined, WETH_ABI, withSignerIfPossible)
}

export function useENSRegistrarContract(connection: Web3ReactContextInterface<Web3Provider>, withSignerIfPossible?: boolean): Contract | null {
  const { chainId } = connection
  let address: string | undefined
  if (chainId) {
    switch (chainId) {
      case ChainId.MAINNET:
      case ChainId.BSCTESTNET:
    }
  }
  return useContract(connection, address, ENS_ABI, withSignerIfPossible)
}

export function useENSResolverContract(connection: Web3ReactContextInterface<Web3Provider>, address: string | undefined, withSignerIfPossible?: boolean): Contract | null {
  return useContract(connection, address, ENS_PUBLIC_RESOLVER_ABI, withSignerIfPossible)
}

export function useBytes32TokenContract(connection: Web3ReactContextInterface<Web3Provider>, tokenAddress?: string, withSignerIfPossible?: boolean): Contract | null {
  return useContract(connection, tokenAddress, ERC20_BYTES32_ABI, withSignerIfPossible)
}

export function usePairContract(connection: Web3ReactContextInterface<Web3Provider>, pairAddress?: string, withSignerIfPossible?: boolean): Contract | null {
  return useContract(connection, pairAddress, IUniswapV2PairABI, withSignerIfPossible)
}

export function useMulticallContract(connection: Web3ReactContextInterface<Web3Provider>): Contract | null {
  const { chainId } = connection
  return useContract(connection, chainId && MULTICALL_NETWORKS[chainId], MULTICALL_ABI, false)
}
