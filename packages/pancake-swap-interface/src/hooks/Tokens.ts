import { parseBytes32String } from '@ethersproject/strings'
import {
  Currency,
  BNB,
  Token,
  currencyEquals,
  ETHER
} from '@pancakeswap-libs/sdk'
import { useMemo } from 'react'
// eslint-disable-next-line import/no-unresolved
import {Web3ReactContextInterface} from "@web3-react/core/dist/types";
import {Web3Provider} from "@ethersproject/providers";
import { useSelectedTokenList } from '../state/lists/hooks'
import { NEVER_RELOAD, useSingleCallResult } from '../state/multicall/hooks'
// eslint-disable-next-line import/no-cycle
import { useUserAddedTokens } from '../state/user/hooks'
import { isAddress } from '../utils'
import { useBytes32TokenContract, useTokenContract } from './useContract'

export function useAllTokens(connection: Web3ReactContextInterface<Web3Provider>): { [address: string]: Token } {
  const { chainId } = connection
  const userAddedTokens = useUserAddedTokens(connection)
  const allTokens = useSelectedTokenList()

  return useMemo(() => {
    if (!chainId) return {}
    return (
      userAddedTokens
        // reduce into all ALL_TOKENS filtered by the current chain
        .reduce<{ [address: string]: Token }>(
          (tokenMap, token) => {
            tokenMap[token.address] = token
            return tokenMap
          },
          // must make a copy because reduce modifies the map, and we do not
          // want to make a copy in every iteration
          { ...allTokens[chainId] }
        )
    )
  }, [chainId, userAddedTokens, allTokens])
}

// Check if currency is included in custom list from user storage
export function useIsUserAddedToken(connection: Web3ReactContextInterface<Web3Provider>, currency: Currency): boolean {
  const userAddedTokens = useUserAddedTokens(connection)
  return !!userAddedTokens.find((token) => currencyEquals(currency, token))
}

// parse a name or symbol from a token response
const BYTES32_REGEX = /^0x[a-fA-F0-9]{64}$/
function parseStringOrBytes32(str: string | undefined, bytes32: string | undefined, defaultValue: string): string {
  return str && str.length > 0
    ? str
    : bytes32 && BYTES32_REGEX.test(bytes32)
    ? parseBytes32String(bytes32)
    : defaultValue
}

// undefined if invalid or does not exist
// null if loading
// otherwise returns the token
export function useToken(connection: Web3ReactContextInterface<Web3Provider>, tokenAddress?: string): Token | undefined | null {
  const { chainId } = connection
  const tokens = useAllTokens(connection)

  const address = isAddress(tokenAddress)

  const tokenContract = useTokenContract(connection, address || undefined, false)
  const tokenContractBytes32 = useBytes32TokenContract(connection, address || undefined, false)
  const token: Token | undefined = address ? tokens[address] : undefined

  const tokenName = useSingleCallResult(connection, token ? undefined : tokenContract, 'name', undefined, NEVER_RELOAD)
  const tokenNameBytes32 = useSingleCallResult(
    connection,
    token ? undefined : tokenContractBytes32,
    'name',
    undefined,
    NEVER_RELOAD
  )
  const symbol = useSingleCallResult(connection, token ? undefined : tokenContract, 'symbol', undefined, NEVER_RELOAD)
  const symbolBytes32 = useSingleCallResult(connection, token ? undefined : tokenContractBytes32, 'symbol', undefined, NEVER_RELOAD)
  const decimals = useSingleCallResult(connection, token ? undefined : tokenContract, 'decimals', undefined, NEVER_RELOAD)

  return useMemo(() => {
    if (token) return token
    if (!chainId || !address) return undefined
    if (decimals.loading || symbol.loading || tokenName.loading) return null
    if (decimals.result) {
      return new Token(
        chainId,
        address,
        decimals.result[0],
        parseStringOrBytes32(symbol.result?.[0], symbolBytes32.result?.[0], 'UNKNOWN'),
        parseStringOrBytes32(tokenName.result?.[0], tokenNameBytes32.result?.[0], 'Unknown Token')
      )
    }
    return undefined
  }, [
    address,
    chainId,
    decimals.loading,
    decimals.result,
    symbol.loading,
    symbol.result,
    symbolBytes32.result,
    token,
    tokenName.loading,
    tokenName.result,
    tokenNameBytes32.result,
  ])
}

export function useCurrency(connection: Web3ReactContextInterface<Web3Provider>, currencyId: string | undefined): Currency | null | undefined {
  const isBNB = currencyId?.toUpperCase() === 'BNB'
  const isETH = currencyId?.toUpperCase() === 'ETH'
  const token = useToken(connection, isBNB || isETH ? undefined : currencyId)
  return isBNB ? BNB : isETH ? ETHER : token
}
