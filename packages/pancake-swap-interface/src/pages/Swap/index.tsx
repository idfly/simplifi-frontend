import {CurrencyAmount, JSBI, Token, Trade} from '@pancakeswap-libs/sdk'
import {TransactionReceipt} from "@ethersproject/abstract-provider";
import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react'
import {ArrowDown} from 'react-feather'
import {
  CardBody,
  ArrowDownIcon,
  Button,
  IconButton,
  Text
} from '@pancakeswap-libs/uikit'
import {ThemeContext} from 'styled-components'
import AddressInputPanel from 'components/AddressInputPanel'
import Card, {GreyCard} from 'components/Card'
import {AutoColumn} from 'components/Column'
import ConfirmSwapModal from 'components/swap/ConfirmSwapModal'
import CurrencyInputPanel from 'components/CurrencyInputPanel'
import CardNav from 'components/CardNav'
import {AutoRow, RowBetween} from 'components/Row'
import AdvancedSwapDetailsDropdown
  from 'components/swap/AdvancedSwapDetailsDropdown'
import confirmPriceImpactWithoutFee
  from 'components/swap/confirmPriceImpactWithoutFee'
import {
  ArrowWrapper,
  BottomGrouping,
  SwapCallbackError,
  Wrapper
} from 'components/swap/styleds'
import TradePrice from 'components/swap/TradePrice'
import TokenWarningModal from 'components/TokenWarningModal'
import SyrupWarningModal from 'components/SyrupWarningModal'
import ProgressSteps from 'components/ProgressSteps'

import {
  INITIAL_ALLOWED_SLIPPAGE,
  SYNTHESIZE_ADDRESS
} from 'constants/index'
import {useFirstWeb3React, useSecondWeb3React} from 'hooks'
import {useAllTokens, useCurrency} from 'hooks/Tokens'
import {
  ApprovalState,
  useApproveCallback,
  useApproveCallbackFromTrade
} from 'hooks/useApproveCallback'
import {useSwapCallback} from 'hooks/useSwapCallback'
import useWrapCallback, {WrapType} from 'hooks/useWrapCallback'
import {Field} from 'state/swap/actions'
import {TransactionResponse} from "@ethersproject/providers";
import {BigNumber} from "@ethersproject/bignumber";
import {utils} from "ethers";
import {
  tryParseAmount,
  useDefaultsFromURLSearch,
  useDerivedSwapInfo,
  useSwapActionHandlers,
  useSwapState
} from 'state/swap/hooks'
import {
  useExpertModeManager,
  useUserDeadline,
  useUserSlippageTolerance
} from 'state/user/hooks'
import {LinkStyledButton} from 'components/Shared'
import {maxAmountSpend} from 'utils/maxAmountSpend'
import {computeTradePriceBreakdown, warningSeverity} from 'utils/prices'
import Loader from 'components/Loader'
import useI18n from 'hooks/useI18n'
import PageHeader from 'components/PageHeader'
import ConnectWalletButton from 'components/ConnectWalletButton'
import {invert} from "lodash";
import AppBody from '../AppBody'
import {
  calculateGasMargin,
  getSynthesizeContract
} from "../../utils";
import {wrappedCurrency} from "../../utils/wrappedCurrency";

