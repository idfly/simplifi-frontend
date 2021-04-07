import React from 'react'
import {Price, Token} from '@pancakeswap-libs/sdk'
import { SyncAltIcon, Text } from '@pancakeswap-libs/uikit'
import { StyledBalanceMaxMini } from './styleds'

interface TradePriceProps {
  price?: Price
  showInverted: boolean
  setShowInverted: (showInverted: boolean) => void
  quoteCurrency?: Token
}

export default function TradePrice({ price, showInverted, setShowInverted, quoteCurrency }: TradePriceProps) {
  const formattedPrice = showInverted ? price?.toSignificant(6) : price?.invert()?.toSignificant(6)

  const show = Boolean(price?.baseCurrency && price?.quoteCurrency)
  const quote = quoteCurrency?.symbol || price?.quoteCurrency?.symbol
  const label = showInverted
    ? `${quote} per ${price?.baseCurrency?.symbol}`
    : `${price?.baseCurrency?.symbol} per ${quote}`

  return (
    <Text fontSize="14px" style={{ justifyContent: 'center', alignItems: 'center', display: 'flex' }}>
      {show ? (
        <>
          {formattedPrice ?? '-'} {label}
          <StyledBalanceMaxMini onClick={() => setShowInverted(!showInverted)}>
            <SyncAltIcon width="20px" color="primary" />
          </StyledBalanceMaxMini>
        </>
      ) : (
        '-'
      )}
    </Text>
  )
}
