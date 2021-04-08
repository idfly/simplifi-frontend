import {Currency, BNB, Token, ETHER} from '@pancakeswap-libs/sdk'

export function currencyId(currency: Currency): string {
  console.log('currency id', currency)
  if (currency === BNB) return 'BNB'
  if (currency === ETHER) return 'ETH'
  if (currency instanceof Token) return currency.address
  throw new Error('invalid currency')
}

export default currencyId
