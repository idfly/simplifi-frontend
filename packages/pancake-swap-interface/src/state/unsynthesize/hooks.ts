import {
  Currency,
  CurrencyAmount,
  BNB,
  JSBI,
  Pair,
  Percent,
  Price,
  TokenAmount,
  ETHER
} from '@pancakeswap-libs/sdk'
import {useCallback, useMemo} from 'react'
import {useDispatch, useSelector} from 'react-redux'
// eslint-disable-next-line import/no-unresolved
import {Web3ReactContextInterface} from "@web3-react/core/dist/types";
import {Web3Provider} from "@ethersproject/providers";
import {PairState, usePair} from '../../data/Reserves'
import {useTotalSupply} from '../../data/TotalSupply'
import {TranslateString} from '../../utils/translateTextHelpers'
import {
  wrappedCurrency,
  wrappedCurrencyAmount
} from '../../utils/wrappedCurrency'
import {AppDispatch, AppState} from '../index'
import {tryParseAmount} from '../swap/hooks'
import {useCurrencyBalances} from '../wallet/hooks'
import {typeInput} from './actions'

const ZERO = JSBI.BigInt(0)

export function useUnsynthesizeState(): AppState['unsynthesize'] {
  return useSelector<AppState, AppState['unsynthesize']>((state) => state.unsynthesize)
}

export function useDerivedUnsynthesizeInfo(
    connection: Web3ReactContextInterface<Web3Provider>,
    currency: Currency | undefined,
): {
  currencyBalance?: CurrencyAmount
  error?: string
} {
  const {account} = connection

  const {value} = useUnsynthesizeState()
  const amount = tryParseAmount(value, currency)
  const currencyBalance = useCurrencyBalances(connection, account ?? undefined, [
    currency
  ])[0]

  let error: string | undefined
  if (!account) {
    error = 'Connect Wallet'
  }

  if (!amount) {
    error = error ?? TranslateString(84, 'Enter an amount')
  }

  if (amount && currencyBalance?.lessThan(amount)) {
    error = `Insufficient ${currency?.symbol} balance`
  }

  return {
    currencyBalance,
    error,
  }
}

export function useUnsynthesizeActionHandlers(): { onInput: (value: string) => void } {
  const dispatch = useDispatch<AppDispatch>()

  const onInput = useCallback(
      (value: string) => {
        dispatch(typeInput({value}))
      },
      [dispatch,]
  )

  return {onInput}
}
