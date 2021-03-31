import React from 'react'
import {Button, Text} from '@pancakeswap-libs/uikit'
import {CurrencyAmount} from "@pancakeswap-libs/sdk";
import {RowBetween} from "../../components/Row";

export function ConfirmModalBottom({ onAdd, spendAmount }: { onAdd: () => void, spendAmount: CurrencyAmount | undefined }) {
  return (
    <>
      <RowBetween>
        <Text>You will spend:</Text>
        <Text>{`${spendAmount?.toSignificant()} ${spendAmount?.currency.symbol}`}</Text>
      </RowBetween>
      <Button mt="20px" onClick={onAdd}>
        Confirm synthesize
      </Button>
    </>
  )
}

export default ConfirmModalBottom
