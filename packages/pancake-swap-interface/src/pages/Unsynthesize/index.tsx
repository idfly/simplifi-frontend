import React, {useCallback, useEffect, useState} from 'react'
import {Currency, CurrencyAmount, Token} from '@pancakeswap-libs/sdk'
import {Button, CardBody, Text as UIKitText} from '@pancakeswap-libs/uikit'

import {TransactionResponse} from "@ethersproject/providers";

import CurrencyInputPanel from "../../components/CurrencyInputPanel";
import {
  ApprovalState,
  useApproveCallback
} from "../../hooks/useApproveCallback";
import {Dots, Wrapper} from "../Pool/styleds";
import {
  NETWORK_NAMES, NetworkContextName,
  NetworkContextName2,
  PORTAL_ADDRESS
} from "../../constants";
import {useTokenContract} from "../../hooks/useContract";
import {
  calculateGasMargin,
  getSynthesizeContract
} from "../../utils";
import {tryParseAmount} from "../../state/swap/hooks";
import {useTransactionAdder} from "../../state/transactions/hooks";
import {useAllTokens} from "../../hooks/Tokens";
import {useFirstWeb3React, useSecondWeb3React} from "../../hooks";
import {UnsynthesisTabs} from "../../components/NavigationTabs";
import TransactionConfirmationModal, {ConfirmationModalContent} from "../../components/TransactionConfirmationModal";
import {AutoColumn, ColumnCenter} from "../../components/Column";
import AppBody from "../AppBody";
import CardNav from "../../components/CardNav";
import {ConfirmModalBottom} from "./ConfirmModalBottom";
import {RowFlat} from "../../components/Row";
import ConnectWalletButton from "../../components/ConnectWalletButton";
import {
  useDerivedUnsynthesizeInfo, useUnsynthesizeActionHandlers,
  useUnsynthesizeState
} from "../../state/unsynthesize/hooks";

export default function Unsynthesize() {

  const connection = useFirstWeb3React()
  const otherConnection = useSecondWeb3React()

  const {account: account1, chainId: chainId1, library: library1} = connection
  const {account: account2, chainId: chainId2, library: library2} = otherConnection

  const {value} = useUnsynthesizeState()
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
      connection, amount, chainId1 ? PORTAL_ADDRESS[chainId1] : undefined
  )

  const syntToken = useTokenContract(connection, token, true);

  const [showConfirm, setShowConfirm] = useState<boolean>(false)
  const [txHash, setTxHash] = useState<string>('')
  const [tokenReal, setTokenReal] = useState<Token|undefined>(undefined)
  const [attemptingTxn, setAttemptingTxn] = useState<boolean>(false) // clicked confirm
  const addTransaction = useTransactionAdder(connection)

  const otherAllTokens = useAllTokens(otherConnection);

  useEffect(()=>{
    if (!chainId1 || !library1 || !account1 || !token) return
    setTokenReal(undefined);
    (async () => {
      console.log('start')
      const contract = getSynthesizeContract(chainId1, library1, account1)
      console.log('contract', contract)
      const realAddress = await contract.representationReal(token)
      console.log('update real!!', realAddress, otherAllTokens)
      const realToken = otherAllTokens[realAddress]
      console.log('realToken!!', realToken)
      setTokenReal(realToken || '')
    })()
  }, [otherAllTokens, chainId1, library1, account1, token])


  async function onUnsynt() {
    if (!syntToken || !chainId1 || !library1 || !account1 || !account2) return

    const synthesize = getSynthesizeContract(chainId1, library1, account1)
    const argsBurn = [syntToken.address, amount?.raw.toString(), account2]
    console.log('argsBurn', argsBurn)
    const estimateBurn = synthesize.estimateGas.burn

    setAttemptingTxn(true)

    await estimateBurn(...argsBurn).then((estimatedGasLimit) => {
      synthesize.burn(...argsBurn, {
        gasLimit: calculateGasMargin(estimatedGasLimit),
      })
          .then((response: TransactionResponse) => {
            setAttemptingTxn(false)
            addTransaction(response, {
              summary: `Unsynthesize ${amount?.toSignificant()} ${currency?.symbol}`,
            })

            setTxHash(response.hash)
          })
          .catch((err: Error) => {
            setAttemptingTxn(false)
            console.error('Failed to unsynthesize token', err)
            throw err
          })
    })
  }

  const handleDismissConfirmation = useCallback(() => {
    setShowConfirm(false)
    // if there was a tx hash, we want to clear the input
    if (txHash) {
      onInput('')
    }
    setTxHash('')
  }, [onInput, txHash])

  const modalHeader = () => {
    return (
        <AutoColumn gap="20px">
          <RowFlat style={{marginTop: '20px'}}>
            <UIKitText fontSize="48px" mr="8px">
              {amount?.toSignificant()} {tokenReal?.symbol}
            </UIKitText>
          </RowFlat>
          on {otherConnection?.chainId ? NETWORK_NAMES[otherConnection?.chainId] : ''}
        </AutoColumn>
    )
  }

  const modalBottom = () => {
    return (
        <ConfirmModalBottom onAdd={onUnsynt} spendAmount={amount}/>
    )
  }
  const pendingText = `Unsynthesizing ${amount?.toSignificant()} ${currency?.symbol}
   to ${amount?.toSignificant()} ${tokenReal?.symbol}`

  return (
      <>
        <CardNav activeIndex={2}/>
        <AppBody>
          <UnsynthesisTabs/>
          <Wrapper>
            <TransactionConfirmationModal
                isOpen={showConfirm}
                onDismiss={handleDismissConfirmation}
                attemptingTxn={attemptingTxn}
                hash={txHash}
                content={() => (
                    <ConfirmationModalContent
                        title="You will unsynthesize"
                        onDismiss={handleDismissConfirmation}
                        topContent={modalHeader}
                        bottomContent={modalBottom}
                    />
                )}
                pendingText={pendingText}
            />
            <CardBody>
              <AutoColumn gap="20px">
                {connection?.chainId && <ColumnCenter>
                  {NETWORK_NAMES[connection.chainId]}
                </ColumnCenter>}
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
                />{!account1 ? (
                  <ConnectWalletButton networkContextName={NetworkContextName2}
                                       width="100%"/>
              ) : (<>
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
                <Button
                    disabled={approval !== ApprovalState.APPROVED || !!error}
                    onClick={() => setShowConfirm(true)}>
                  {error ?? 'Unsynthesize'}
                </Button>
              </>)}
              </AutoColumn>
            </CardBody>
          </Wrapper>
        </AppBody>
      </>
  )
}