const Swap = () => {
  const connection1 = useFirstWeb3React()
  const connection2 = useSecondWeb3React()

  const {chainId: chainId1, library: library1, account: account1} = connection1
  const {chainId: chainId2, library: library2, account: account2} = connection2

  const loadedUrlParams = useDefaultsFromURLSearch(connection1)
  const TranslateString = useI18n()

  // token warning stuff
  const [loadedInputCurrency, loadedOutputCurrency] = [
    useCurrency(connection1, loadedUrlParams?.inputCurrencyId),
    useCurrency(connection2, loadedUrlParams?.outputCurrencyId),
  ]
  const [pendingText, setPendingText] = useState<string[]>([])
  const [dismissTokenWarning, setDismissTokenWarning] = useState<boolean>(false)
  const [isSyrup, setIsSyrup] = useState<boolean>(false)
  const [syrupTransactionType, setSyrupTransactionType] = useState<string>('')
  const urlLoadedTokens: Token[] = useMemo(
      () => [loadedInputCurrency, loadedOutputCurrency]?.filter((c): c is Token => c instanceof Token) ?? [],
      [loadedInputCurrency, loadedOutputCurrency]
  )
  const handleConfirmTokenWarning = useCallback(() => {
    setDismissTokenWarning(true)
  }, [])

  const handleConfirmSyrupWarning = useCallback(() => {
    setIsSyrup(false)
    setSyrupTransactionType('')
  }, [])

  const theme = useContext(ThemeContext)

  const [isExpertMode] = useExpertModeManager()

  // get custom setting values for user
  const [deadline] = useUserDeadline()
  const [allowedSlippage] = useUserSlippageTolerance()

  // swap state
  const {independentField, typedValue, recipient} = useSwapState()
  const {
    v2Trade, currencyBalances,
    parsedAmount,
    currencies, inputError: swapInputError
  } = useDerivedSwapInfo(connection1)
  const {
    wrapType,
    execute: onWrap,
    inputError: wrapInputError
  } = useWrapCallback(
      connection1,
      currencies[Field.INPUT],
      currencies[Field.OUTPUT],
      typedValue
  )
  const showWrap: boolean = wrapType !== WrapType.NOT_APPLICABLE
  const trade = showWrap ? undefined : v2Trade

  const parsedAmounts = showWrap
      ? {
        [Field.INPUT]: parsedAmount,
        [Field.OUTPUT]: parsedAmount,
      }
      : {
        [Field.INPUT]: independentField === Field.INPUT ? parsedAmount : trade?.inputAmount,
        [Field.OUTPUT]: independentField === Field.OUTPUT ? parsedAmount : trade?.outputAmount,
      }

  const {
    onSwitchTokens,
    onCurrencySelection,
    onUserInput,
    onChangeRecipient
  } = useSwapActionHandlers()
  const isValid = !swapInputError
  const dependentField: Field = independentField === Field.INPUT ? Field.OUTPUT : Field.INPUT

  const handleTypeInput = useCallback(
      (value: string) => {
        onUserInput(Field.INPUT, value)
      },
      [onUserInput]
  )
  const handleTypeOutput = useCallback(
      (value: string) => {
        onUserInput(Field.OUTPUT, value)
      },
      [onUserInput]
  )

  // modal and loading
  const [{
    showConfirm,
    tradeToConfirm,
    swapErrorMessage,
    attemptingTxn,
    txHash
  }, setSwapState] = useState<{
    showConfirm: boolean
    tradeToConfirm: Trade | undefined
    attemptingTxn: boolean
    swapErrorMessage: string | undefined
    txHash: string | undefined
  }>({
    showConfirm: false,
    tradeToConfirm: undefined,
    attemptingTxn: false,
    swapErrorMessage: undefined,
    txHash: undefined,
  })

  const formattedAmounts = {
    [independentField]: typedValue,
    [dependentField]: showWrap
        ? parsedAmounts[independentField]?.toExact() ?? ''
        : parsedAmounts[dependentField]?.toSignificant(6) ?? '',
  }

  const route = trade?.route
  const userHasSpecifiedInputOutput = Boolean(
      currencies[Field.INPUT] && currencies[Field.OUTPUT] && parsedAmounts[independentField]?.greaterThan(JSBI.BigInt(0))
  )
  const noRoute = !route

  // check whether the user has approved the router on the input token
  const [approval, approveCallback] = useApproveCallbackFromTrade(connection1, trade, allowedSlippage)

  // check if user has gone through approval process, used to show two step buttons, reset on token change
  const [approvalSubmitted, setApprovalSubmitted] = useState<boolean>(false)

  // mark when a user has submitted an approval, reset onTokenSelection for input field
  useEffect(() => {
    if (approval === ApprovalState.PENDING) {
      setApprovalSubmitted(true)
    }
  }, [approval, approvalSubmitted])

  const maxAmountInput: CurrencyAmount | undefined = maxAmountSpend(currencyBalances[Field.INPUT])
  const atMaxAmountInput = Boolean(maxAmountInput && parsedAmounts[Field.INPUT]?.equalTo(maxAmountInput))

  // the callback to execute the swap
  const {callback: swapCallback, error: swapCallbackError} = useSwapCallback(
      connection1,
      trade,
      allowedSlippage,
      deadline,
      recipient
  )

  const {priceImpactWithoutFee} = computeTradePriceBreakdown(trade)

  const [syntheticToken, setSyntheticToken] = useState<Token | undefined>(undefined)
  const [originalToken, setOriginalToken] = useState<Token | undefined>(undefined)

  // useEffect(() => {
  //   if (!outputTokenAddress || !library1 || !account1 || !chainId1) return
  //   const tok = getContract(outputTokenAddress, ERC20_ABI, library1, account1)
  //   console.log('tok', tok)
  //   tok?.approve(SYNTHESIZE_ADDRESS[chainId1], 0, {})
  // }, [allTokens, chainId1, outputTokenAddress, account1, library1])

  const allTokens = useAllTokens(connection1)
  const [tokenMap, setTokenMap] = useState<{[string: string]:string}[]>([])
  useEffect(() => {
    if(!connection1 || !chainId1 || !library1 || !account1) return;

    const contract = getSynthesizeContract(chainId1, library1, account1);
    (async () => {
      const allSyntheticTokens = Object.keys(allTokens)
      for (let i = 0; i < allSyntheticTokens.length; i++) {
        const syntheticAddress = allSyntheticTokens[i]
        const originalAddress = await contract.representationReal(syntheticAddress)
        if(originalAddress && syntheticAddress) {
          setTokenMap((prevState) => {
            return {...prevState, [syntheticAddress]: originalAddress}
          })
        }
      }
    })()
  }, [connection1, chainId1, library1, account1, allTokens])


  const amount = tryParseAmount('1', currencies[Field.OUTPUT])
  const [approvalSynthToken, approveSynthToken] = useApproveCallback(
      connection1, amount, chainId1 ? SYNTHESIZE_ADDRESS[chainId1] : undefined
  )

  const extractSwapAmount = (receipt: TransactionReceipt): BigNumber | null => {
    const SWAP_TOPIC0 = '0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822'
    const swapLog = receipt.logs.find((log) => {
      return log.topics[0] === SWAP_TOPIC0
    })
    if (!swapLog) return null

    const params = swapLog.data.slice(2, -1).match(/.{1,64}/g)
    if (!params) return null

    return BigNumber.from(`0x${params[2]}`)
  }

  const onApproved = useCallback(async (swapAmount: BigNumber) => {
    if (!chainId1 || !library1 || !account1 || !account2) return
    if(!syntheticToken) {
      console.error('Synthetic token was not set')
      return
    }

    setPendingText((prevState) => (
      [...prevState, 'Swap synthetic token to real token on other chain']
    ))

    const synthesize = getSynthesizeContract(chainId1, library1, account1)
    const argsBurn = [syntheticToken.address, swapAmount.toString(), account2]
    console.log('argsBurn', argsBurn)
    const estimateBurn = synthesize.estimateGas.burn

    await estimateBurn(...argsBurn).then((estimatedGasLimit) => {
      synthesize.burn(...argsBurn, {
        gasLimit: calculateGasMargin(estimatedGasLimit),
      })
          .then((response: TransactionResponse) => {
            console.log('response', response)
            setSwapState((prevState) => ({
              ...prevState,
              txHash: response.hash,
            }))

            setPendingText((prevState) => (
                [...prevState, 'Waiting for transaction on other chain']
            ))

            const filter = {
              address: originalToken?.address,
              topics: [
                utils.id("Transfer(address,address,uint256)")
              ]
            }
            library2?.on(filter, (log) => {
              setSwapState((prevState) => ({
                ...prevState,
                attemptingTxn: false,
                swapErrorMessage: undefined,
                txHash: log.transactionHash,
              }))
              setPendingText([])
            })
          })
          .catch((err: Error) => {
            setSwapState((prevState) => ({
              ...prevState,
              attemptingTxn: false,
              swapErrorMessage: err.message,
              txHash: undefined,
            }))
            setPendingText([])
            console.error('Failed to unsynthesize token', err)
            throw err
          })
    })
  }, [chainId1, account1, account2, library1, library2, syntheticToken, originalToken])

  const onSwapMined = useCallback(async (receipt: TransactionReceipt) => {
    setPendingText((prevState) => (
        [...prevState, 'Swap transaction mined']
    ))
    if (!library1) {
      console.error('There are no library1')
      return
    }

    const swapAmount = extractSwapAmount(receipt)
    if (!swapAmount) {
      console.error('Cannot extract swap amount')
      return
    }

    if (approvalSynthToken !== ApprovalState.APPROVED) {
      setPendingText((prevState) => (
          [...prevState, 'Approving synthetic token']
      ))

      const approveResponse = await approveSynthToken()
      console.log('approveResponse', approveResponse)

      if (approveResponse) {
        library1?.waitForTransaction(approveResponse.hash).then(() => onApproved(swapAmount))
      }
    } else {
      await onApproved(swapAmount)
    }
  }, [library1, approvalSynthToken, approveSynthToken, onApproved])

  const handleSwap = useCallback(() => {
    if (priceImpactWithoutFee && !confirmPriceImpactWithoutFee(priceImpactWithoutFee)) {
      return
    }
    if (!swapCallback) {
      return
    }
    setPendingText([])
    setSwapState((prevState) => ({
      ...prevState,
      attemptingTxn: true,
      swapErrorMessage: undefined,
      txHash: undefined
    }))
    swapCallback()
        .then((hash) => {
          setSwapState((prevState) => ({
            ...prevState,
            swapErrorMessage: undefined,
            txHash: hash,
          }))
          setPendingText((prevState) => (
              [...prevState, 'Waiting for swap']
          ))
          library1?.waitForTransaction(hash).then(onSwapMined)
        })
        .catch((error) => {
          setSwapState((prevState) => ({
            ...prevState,
            attemptingTxn: false,
            swapErrorMessage: error.message,
            txHash: undefined,
          }))
        })
  }, [priceImpactWithoutFee, swapCallback, setSwapState, library1, onSwapMined])

  // errors
  const [showInverted, setShowInverted] = useState<boolean>(false)

  // warnings on slippage
  const priceImpactSeverity = warningSeverity(priceImpactWithoutFee)

  // show approve flow when: no error on inputs, not approved or pending, or approved in current session
  // never show if price impact is above threshold in non expert mode
  const showApproveFlow =
      !swapInputError &&
      (approval === ApprovalState.NOT_APPROVED ||
          approval === ApprovalState.PENDING ||
          (approvalSubmitted && approval === ApprovalState.APPROVED)) &&
      !(priceImpactSeverity > 3 && !isExpertMode)

  const handleConfirmDismiss = useCallback(() => {
    setSwapState((prevState) => ({...prevState, showConfirm: false}))

    // if there was a tx hash, we want to clear the input
    if (txHash) {
      onUserInput(Field.INPUT, '')
    }
  }, [onUserInput, txHash, setSwapState])

  const handleAcceptChanges = useCallback(() => {
    setSwapState((prevState) => ({...prevState, tradeToConfirm: trade}))
  }, [trade])

  // This will check to see if the user has selected Syrup to either buy or sell.
  // If so, they will be alerted with a warning message.
  const checkForSyrup = useCallback(
      (selected: string, purchaseType: string) => {
        if (selected === 'syrup') {
          setIsSyrup(true)
          setSyrupTransactionType(purchaseType)
        }
      },
      [setIsSyrup, setSyrupTransactionType]
  )

  const handleInputSelect = useCallback(
      (inputCurrency) => {
        setApprovalSubmitted(false) // reset 2 step UI for approvals
        onCurrencySelection(Field.INPUT, inputCurrency)
        if (inputCurrency.symbol.toLowerCase() === 'syrup') {
          checkForSyrup(inputCurrency.symbol.toLowerCase(), 'Selling')
        }
      },
      [onCurrencySelection, setApprovalSubmitted, checkForSyrup]
  )

  const handleMaxInput = useCallback(() => {
    if (maxAmountInput) {
      onUserInput(Field.INPUT, maxAmountInput.toExact())
    }
  }, [maxAmountInput, onUserInput])

  const handleOutputSelect = useCallback((outputCurrency) => {
      const original = wrappedCurrency(outputCurrency, chainId2)
      if(!original) return

      setOriginalToken(original)

      const synthetic = allTokens[invert(tokenMap)[original.address]]
      setSyntheticToken(synthetic)

      onCurrencySelection(Field.OUTPUT, synthetic)
      if (synthetic?.symbol?.toLowerCase() === 'syrup') {
        checkForSyrup(synthetic.symbol.toLowerCase(), 'Buying')
      }
    },
    [onCurrencySelection, checkForSyrup, chainId2, tokenMap, allTokens]
  )

  return (
      <>
        <TokenWarningModal
            isOpen={urlLoadedTokens.length > 0 && !dismissTokenWarning}
            tokens={urlLoadedTokens}
            onConfirm={handleConfirmTokenWarning}
        />
        <SyrupWarningModal
            isOpen={isSyrup}
            transactionType={syrupTransactionType}
            onConfirm={handleConfirmSyrupWarning}
        />
        <CardNav/>
        <AppBody>
          <Wrapper id="swap-page">
            <ConfirmSwapModal
                isOpen={showConfirm}
                trade={trade}
                originalTrade={tradeToConfirm}
                onAcceptChanges={handleAcceptChanges}
                attemptingTxn={attemptingTxn}
                txHash={txHash}
                recipient={recipient}
                allowedSlippage={allowedSlippage}
                onConfirm={handleSwap}
                swapErrorMessage={swapErrorMessage}
                onDismiss={handleConfirmDismiss}
                pendingText={pendingText.map((item, index) => `${index+1}. ${item}`).join("<br/>")}
                chainId={chainId2}
            />
            <PageHeader
                connection={connection1}
                title={TranslateString(8, 'Exchange')}
                description={TranslateString(1192, 'Trade tokens in an instant')}
            />
            <CardBody>
              <AutoColumn gap="md">
                <CurrencyInputPanel
                    label={
                      independentField === Field.OUTPUT && !showWrap && trade
                          ? TranslateString(194, 'From (estimated)')
                          : TranslateString(76, 'From')
                    }
                    value={formattedAmounts[Field.INPUT]}
                    showMaxButton={!atMaxAmountInput}
                    currency={currencies[Field.INPUT]}
                    onUserInput={handleTypeInput}
                    onMax={handleMaxInput}
                    onCurrencySelect={handleInputSelect}
                    otherCurrency={currencies[Field.OUTPUT]}
                    id="swap-currency-input"
                    connection={connection1}
                />
                <AutoColumn justify="space-between">
                  <AutoRow justify={isExpertMode ? 'space-between' : 'center'}
                           style={{padding: '0 1rem'}}>
                    <ArrowWrapper clickable>
                      <IconButton
                          variant="tertiary"
                          onClick={() => {
                            // setApprovalSubmitted(false) // reset 2 step UI for approvals
                            // onSwitchTokens()
                          }}
                          style={{borderRadius: '50%'}}
                          scale="sm"
                      >
                        <ArrowDownIcon color="primary" width="24px"/>
                      </IconButton>
                    </ArrowWrapper>
                    {recipient === null && !showWrap && isExpertMode ? (
                        <LinkStyledButton id="add-recipient-button"
                                          onClick={() => onChangeRecipient('')}>
                          + Add a send (optional)
                        </LinkStyledButton>
                    ) : null}
                  </AutoRow>
                </AutoColumn>
                <CurrencyInputPanel
                    value={formattedAmounts[Field.OUTPUT]}
                    onUserInput={handleTypeOutput}
                    label={
                      independentField === Field.INPUT && !showWrap && trade
                          ? TranslateString(196, 'To (estimated)')
                          : TranslateString(80, 'To')
                    }
                    showMaxButton={false}
                    currency={originalToken}
                    onCurrencySelect={handleOutputSelect}
                    otherCurrency={currencies[Field.INPUT]}
                    id="swap-currency-output"
                    connection={connection2}
                />

                {originalToken && !syntheticToken &&
                <Text color="red">There are no synthetic representation</Text>}

                {recipient !== null && !showWrap ? (
                    <>
                      <AutoRow justify="space-between"
                               style={{padding: '0 1rem'}}>
                        <ArrowWrapper clickable={false}>
                          <ArrowDown size="16" color={theme.colors.textSubtle}/>
                        </ArrowWrapper>
                        <LinkStyledButton id="remove-recipient-button"
                                          onClick={() => onChangeRecipient(null)}>
                          - Remove send
                        </LinkStyledButton>
                      </AutoRow>
                      <AddressInputPanel connection={connection1} id="recipient"
                                         value={recipient}
                                         onChange={onChangeRecipient}/>
                    </>
                ) : null}

                {showWrap ? null : (
                    <Card padding=".25rem .75rem 0 .75rem" borderRadius="20px">
                      <AutoColumn gap="4px">
                        {Boolean(trade) && (
                            <RowBetween align="center">
                              <Text
                                  fontSize="14px">{TranslateString(1182, 'Price')}</Text>
                              <TradePrice
                                  price={trade?.executionPrice}
                                  showInverted={showInverted}
                                  setShowInverted={setShowInverted}
                              />
                            </RowBetween>
                        )}
                        {allowedSlippage !== INITIAL_ALLOWED_SLIPPAGE && (
                            <RowBetween align="center">
                              <Text
                                  fontSize="14px">{TranslateString(88, 'Slippage Tolerance')}</Text>
                              <Text
                                  fontSize="14px">{allowedSlippage / 100}%</Text>
                            </RowBetween>
                        )}
                      </AutoColumn>
                    </Card>
                )}
              </AutoColumn>
              <BottomGrouping>
                {!connection1.account ? (
                    <ConnectWalletButton width="100%"/>
                ) : showWrap ? (
                    <Button disabled={Boolean(wrapInputError)} onClick={onWrap}
                            width="100%">
                      {wrapInputError ??
                      (wrapType === WrapType.WRAP ? 'Wrap' : wrapType === WrapType.UNWRAP ? 'Unwrap' : null)}
                    </Button>
                ) : noRoute && userHasSpecifiedInputOutput ? (
                    <GreyCard style={{textAlign: 'center'}}>
                      <Text
                          mb="4px">{TranslateString(1194, 'Insufficient liquidity for this trade.')}</Text>
                    </GreyCard>
                ) : showApproveFlow ? (
                    <RowBetween>
                      <Button
                          onClick={approveCallback}
                          disabled={approval !== ApprovalState.NOT_APPROVED || approvalSubmitted}
                          style={{width: '48%'}}
                          variant={approval === ApprovalState.APPROVED ? 'success' : 'primary'}
                      >
                        {approval === ApprovalState.PENDING ? (
                            <AutoRow gap="6px" justify="center">
                              Approving <Loader stroke="white"/>
                            </AutoRow>
                        ) : approvalSubmitted && approval === ApprovalState.APPROVED ? (
                            'Approved'
                        ) : (
                            `Approve ${currencies[Field.INPUT]?.symbol}`
                        )}
                      </Button>
                      <Button
                          onClick={() => {
                            if (isExpertMode) {
                              handleSwap()
                            } else {
                              setSwapState({
                                tradeToConfirm: trade,
                                attemptingTxn: false,
                                swapErrorMessage: undefined,
                                showConfirm: true,
                                txHash: undefined,
                              })
                            }
                          }}
                          style={{width: '48%'}}
                          id="swap-button"
                          disabled={
                            !isValid || approval !== ApprovalState.APPROVED || (priceImpactSeverity > 3 && !isExpertMode)
                          }
                          variant={isValid && priceImpactSeverity > 2 ? 'danger' : 'primary'}
                      >
                        {priceImpactSeverity > 3 && !isExpertMode
                            ? `Price Impact High`
                            : `Swap${priceImpactSeverity > 2 ? ' Anyway' : ''}`}
                      </Button>
                    </RowBetween>
                ) : (
                    <Button
                        onClick={() => {
                          if (isExpertMode) {
                            handleSwap()
                          } else {
                            setSwapState({
                              tradeToConfirm: trade,
                              attemptingTxn: false,
                              swapErrorMessage: undefined,
                              showConfirm: true,
                              txHash: undefined,
                            })
                          }
                        }}
                        id="swap-button"
                        disabled={!isValid || (priceImpactSeverity > 3 && !isExpertMode) || !!swapCallbackError}
                        variant={isValid && priceImpactSeverity > 2 && !swapCallbackError ? 'danger' : 'primary'}
                        width="100%"
                    >
                      {swapInputError ||
                      (priceImpactSeverity > 3 && !isExpertMode
                          ? `Price Impact Too High`
                          : `Swap${priceImpactSeverity > 2 ? ' Anyway' : ''}`)}
                    </Button>
                )}
                {showApproveFlow &&
                <ProgressSteps steps={[approval === ApprovalState.APPROVED]}/>}
                {isExpertMode && swapErrorMessage ?
                    <SwapCallbackError error={swapErrorMessage}/> : null}
              </BottomGrouping>
            </CardBody>
          </Wrapper>
        </AppBody>
        <AdvancedSwapDetailsDropdown trade={trade}/>
      </>
  )
}

export default Swap
