import {useCallback, useEffect, useState} from 'react'
import {CurrencyAmount, Token} from "@pancakeswap-libs/sdk";
// eslint-disable-next-line import/no-unresolved
import {Web3ReactContextInterface} from "@web3-react/core/dist/types";
import {TransactionResponse, Web3Provider} from "@ethersproject/providers";
import {utils} from "ethers";
import {useAllTokens} from "./Tokens";
import {
  calculateGasMargin, getContract,
  getPortalContract,
  getSynthesizeContract
} from "../utils";
import {useTokenContract} from "./useContract";
import {useTransactionAdder} from "../state/transactions/hooks";
import {ApprovalState, useApproveCallback} from "./useApproveCallback";
import {PORTAL_ADDRESS} from "../constants";
import {ERC20_ABI} from "../constants/abis/erc20";

const useSynthesize = (
    originalConnection: Web3ReactContextInterface<Web3Provider>,
    syntheticConnection: Web3ReactContextInterface<Web3Provider>,
    amount: CurrencyAmount | undefined,
) => {

  const addTransaction = useTransactionAdder(originalConnection)

  const allTokens = useAllTokens(originalConnection)

  const originalTokenAddress: string | undefined = Object.keys(allTokens).find((address) => {
    return allTokens[address].symbol === amount?.currency?.symbol
  })
  const originalToken = useTokenContract(originalConnection, originalTokenAddress, true);

  const [txHash, setTxHash] = useState<string>('')
  const [attemptingTxn, setAttemptingTxn] = useState<boolean>(false) // clicked confirm
  const [syntheticToken, setSyntheticToken] = useState<Token|undefined>(undefined)
  const {chainId, library, account} = syntheticConnection;
  const {chainId: originalChainId, library: originalLibrary, account: originalAccount} = originalConnection;

  const syntheticAllTokens = useAllTokens(syntheticConnection);

  const [approval, approve] = useApproveCallback(
      originalConnection, amount, originalChainId ? PORTAL_ADDRESS[originalChainId] : undefined
  )

  useEffect(() => {
    if (!chainId || !library || !account || !originalTokenAddress) return
    setSyntheticToken(undefined);
    (async () => {
      const contract = getSynthesizeContract(chainId, library, account)
      const syntheticTokenAddress = await contract.representationSynt(originalTokenAddress)
      setSyntheticToken(syntheticAllTokens[syntheticTokenAddress] || '')
    })()
  }, [syntheticAllTokens, chainId, library, account, originalTokenAddress])


  const synthesize = useCallback(async (onSynthesize?: () => void): Promise<void> => {
    if (!originalToken || !originalChainId || !originalLibrary || !originalAccount || !account) {
      return
    }

    const portal = getPortalContract(originalChainId, originalLibrary, originalAccount)
    const argsSynt = [originalToken.address, amount?.raw.toString(), account]
    console.log('argsSynt', argsSynt)
    const estimateSynt = portal.estimateGas.synthesize

    setAttemptingTxn(true)

    // eslint-disable-next-line consistent-return
    await estimateSynt(...argsSynt).then((estimatedGasLimit) => {
      portal.synthesize(...argsSynt, {
        gasLimit: calculateGasMargin(estimatedGasLimit),
      })
          .then((response: TransactionResponse) => {
            addTransaction(response, {
              summary: `Synthesize ${amount?.toSignificant()} ${amount?.currency?.symbol}`,
            })

            if (onSynthesize) {
              const filter = {
                address: syntheticToken?.address,
                topics: [
                  utils.id("Transfer(address,address,uint256)")
                ]
              }
              library?.once(filter, (log) => {
                console.log('log', log)
                onSynthesize()
              })
            }

            setTxHash(response.hash)
          })
          .catch((err: Error) => {
            setAttemptingTxn(false)
            console.error('Failed to synthesize token', err)
            throw err
          })
    })
  }, [account, addTransaction, amount, originalAccount, originalChainId, originalLibrary, originalToken, library, syntheticToken])


  const approveAndSynthesize = useCallback(async (onSynthesize: () => void) => {
    if (approval !== ApprovalState.APPROVED) {
      const approveResponse = await approve()
      console.log('approveResponse', approveResponse)
      if (approveResponse) {
        setTxHash(approveResponse.hash)
        originalLibrary?.waitForTransaction(approveResponse.hash).then(() => synthesize(onSynthesize))
      }
    } else {
      await synthesize(onSynthesize)
    }
  }, [approval, approve, synthesize, originalLibrary])

  // useEffect(() => {
  //   if (!originalTokenAddress || !originalLibrary || !originalAccount || !originalChainId) return
  //   const tok = getContract(originalTokenAddress, ERC20_ABI, originalLibrary, originalAccount)
  //   console.log('tok', tok)
  //   tok?.approve(PORTAL_ADDRESS[originalChainId], 0, {})
  // }, [allTokens, originalChainId, originalTokenAddress, originalAccount, originalLibrary])


  return {
    approval,
    approve,
    synthesize,
    syntheticToken,
    attemptingTxn,
    setAttemptingTxn,
    txHash,
    setTxHash,
    approveAndSynthesize
  }
}

export default useSynthesize
