import {useCallback, useMemo, useState} from 'react'
import {Token} from "@pancakeswap-libs/sdk";
import {BigNumber} from "@ethersproject/bignumber";
import {TransactionReceipt} from "@ethersproject/abstract-provider";
// eslint-disable-next-line import/no-unresolved
import {Web3ReactContextInterface} from "@web3-react/core/dist/types";
import {TransactionResponse, Web3Provider} from "@ethersproject/providers";
import {utils} from "ethers";
import {calculateGasMargin, getSynthesizeContract} from "../utils";
import {ApprovalState, useApproveCallback} from "./useApproveCallback";
import {SYNTHESIZE_ADDRESS} from "../constants";
import {tryParseAmount} from "../state/swap/hooks";
import useTokenMap from "./useTokenMap";

type BurnProps = {
  originalConnection: Web3ReactContextInterface<Web3Provider>
  syntheticConnection: Web3ReactContextInterface<Web3Provider>
  syntheticToken: Token|undefined
  onTxHashChanged?: (newTxHash: string | undefined) => void
  onAttemptingTxnChanged?: (newAttemptingTxn: boolean) => void
  onErrorChanged?: (newError: string | undefined) => void
}

const useBurn = ({
                   originalConnection,
                   syntheticConnection,
                   syntheticToken,
                   onTxHashChanged,
                   onAttemptingTxnChanged,
                   onErrorChanged
                 }: BurnProps) => {
  const [pendingText, setPendingText] = useState<string[]>([])
  const {chainId: chainId1, library: library1, account: account1} = syntheticConnection;
  const {chainId: chainId2, library: library2, account: account2} = originalConnection;

  const {selectSyntheticToken} = useTokenMap(syntheticConnection, originalConnection)
  const originalToken = useMemo((): Token|undefined => {
    if(!syntheticToken) return undefined
    return selectSyntheticToken(syntheticToken)
  }, [syntheticToken, selectSyntheticToken])

  const approveAmount = tryParseAmount('1', syntheticToken)
  const [approval, approve] = useApproveCallback(
      syntheticConnection, approveAmount, chainId1 ? SYNTHESIZE_ADDRESS[chainId1] : undefined
  )

  const burn = useCallback(async (amount: BigNumber) => {
    if (!chainId1 || !library1 || !account1 || !account2) return
    if(!syntheticToken) {
      console.error('Synthetic token was not set')
      return
    }

    setPendingText((prevState) => (
        [...prevState, 'Swap synthetic token to real token on other chain']
    ))

    const synthesize = getSynthesizeContract(chainId1, library1, account1)
    const argsBurn = [syntheticToken.address, amount.toString(), account2]
    console.log('argsBurn', argsBurn)
    const estimateBurn = synthesize.estimateGas.burnSyntheticToken

    await estimateBurn(...argsBurn).then((estimatedGasLimit) => {
      synthesize.burnSyntheticToken(...argsBurn, {
        gasLimit: calculateGasMargin(estimatedGasLimit),
      })
          .then((response: TransactionResponse) => {
            console.log('response', response)

            if(onTxHashChanged) onTxHashChanged(response.hash)
            setPendingText((prevState) => (
                [...prevState, 'Waiting for transaction on other chain']
            ))

            const filter = {
              address: originalToken?.address,
              topics: [
                utils.id("Transfer(address,address,uint256)")
              ]
            }
            library2?.once(filter, (log) => {
              if(onTxHashChanged) onTxHashChanged(log.transactionHash)
              if(onAttemptingTxnChanged) onAttemptingTxnChanged(false)
              if(onErrorChanged) onErrorChanged(undefined)
              setPendingText([])
            })
          })
          .catch((err: Error) => {
            if(onTxHashChanged) onTxHashChanged(undefined)
            if(onAttemptingTxnChanged) onAttemptingTxnChanged(false)
            if(onErrorChanged) onErrorChanged(err.message)
            setPendingText([])
            console.error('Failed to unsynthesize token', err)
            throw err
          })
    })
  }, [chainId1, account1, account2, library1, library2, syntheticToken, originalToken,
    onAttemptingTxnChanged,onTxHashChanged, onErrorChanged])


  const approveAndBurn = useCallback(async (amount: BigNumber) => {
    if (!library1) {
      console.error('There are no library1')
      return
    }

    if (approval !== ApprovalState.APPROVED) {
      setPendingText((prevState) => (
          [...prevState, 'Approving synthetic token']
      ))

      const approveResponse = await approve()
      console.log('approveResponse', approveResponse)

      if (approveResponse) {
        library1?.waitForTransaction(approveResponse.hash).then(() => burn(amount))
      }
    } else {
      await burn(amount)
    }
  }, [library1, approval, approve, burn])

  return {
    approval,
    approve,
    burn,
    approveAndBurn,
    pendingText,
    setPendingText
  }
}

export default useBurn
