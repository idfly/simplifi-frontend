import {
  ChainId,
  Currency,
  CurrencyAmount,
  BNB,
  Token,
  TokenAmount,
  WETH,
  ETHER
} from '@pancakeswap-libs/sdk'

export function wrappedCurrency(currency: Currency | undefined, chainId: ChainId | undefined): Token | undefined {
  // eslint-disable-next-line no-nested-ternary
  return chainId && (currency === BNB || currency === ETHER) ?
      WETH[chainId] : currency instanceof Token ? currency : undefined
}

export function wrappedCurrencyAmount(
  currencyAmount: CurrencyAmount | undefined,
  chainId: ChainId | undefined
): TokenAmount | undefined {
  const token = currencyAmount && chainId ? wrappedCurrency(currencyAmount.currency, chainId) : undefined
  return token && currencyAmount ? new TokenAmount(token, currencyAmount.raw) : undefined
}

export function unwrappedToken(token: Token): Currency {
  const MAX_ETHER_CHAIN_ID = 4 // rinkeby
  if (token.chainId > MAX_ETHER_CHAIN_ID && token.equals(WETH[token.chainId])) return BNB
  if (token.chainId <= MAX_ETHER_CHAIN_ID && token.equals(WETH[token.chainId])) return ETHER
  return token
}
