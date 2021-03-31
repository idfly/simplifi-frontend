import React, {useCallback, useState} from 'react'
import {Currency, CurrencyAmount, Token} from '@pancakeswap-libs/sdk'
import {Button} from '@pancakeswap-libs/uikit'

// eslint-disable-next-line import/no-unresolved
import {Web3ReactContextInterface} from "@web3-react/core/dist/types";
import {TransactionResponse, Web3Provider} from "@ethersproject/providers";

import CurrencyInputPanel from "../CurrencyInputPanel";
import {
  ApprovalState,
  useApproveCallback
} from "../../hooks/useApproveCallback";
import {Dots} from "../../pages/Pool/styleds";
import {PORTAL_ADDRESS, SYNTHESIZE_ADDRESS} from "../../constants";
import {useTokenContract} from "../../hooks/useContract";
import {
  calculateGasMargin,
  getSynthesizeContract
} from "../../utils";
import {tryParseAmount} from "../../state/swap/hooks";
import {useTransactionAdder} from "../../state/transactions/hooks";
import {useAllTokens, useToken} from "../../hooks/Tokens";
import {
  useDerivedUnsynthesizeInfo, useUnsynthesizeActionHandlers,
  useUnsynthesizeState
} from "../../state/unsynthesize/hooks";

interface UnsynthesizeProps {
  connection: Web3ReactContextInterface<Web3Provider>
  otherConnection: Web3ReactContextInterface<Web3Provider>
}

export default function Unsynthesize({
                                     connection,
                                     otherConnection
                                   }: UnsynthesizeProps) {

  const {account: account1, chainId: chainId1, library: library1} = connection
  const {account: account2} = otherConnection

  const { value} = useUnsynthesizeState()
  const [currency, setCurrency] = useState<Currency | undefined>(undefined)
  const allTokens = useAllTokens(connection)

  const token: string | undefined = Object.keys(allTokens).find((address) => {
    return allTokens[address].symbol === currency?.symbol
  })

  const {
    currencyBalance,
    error
  } = useDerivedUnsynthesizeInfo(connection, currency)

  const amount: CurrencyAmount | undefined = tryParseAmount(value, currency || undefined)

  const handleCurrencySelect = useCallback((curr: Currency) => {
    setCurrency(curr)
  }, [])
  const {onInput} = useUnsynthesizeActionHandlers()

  const [approval, approve] = useApproveCallback(
      connection, amount, chainId1 ? SYNTHESIZE_ADDRESS[chainId1] : undefined
  )

  const syntToken = useTokenContract(connection, token, true);

  const [txHash, setTxHash] = useState<string>('')
  const addTransaction = useTransactionAdder(connection)

  async function onUnsynt() {
    if (!syntToken || !chainId1 || !library1 || !account1 || !account2) return

    const synthesize = getSynthesizeContract(chainId1, library1, account1)
    const argsBurn = [syntToken.address, amount?.raw.toString(), account2]
    console.log('argsBurn', argsBurn)
    const estimateBurn = synthesize.estimateGas.burn

    estimateBurn(...argsBurn).then((estimatedGasLimit) => {
      synthesize.burn(...argsBurn, {
        gasLimit: 400000, // calculateGasMargin(estimatedGasLimit),
      })
          .then((response: TransactionResponse) => {
            addTransaction(response, {
              summary: `Unsynthesize ${amount?.toSignificant()} ${currency?.symbol}`,
            })

            setTxHash(response.hash)
          })
          .catch((err: Error) => {
            console.error('Failed to unsynthesize token', err)
            throw err
          })
    })
  }

  return (
      <>
        <CurrencyInputPanel
            value={value}
            onUserInput={onInput}
            onMax={() => {
              onInput(currencyBalance?.toExact() || '')
            }}
            onCurrencySelect={handleCurrencySelect}
            showMaxButton={value !== currencyBalance?.toString()}
            currency={currency}
            id="unsynthesize-input-tokens"
            showCommonBases={false}
            connection={connection}
        />
        {(approval === ApprovalState.NOT_APPROVED ||
            approval === ApprovalState.PENDING) &&
        <Button
          onClick={() => approve()}
          disabled={approval === ApprovalState.PENDING}
        >
          {approval === ApprovalState.PENDING ? (
              <Dots>Approving {currency?.symbol}</Dots>
          ) : (
              `Approve ${currency?.symbol}`
          )}
        </Button>
        }
        <Button disabled={approval !== ApprovalState.APPROVED || !!error}
                onClick={() => onUnsynt()}>{error ?? 'Unsynthesize'}</Button>
      </>
  )
}
