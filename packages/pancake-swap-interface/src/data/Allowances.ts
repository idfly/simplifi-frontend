import { Token, TokenAmount } from '@pancakeswap-libs/sdk'
import { useMemo } from 'react'
// eslint-disable-next-line import/no-unresolved
import {Web3ReactContextInterface} from "@web3-react/core/dist/types";
import {Web3Provider} from "@ethersproject/providers";

import { useTokenContract } from '../hooks/useContract'
import { useSingleCallResult } from '../state/multicall/hooks'

export function useTokenAllowance(connection: Web3ReactContextInterface<Web3Provider>, token?: Token, owner?: string, spender?: string): TokenAmount | undefined {
  const contract = useTokenContract(connection, token?.address, false)

  const inputs = useMemo(() => [owner, spender], [owner, spender])
  const allowance = useSingleCallResult(connection, contract, 'allowance', inputs).result

  return useMemo(() => (token && allowance ? new TokenAmount(token, allowance.toString()) : undefined), [
    token,
    allowance,
  ])
}

export default useTokenAllowance
