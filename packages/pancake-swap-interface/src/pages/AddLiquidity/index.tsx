import React, { useCallback, useState } from 'react'
import { BigNumber } from '@ethersproject/bignumber'
import { TransactionResponse } from '@ethersproject/providers'
import {
  Currency,
  currencyEquals,
  BNB,
  TokenAmount,
  WETH,
  ETHER, Token
} from '@pancakeswap-libs/sdk'
import { Button, CardBody, AddIcon, Text as UIKitText } from '@pancakeswap-libs/uikit'
import { RouteComponentProps } from 'react-router-dom'
import { LightCard } from 'components/Card'
import { AutoColumn, ColumnCenter } from 'components/Column'
import TransactionConfirmationModal, { ConfirmationModalContent } from 'components/TransactionConfirmationModal'
import CardNav from 'components/CardNav'
import CurrencyInputPanel from 'components/CurrencyInputPanel'
import DoubleCurrencyLogo from 'components/DoubleLogo'
import { AddRemoveTabs } from 'components/NavigationTabs'
import { MinimalPositionCard } from 'components/PositionCard'
import Row, { RowBetween, RowFlat } from 'components/Row'

import { PairState } from 'data/Reserves'
import { useFirstWeb3React, useSecondWeb3React } from 'hooks'
import { useCurrency } from 'hooks/Tokens'
import { ApprovalState, useApproveCallback } from 'hooks/useApproveCallback'
import { Field } from 'state/mint/actions'
import { useDerivedMintInfo, useMintActionHandlers, useMintState } from 'state/mint/hooks'

import { useTransactionAdder } from 'state/transactions/hooks'
import { useIsExpertMode, useUserDeadline, useUserSlippageTolerance } from 'state/user/hooks'
import { calculateGasMargin, calculateSlippageAmount, getRouterContract } from 'utils'
import { maxAmountSpend } from 'utils/maxAmountSpend'
import {wrappedCurrency} from 'utils/wrappedCurrency'
import { currencyId } from 'utils/currencyId'
import Pane from 'components/Pane'
import ConnectWalletButton from 'components/ConnectWalletButton'
import useI18n from 'hooks/useI18n'
import AppBody from '../AppBody'
import { Dots, Wrapper } from '../Pool/styleds'
import { ConfirmAddModalBottom } from './ConfirmAddModalBottom'
import { PoolPriceBar } from './PoolPriceBar'
import {NETWORK_NAMES, ROUTER_ADDRESS} from '../../constants'
import useTokenMap from "../../hooks/useTokenMap";
import useSynthesize from "../../hooks/useSynthesize";
import {tryParseAmount} from "../../state/swap/hooks";

