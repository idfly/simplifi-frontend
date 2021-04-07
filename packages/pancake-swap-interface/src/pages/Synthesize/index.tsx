import React, {useCallback, useState} from 'react'
import {Currency, CurrencyAmount} from '@pancakeswap-libs/sdk'
import {Button, CardBody, Text as UIKitText} from '@pancakeswap-libs/uikit'
import CurrencyInputPanel from "../../components/CurrencyInputPanel";
import {ApprovalState} from "../../hooks/useApproveCallback";
import {Dots, Wrapper} from "../Pool/styleds";
import { NETWORK_NAMES, NetworkContextName2} from "../../constants";
import {
  useDerivedSynthesizeInfo,
  useSynthesizeActionHandlers,
  useSynthesizeState
} from "../../state/synthesize/hooks";
import {tryParseAmount} from "../../state/swap/hooks";
import {useFirstWeb3React, useSecondWeb3React} from "../../hooks";
import {SynthesisTabs} from "../../components/NavigationTabs";
import TransactionConfirmationModal, {ConfirmationModalContent} from "../../components/TransactionConfirmationModal";
import {AutoColumn, ColumnCenter} from "../../components/Column";
import AppBody from "../AppBody";
import CardNav from "../../components/CardNav";
import {ConfirmModalBottom} from "./ConfirmModalBottom";
import {RowFlat} from "../../components/Row";
import ConnectWalletButton from "../../components/ConnectWalletButton";
import useSynthesize from "../../hooks/useSynthesize";

export default function Synthesize() {
  const connection = useSecondWeb3React()
  const otherConnection = useFirstWeb3React()

  const {account: account1, chainId: chainId1} = connection
  const {account: account2 } = otherConnection

  const {value} = useSynthesizeState()
  const [currency, setCurrency] = useState<Currency | undefined>(undefined)
  const {currencyBalance, error} = useDerivedSynthesizeInfo(connection, currency)
  const amount: CurrencyAmount | undefined = tryParseAmount(value, currency || undefined)
  const handleCurrencySelect = useCallback((curr: Currency) => {
    setCurrency(curr)
  }, [])
  const {onInput} = useSynthesizeActionHandlers()
  const [showConfirm, setShowConfirm] = useState<boolean>(false)
  const {
    synthesize,
    approval,
    approve,
    syntheticToken,
    attemptingTxn,
    txHash,
    setTxHash
  } = useSynthesize(connection, otherConnection, amount)

  const handleDismissConfirmation = useCallback(() => {
    setShowConfirm(false)
    // if there was a tx hash, we want to clear the input
    if (txHash) {
      onInput('')
    }
    setTxHash('')
  }, [onInput, txHash, setTxHash])

  const modalHeader = () => {
    return (
        <AutoColumn gap="20px">
          <RowFlat style={{marginTop: '20px'}}>
            <UIKitText fontSize="48px" mr="8px">
              {amount?.toSignificant()} {syntheticToken?.symbol}
            </UIKitText>
          </RowFlat>
          <UIKitText fontSize="14px" mr="8px">
            on {otherConnection?.chainId ? NETWORK_NAMES[otherConnection?.chainId] : ''} to address {account2}
          </UIKitText>
        </AutoColumn>
    )
  }

  const modalBottom = () => {
    return (
        <ConfirmModalBottom onAdd={synthesize} spendAmount={amount}/>
    )
  }
  const pendingText = `Synthesizing ${amount?.toSignificant()} ${currency?.symbol}
   to ${amount?.toSignificant()} ${syntheticToken?.symbol}`

  return (
      <>
        <CardNav activeIndex={2}/>
        <AppBody>
          <SynthesisTabs/>
          <Wrapper>
            <TransactionConfirmationModal
                isOpen={showConfirm}
                onDismiss={handleDismissConfirmation}
                attemptingTxn={attemptingTxn}
                hash={txHash}
                content={() => (
                    <ConfirmationModalContent
                        title="You will synthesize"
                        onDismiss={handleDismissConfirmation}
                        topContent={modalHeader}
                        bottomContent={modalBottom}
                    />
                )}
                pendingText={pendingText}
                chainId={chainId1}
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
                    id="synthesize-input-tokens"
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
                  {error ?? 'Synthesize'}
                </Button>
              </>)}
              </AutoColumn>
            </CardBody>
          </Wrapper>
        </AppBody>
      </>
  )
}
