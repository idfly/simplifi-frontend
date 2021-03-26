import { BigNumber } from '@ethersproject/bignumber'
import { Token, TokenAmount } from '@pancakeswap-libs/sdk'
// eslint-disable-next-line import/no-unresolved
import {Web3ReactContextInterface} from "@web3-react/core/dist/types";
import {Web3Provider} from "@ethersproject/providers";
import { useTokenContract } from '../hooks/useContract'
import { useSingleCallResult } from '../state/multicall/hooks'

// returns undefined if input token is undefined, or fails to get token contract,
// or contract total supply cannot be fetched
export function useTotalSupply(connection: Web3ReactContextInterface<Web3Provider>, token?: Token): TokenAmount | undefined {
  const contract = useTokenContract(connection, token?.address, false)

  const totalSupply: BigNumber = useSingleCallResult(connection, contract, 'totalSupply')?.result?.[0]

  return token && totalSupply ? new TokenAmount(token, totalSupply.toString()) : undefined
}

export default useTotalSupply
