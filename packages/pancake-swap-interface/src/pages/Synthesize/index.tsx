import React, {useCallback, useEffect, useMemo, useState} from 'react'
import {Currency, CurrencyAmount, Token} from '@pancakeswap-libs/sdk'
import {Button, CardBody, Text as UIKitText} from '@pancakeswap-libs/uikit'
import {Contract} from "@ethersproject/contracts";

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
  getPortalContract,
  getSynthesizeContract
} from "../../utils";
import {
  useDerivedSynthesizeInfo,
  useSynthesizeActionHandlers,
  useSynthesizeState
} from "../../state/synthesize/hooks";
import {tryParseAmount} from "../../state/swap/hooks";
import {useTransactionAdder} from "../../state/transactions/hooks";
import {useAllTokens} from "../../hooks/Tokens";
import {useFirstWeb3React, useSecondWeb3React} from "../../hooks";
import {SynthesisTabs} from "../../components/NavigationTabs";
import TransactionConfirmationModal, {ConfirmationModalContent} from "../../components/TransactionConfirmationModal";
import {AutoColumn, ColumnCenter} from "../../components/Column";
import AppBody from "../AppBody";
import CardNav from "../../components/CardNav";
import {ConfirmModalBottom} from "./ConfirmModalBottom";
import {RowFlat} from "../../components/Row";
import ConnectWalletButton from "../../components/ConnectWalletButton";

export default function Synthesize() {

  const connection = useSecondWeb3React()
  const otherConnection = useFirstWeb3React()

  const {account: account1, chainId: chainId1, library: library1} = connection
  const {account: account2, chainId: chainId2, library: library2} = otherConnection

  const {value} = useSynthesizeState()
  const [currency, setCurrency] = useState<Currency | undefined>(undefined)
  const allTokens = useAllTokens(connection)

  const token: string | undefined = Object.keys(allTokens).find((address) => {
    return allTokens[address].symbol === currency?.symbol
  })

  const {
    currencyBalance,
    error
  } = useDerivedSynthesizeInfo(connection, currency)

  const amount: CurrencyAmount | undefined = tryParseAmount(value, currency || undefined)

  const handleCurrencySelect = useCallback((curr: Currency) => {
    setCurrency(curr)
  }, [])
  const {onInput} = useSynthesizeActionHandlers()

  const [approval, approve] = useApproveCallback(
      connection, amount, chainId1 ? PORTAL_ADDRESS[chainId1] : undefined
  )

  const realToken = useTokenContract(connection, token, true);

  const [showConfirm, setShowConfirm] = useState<boolean>(false)
  const [txHash, setTxHash] = useState<string>('')
  const [tokenRepr, setTokenRepr] = useState<Token|undefined>(undefined)
  const [attemptingTxn, setAttemptingTxn] = useState<boolean>(false) // clicked confirm
  const addTransaction = useTransactionAdder(connection)

  const otherAllTokens = useAllTokens(otherConnection);
  useEffect(()=>{
    if (!chainId2 || !library2 || !account2 || !token) return
    setTokenRepr(undefined);
    (async () => {
      const contract = getSynthesizeContract(chainId2, library2, account2)
      const reprAddress = await contract.representationSynt(token)
      console.log('update repr!!', reprAddress)
      const reprToken = otherAllTokens[reprAddress]
      console.log('reprToken!!', reprToken)
      setTokenRepr(reprToken || '')
    })()
  }, [otherAllTokens, chainId2, library2, account2, token])


  async function onSynt() {
    if (!realToken || !chainId1 || !library1 || !account1 || !account2) return

    const portal = getPortalContract(chainId1, library1, account1)
    const argsSynt = [realToken.address, amount?.raw.toString(), account2]
    console.log('argsSynt', argsSynt)
    const estimateSynt = portal.estimateGas.synthesize

    setAttemptingTxn(true)

    await estimateSynt(...argsSynt).then((estimatedGasLimit) => {
      portal.synthesize(...argsSynt, {
        gasLimit: calculateGasMargin(estimatedGasLimit),
      })
          .then((response: TransactionResponse) => {
            setAttemptingTxn(false)
            addTransaction(response, {
              summary: `Synthesize ${amount?.toSignificant()} ${currency?.symbol}`,
            })

            setTxHash(response.hash)
          })
          .catch((err: Error) => {
            setAttemptingTxn(false)
            console.error('Failed to synthesize token', err)
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
              {amount?.toSignificant()} {tokenRepr?.symbol}
            </UIKitText>
          </RowFlat>
          on {otherConnection?.chainId ? NETWORK_NAMES[otherConnection?.chainId] : ''}
        </AutoColumn>
    )
  }

  const modalBottom = () => {
    return (
        <ConfirmModalBottom onAdd={onSynt} spendAmount={amount}/>
    )
  }
  const pendingText = `Synthesizing ${amount?.toSignificant()} ${currency?.symbol}
   to ${amount?.toSignificant()} ${tokenRepr?.symbol}`

  return (
      <>
        <CardNav activeIndex={1}/>
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