export default function AddLiquidity({
  match: {
    params: { currencyIdA, currencyIdB },
  },
  history,
}: RouteComponentProps<{ currencyIdA?: string; currencyIdB?: string }>) {
  const connection1 = useFirstWeb3React()
  const connection2 = useSecondWeb3React()

  const { account, chainId, library } = connection1
  const { chainId: chainId2 } = connection2

  const currencyA = useCurrency(connection1, currencyIdA)
  const currencyB = useCurrency(connection1, currencyIdB)
  const TranslateString = useI18n()

  const oneCurrencyIsNative = Boolean(
    chainId && chainId2 &&
      ((currencyA && currencyEquals(currencyA, WETH[chainId])) ||
        (currencyB && currencyEquals(currencyB, WETH[chainId])))
  )
  const expertMode = useIsExpertMode()

  // mint state
  const { independentField, typedValue, otherTypedValue } = useMintState()

  const {
    syntheticToken,
    originalToken,
    selectOriginalToken
  } = useTokenMap(connection1)

  const {
    dependentField,
    currencies,
    pair,
    pairState,
    currencyBalances,
    parsedAmounts,
    price,
    noLiquidity,
    liquidityMinted,
    poolTokenPercentage,
    error,
  } = useDerivedMintInfo(connection1, currencyA ?? undefined, syntheticToken ?? undefined)
  const { onFieldAInput, onFieldBInput } = useMintActionHandlers(noLiquidity)

  const originalTokenAmount = tryParseAmount(parsedAmounts[Field.CURRENCY_B]?.toExact(), originalToken)

  const isValid = !error

  // modal and loading
  const [showConfirm, setShowConfirm] = useState<boolean>(false)

  // txn values
  const [deadline] = useUserDeadline() // custom from users settings
  const [allowedSlippage] = useUserSlippageTolerance() // custom from users

  // get formatted amounts
  const formattedAmounts = {
    [independentField]: typedValue,
    [dependentField]: noLiquidity ? otherTypedValue : parsedAmounts[dependentField]?.toSignificant(6) ?? '',
  }

  // get the max amounts user can add
  const maxAmounts: { [field in Field]?: TokenAmount } = [Field.CURRENCY_A, Field.CURRENCY_B].reduce(
    (accumulator, field) => {
      return {
        ...accumulator,
        [field]: maxAmountSpend(currencyBalances[field]),
      }
    },
    {}
  )

  const atMaxAmounts: { [field in Field]?: TokenAmount } = [Field.CURRENCY_A, Field.CURRENCY_B].reduce(
    (accumulator, field) => {
      return {
        ...accumulator,
        [field]: maxAmounts[field]?.equalTo(parsedAmounts[field] ?? '0'),
      }
    },
    {}
  )


  // check whether the user has approved the router on the tokens
  const [approvalA, approveACallback] =
      useApproveCallback(connection1, parsedAmounts[Field.CURRENCY_A], chainId ? ROUTER_ADDRESS[chainId] : undefined)
  const [approvalB, approveBCallback] =
      useApproveCallback(connection1, parsedAmounts[Field.CURRENCY_B], chainId ? ROUTER_ADDRESS[chainId] : undefined)

  const addTransaction = useTransactionAdder(connection1)

  const {approveAndSynthesize, setTxHash, txHash, attemptingTxn, setAttemptingTxn} = useSynthesize(connection2, connection1, originalTokenAmount)

  async function onAdd() {
    if (!chainId || !library || !account) return
    const router = getRouterContract(chainId, library, account)

    const { [Field.CURRENCY_A]: parsedAmountA, [Field.CURRENCY_B]: parsedAmountB } = parsedAmounts
    if (!parsedAmountA || !parsedAmountB || !currencyA || !currencyB) {
      return
    }

    const amountsMin = {
      [Field.CURRENCY_A]: calculateSlippageAmount(parsedAmountA, noLiquidity ? 0 : allowedSlippage)[0],
      [Field.CURRENCY_B]: calculateSlippageAmount(parsedAmountB, noLiquidity ? 0 : allowedSlippage)[0],
    }

    const deadlineFromNow = Math.ceil(Date.now() / 1000) + deadline

    let estimate
    let method: (...args: any) => Promise<TransactionResponse>
    let args: Array<string | string[] | number>
    let value: BigNumber | null
    if (currencyA === BNB || currencyB === BNB) {
      const tokenBIsNative = currencyB === BNB || currencyB === ETHER
      estimate = router.estimateGas.addLiquidityETH
      method = router.addLiquidityETH
      args = [
        wrappedCurrency(tokenBIsNative ? currencyA : currencyB, chainId)?.address ?? '', // token
        (tokenBIsNative ? parsedAmountA : parsedAmountB).raw.toString(), // token desired
        amountsMin[tokenBIsNative ? Field.CURRENCY_A : Field.CURRENCY_B].toString(), // token min
        amountsMin[tokenBIsNative ? Field.CURRENCY_B : Field.CURRENCY_A].toString(), // eth min
        account,
        deadlineFromNow,
      ]
      value = BigNumber.from((tokenBIsNative ? parsedAmountB : parsedAmountA).raw.toString())
    } else {
      estimate = router.estimateGas.addLiquidity
      method = router.addLiquidity
      args = [
        wrappedCurrency(currencyA, chainId)?.address ?? '',
        wrappedCurrency(currencyB, chainId)?.address ?? '',
        parsedAmountA.raw.toString(),
        parsedAmountB.raw.toString(),
        amountsMin[Field.CURRENCY_A].toString(),
        amountsMin[Field.CURRENCY_B].toString(),
        account,
        deadlineFromNow,
      ]
      value = null
    }

    setAttemptingTxn(true)
    // const aa = await estimate(...args, value ? { value } : {})
    await estimate(...args, value ? { value } : {})
      .then((estimatedGasLimit) =>
        method(...args, {
          ...(value ? { value } : {}),
          gasLimit: calculateGasMargin(estimatedGasLimit),
        }).then((response) => {
          setAttemptingTxn(false)

          addTransaction(response, {
            summary: `Add ${parsedAmounts[Field.CURRENCY_A]?.toSignificant(3)} ${
              currencies[Field.CURRENCY_A]?.symbol
            } and ${parsedAmounts[Field.CURRENCY_B]?.toSignificant(3)} ${currencies[Field.CURRENCY_B]?.symbol}`,
          })

          setTxHash(response.hash)
        })
      )
      .catch((e) => {
        setAttemptingTxn(false)
        // we only care if the error is something _other_ than the user rejected the tx
        if (e?.code !== 4001) {
          console.error(e)
        }
      })
  }

  const modalHeader = () => {
    return noLiquidity ? (
      <AutoColumn gap="20px">
        <LightCard mt="20px" borderRadius="20px">
          <RowFlat>
            <UIKitText fontSize="48px" mr="8px">
              {`${currencies[Field.CURRENCY_A]?.symbol}/${currencies[Field.CURRENCY_B]?.symbol}`}
            </UIKitText>
            <DoubleCurrencyLogo
              currency0={currencies[Field.CURRENCY_A]}
              currency1={currencies[Field.CURRENCY_B]}
              size={30}
            />
          </RowFlat>
        </LightCard>
      </AutoColumn>
    ) : (
      <AutoColumn gap="20px">
        <RowFlat style={{ marginTop: '20px' }}>
          <UIKitText fontSize="48px" mr="8px">
            {liquidityMinted?.toSignificant(6)}
          </UIKitText>
          <DoubleCurrencyLogo
            currency0={currencies[Field.CURRENCY_A]}
            currency1={currencies[Field.CURRENCY_B]}
            size={30}
          />
        </RowFlat>
        <Row>
          <UIKitText fontSize="24px">
            {`${currencies[Field.CURRENCY_A]?.symbol}/${currencies[Field.CURRENCY_B]?.symbol} Pool Tokens`}
          </UIKitText>
        </Row>
        <UIKitText small textAlign="left" padding="8px 0 0 0 " style={{ fontStyle: 'italic' }}>
          {`Output is estimated. If the price changes by more than ${
            allowedSlippage / 100
          }% your transaction will revert.`}
        </UIKitText>
      </AutoColumn>
    )
  }

  const modalBottom = () => {
    return (
      <ConfirmAddModalBottom
        price={price}
        currencies={currencies}
        parsedAmounts={parsedAmounts}
        noLiquidity={noLiquidity}
        onAdd={() => approveAndSynthesize(onAdd)}
        poolTokenPercentage={poolTokenPercentage}
      />
    )
  }

  const pendingText = `Supplying ${parsedAmounts[Field.CURRENCY_A]?.toSignificant(6)} ${
    currencies[Field.CURRENCY_A]?.symbol
  } and ${parsedAmounts[Field.CURRENCY_B]?.toSignificant(6)} ${currencies[Field.CURRENCY_B]?.symbol}`

  const handleCurrencyASelect = useCallback(
    (currA: Currency) => {
      const newCurrencyIdA = currencyId(currA)
      if (newCurrencyIdA === currencyIdB) {
        history.push(`/add/${currencyIdB}/${currencyIdA}`)
      } else {
        history.push(`/add/${newCurrencyIdA}/${currencyIdB}`)
      }
    },
    [currencyIdB, history, currencyIdA]
  )
  const handleCurrencyBSelect = useCallback((currB: Currency) => {
      const synthetic = selectOriginalToken(wrappedCurrency(currB, chainId2) as Token)

      const newCurrencyIdB = currencyId(synthetic)
      if (currencyIdA === newCurrencyIdB) {
        if (currencyIdB) {
          history.push(`/add/${currencyIdB}/${newCurrencyIdB}`)
        } else {
          history.push(`/add/${newCurrencyIdB}`)
        }
      } else {
        history.push(`/add/${currencyIdA || 'BNB'}/${newCurrencyIdB}`)
      }
    },
    [currencyIdA, history, currencyIdB, chainId2, selectOriginalToken]
  )

  const handleDismissConfirmation = useCallback(() => {
    setShowConfirm(false)
    // if there was a tx hash, we want to clear the input
    if (txHash) {
      onFieldAInput('')
    }
    setTxHash('')
  }, [onFieldAInput, txHash, setTxHash])

  return (
    <>
      <CardNav activeIndex={1} />
      <AppBody>
        <AddRemoveTabs adding />
        <Wrapper>
          <TransactionConfirmationModal
            isOpen={showConfirm}
            onDismiss={handleDismissConfirmation}
            attemptingTxn={attemptingTxn}
            hash={txHash}
            content={() => (
              <ConfirmationModalContent
                title={
                  noLiquidity
                    ? TranslateString(1154, 'You are creating a pool')
                    : TranslateString(1156, 'You will receive')
                }
                onDismiss={handleDismissConfirmation}
                topContent={modalHeader}
                bottomContent={modalBottom}
              />
            )}
            pendingText={pendingText}
            chainId={chainId}
          />
          <CardBody>
            <AutoColumn gap="20px">
              {noLiquidity && (
                  <ColumnCenter>
                    <Pane>
                      <AutoColumn gap="12px">
                        <UIKitText>{TranslateString(1158, 'You are the first liquidity provider.')}</UIKitText>
                        <UIKitText>
                          {TranslateString(1160, 'The ratio of tokens you add will set the price of this pool.')}
                        </UIKitText>
                        <UIKitText>
                          {TranslateString(1162, 'Once you are happy with the rate click supply to review.')}
                        </UIKitText>
                      </AutoColumn>
                    </Pane>
                  </ColumnCenter>
              )}
              {connection1?.chainId && <>
              <ColumnCenter>
                {NETWORK_NAMES[connection1.chainId]}
              </ColumnCenter>
              <CurrencyInputPanel
                  value={formattedAmounts[Field.CURRENCY_A]}
                  onUserInput={onFieldAInput}
                  onMax={() => {
                    onFieldAInput(maxAmounts[Field.CURRENCY_A]?.toExact() ?? '')
                  }}
                  onCurrencySelect={handleCurrencyASelect}
                  showMaxButton={!atMaxAmounts[Field.CURRENCY_A]}
                  currency={currencies[Field.CURRENCY_A]}
                  id="add-liquidity-input-tokena"
                  showCommonBases={false}
                  connection={connection1}
              />
              <ColumnCenter>
                <AddIcon color="textSubtle" />
              </ColumnCenter>
              <CurrencyInputPanel
                value={formattedAmounts[Field.CURRENCY_B]}
                onUserInput={onFieldBInput}
                onCurrencySelect={handleCurrencyBSelect}
                onMax={() => {
                  onFieldBInput(maxAmounts[Field.CURRENCY_B]?.toExact() ?? '')
                }}
                showMaxButton={!atMaxAmounts[Field.CURRENCY_B]}
                currency={originalToken}
                id="add-liquidity-input-tokenb"
                showCommonBases={false}
                connection={connection2}
              />
              {currencies[Field.CURRENCY_A] && currencies[Field.CURRENCY_B] && pairState !== PairState.INVALID && (
                <div>
                  <UIKitText
                    style={{ textTransform: 'uppercase', fontWeight: 600 }}
                    color="textSubtle"
                    fontSize="12px"
                    mb="2px"
                  >
                    {noLiquidity
                      ? TranslateString(1164, 'Initial prices and pool share')
                      : TranslateString(1166, 'Prices and pool share')}
                  </UIKitText>
                  <Pane>
                    <PoolPriceBar
                      currencies={currencies}
                      poolTokenPercentage={poolTokenPercentage}
                      noLiquidity={noLiquidity}
                      price={price}
                    />
                  </Pane>
                </div>
              )}

              {!account ? (
                <ConnectWalletButton width="100%" />
              ) : (
                <AutoColumn gap="md">
                  {(approvalA === ApprovalState.NOT_APPROVED ||
                    approvalA === ApprovalState.PENDING ||
                    approvalB === ApprovalState.NOT_APPROVED ||
                    approvalB === ApprovalState.PENDING) &&
                    isValid && (
                      <RowBetween>
                        {approvalA !== ApprovalState.APPROVED && (
                          <Button
                            onClick={approveACallback}
                            disabled={approvalA === ApprovalState.PENDING}
                            style={{ width: approvalB !== ApprovalState.APPROVED ? '48%' : '100%' }}
                          >
                            {approvalA === ApprovalState.PENDING ? (
                              <Dots>Approving {currencies[Field.CURRENCY_A]?.symbol}</Dots>
                            ) : (
                              `Approve ${currencies[Field.CURRENCY_A]?.symbol}`
                            )}
                          </Button>
                        )}
                        {approvalB !== ApprovalState.APPROVED && (
                          <Button
                            onClick={approveBCallback}
                            disabled={approvalB === ApprovalState.PENDING}
                            style={{ width: approvalA !== ApprovalState.APPROVED ? '48%' : '100%' }}
                          >
                            {approvalB === ApprovalState.PENDING ? (
                              <Dots>Approving {currencies[Field.CURRENCY_B]?.symbol}</Dots>
                            ) : (
                              `Approve ${currencies[Field.CURRENCY_B]?.symbol}`
                            )}
                          </Button>
                        )}
                      </RowBetween>
                    )}
                  <Button
                    onClick={() => {
                      if (expertMode) {
                        approveAndSynthesize(onAdd)
                      } else {
                        setShowConfirm(true)
                      }
                    }}
                    disabled={!isValid || approvalA !== ApprovalState.APPROVED || approvalB !== ApprovalState.APPROVED}
                    variant={
                      !isValid && !!parsedAmounts[Field.CURRENCY_A] && !!parsedAmounts[Field.CURRENCY_B]
                        ? 'danger'
                        : 'primary'
                    }
                    width="100%"
                  >
                    {error ?? 'Supply'}
                  </Button>
                </AutoColumn>
              )}
              </>}
            </AutoColumn>
          </CardBody>
        </Wrapper>
      </AppBody>
      {pair && !noLiquidity && pairState !== PairState.INVALID ? (
        <AutoColumn style={{ minWidth: '20rem', marginTop: '1rem' }}>
          <MinimalPositionCard connection={connection1} showUnwrapped={oneCurrencyIsNative} pair={pair} />
        </AutoColumn>
      ) : null}
    </>
  )
}
