import { ChainId, JSBI, Percent, Token, WETH } from '@pancakeswap-libs/sdk'

type ChainMapList = {
  readonly [chainId in ChainId]: string
}
export const ROUTER_ADDRESS: ChainMapList = {
  [ChainId.MAINNET]: '0x05fF2B0DB69458A0750badebc4f9e13aDd608C7F',
  [ChainId.BSCTESTNET]: '0xD99D1c33F9fC3444f8101754aBC46c52416550D1',
  [ChainId.ETHMAINNET]: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
  [ChainId.ETHTESTNET]: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
}

export const SYNTHESIZE_ADDRESS: ChainMapList = {
  [ChainId.MAINNET]: '0x176823879B7B9840803647CEB0d8526BbF5CB80b', // TODO
  [ChainId.BSCTESTNET]: '0x223962359097FBcEE065655adaa0fccD729A1959',
  [ChainId.ETHMAINNET]: '0x176823879B7B9840803647CEB0d8526BbF5CB80b', // TODO
  [ChainId.ETHTESTNET]: '0xEa823D3E5eE5a733e14DA233a789f69920bB0e7F',
}

export const PORTAL_ADDRESS: ChainMapList = {
  [ChainId.MAINNET]: '0x438C7943bB5D56b15CFA7e4D78A50B543F8fa89C', // TODO
  [ChainId.BSCTESTNET]: '0xD6e1CA090404607B683A8a3401F2D7c34F96cd02',
  [ChainId.ETHMAINNET]: '0x438C7943bB5D56b15CFA7e4D78A50B543F8fa89C', // TODO
  [ChainId.ETHTESTNET]: '0x4671dcFE18901EfB6a5ce2F86a99e8D127B86de8',
}

// a list of tokens by chain
type ChainTokenList = {
  readonly [chainId in ChainId]: Token[]
}
export const DAI_ETH = new Token(ChainId.ETHMAINNET, '0x6B175474E89094C44Da98b954EedeAC495271d0F', 18, 'DAI', 'Dai Stablecoin')
export const USDT_ETH = new Token(ChainId.ETHMAINNET, '0xdAC17F958D2ee523a2206206994597C13D831ec7', 6, 'USDT', 'Tether USD')

export const DAI = new Token(ChainId.MAINNET, '0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3', 18, 'DAI', 'Dai Stablecoin')
export const BUSD = new Token(ChainId.MAINNET, '0xe9e7cea3dedca5984780bafc599bd69add087d56', 18, 'BUSD', 'Binance USD')
export const USDT = new Token(ChainId.MAINNET, '0x55d398326f99059ff775485246999027b3197955', 18, 'USDT', 'Tether USD')
export const UST = new Token(
  ChainId.MAINNET,
  '0x23396cf899ca06c4472205fc903bdb4de249d6fc',
  18,
  'UST',
  'Wrapped UST Token'
)
export const ETH = new Token(
  ChainId.MAINNET,
  '0x2170ed0880ac9a755fd29b2688956bd959f933f8',
  18,
  'ETH',
  'Binance-Peg Ethereum Token'
)

const WETH_ONLY: ChainTokenList = {
  [ChainId.ETHMAINNET]: [WETH[ChainId.ETHMAINNET]],
  [ChainId.ETHTESTNET]: [WETH[ChainId.ETHTESTNET]],
  [ChainId.MAINNET]: [WETH[ChainId.MAINNET]],
  [ChainId.BSCTESTNET]: [WETH[ChainId.BSCTESTNET]],
}

export const NETWORK_NAMES = {
  [ChainId.ETHMAINNET]: 'ETH Mainnet',
  [ChainId.ETHTESTNET]: 'ETH Rinkeby',
  [ChainId.MAINNET]: 'BSC Mainnet',
  [ChainId.BSCTESTNET]: 'BSC Testnet',
}

// used to construct intermediary pairs for trading
export const BASES_TO_CHECK_TRADES_AGAINST: ChainTokenList = {
  ...WETH_ONLY,
  [ChainId.ETHMAINNET]: [...WETH_ONLY[ChainId.ETHMAINNET], DAI_ETH, USDT_ETH],
  [ChainId.MAINNET]: [...WETH_ONLY[ChainId.MAINNET], DAI, BUSD, USDT, UST, ETH],
}

/**
 * Some tokens can only be swapped via certain pairs, so we override the list of bases that are considered for these
 * tokens.
 */
export const CUSTOM_BASES: { [chainId in ChainId]?: { [tokenAddress: string]: Token[] } } = {
  [ChainId.MAINNET]: {},
}

// used for display in the default list when adding liquidity
export const SUGGESTED_BASES: ChainTokenList = {
  ...WETH_ONLY,
  [ChainId.ETHMAINNET]: [...WETH_ONLY[ChainId.ETHMAINNET], DAI_ETH, USDT_ETH],
  [ChainId.MAINNET]: [...WETH_ONLY[ChainId.MAINNET], DAI, BUSD, USDT],
}

// used to construct the list of all pairs we consider by default in the frontend
export const BASES_TO_TRACK_LIQUIDITY_FOR: ChainTokenList = {
  ...WETH_ONLY,
  [ChainId.ETHMAINNET]: [...WETH_ONLY[ChainId.ETHMAINNET], DAI_ETH, USDT_ETH],
  [ChainId.MAINNET]: [...WETH_ONLY[ChainId.MAINNET], DAI, BUSD, USDT],
}

export const PINNED_PAIRS: { readonly [chainId in ChainId]?: [Token, Token][] } = {
  [ChainId.MAINNET]: [
    [
      new Token(ChainId.MAINNET, '0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82', 18, 'CAKE', 'PancakeSwap Token'),
      new Token(ChainId.MAINNET, '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c', 18, 'WBNB', 'Wrapped BNB'),
    ],
    [BUSD, USDT],
    [DAI, USDT],
  ],
}

export const NetworkContextName = 'NETWORK'
export const NetworkContextName2 = 'NETWORK2'

// default allowed slippage, in bips
export const INITIAL_ALLOWED_SLIPPAGE = 80
// 20 minutes, denominated in seconds
export const DEFAULT_DEADLINE_FROM_NOW = 60 * 20

// one basis point
export const ONE_BIPS = new Percent(JSBI.BigInt(1), JSBI.BigInt(10000))
export const BIPS_BASE = JSBI.BigInt(10000)
// used for warning states
export const ALLOWED_PRICE_IMPACT_LOW: Percent = new Percent(JSBI.BigInt(100), BIPS_BASE) // 1%
export const ALLOWED_PRICE_IMPACT_MEDIUM: Percent = new Percent(JSBI.BigInt(300), BIPS_BASE) // 3%
export const ALLOWED_PRICE_IMPACT_HIGH: Percent = new Percent(JSBI.BigInt(500), BIPS_BASE) // 5%
// if the price slippage exceeds this number, force the user to type 'confirm' to execute
export const PRICE_IMPACT_WITHOUT_FEE_CONFIRM_MIN: Percent = new Percent(JSBI.BigInt(1000), BIPS_BASE) // 10%
// for non expert mode disable swaps above this
export const BLOCKED_PRICE_IMPACT_NON_EXPERT: Percent = new Percent(JSBI.BigInt(1500), BIPS_BASE) // 15%

// used to ensure the user doesn't send so much ETH so they end up with <.01
export const MIN_ETH: JSBI = JSBI.exponentiate(JSBI.BigInt(10), JSBI.BigInt(16)) // .01 ETH
