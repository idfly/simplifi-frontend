import React, {useCallback, useEffect, useMemo} from 'react'
import {Button, CardBody} from '@pancakeswap-libs/uikit'
import {TransactionResponse} from "@ethersproject/providers";
import {Token} from "@pancakeswap-libs/sdk";
import {
  ApprovalState,
  useApproveCallback
} from "../../hooks/useApproveCallback";
import {Dots, Wrapper} from "../Pool/styleds";
import {
  GASLESS_ADDRESS,
  NETWORK_NAMES,
  NetworkContextName2
} from "../../constants";
import {tryParseAmount} from "../../state/swap/hooks";
import {useFirstWeb3React, useSecondWeb3React} from "../../hooks";
import {AutoColumn, ColumnCenter} from "../../components/Column";
import AppBody from "../AppBody";
import CardNav from "../../components/CardNav";
import ConnectWalletButton from "../../components/ConnectWalletButton";
import {calculateGasMargin, getGaslessContract} from "../../utils";

export default function Gasless() {
  const connection = useFirstWeb3React() // NOTE: select BSC
  const {account: account1, chainId: chainId1, library: library1} = connection

  const otherConnection = useSecondWeb3React() // NOTE unused
  const {account: account2 } = otherConnection


  const token = useMemo(():Token|undefined=>{
    if(!chainId1) return undefined
    // TODO set token params
    return new Token(chainId1, '0x3Ad02E3A91d32746812f9dc89bce3ab12De9fB06', 18, 'BST', 'BST')
  }, [chainId1])
  const amount = tryParseAmount('1', token)

  const [approval, approve] = useApproveCallback(
      connection, amount, chainId1 ? GASLESS_ADDRESS[chainId1] : undefined
  )
  useEffect(() => {
    console.log({
      approval
    })
  }, [approval])

  const run = useCallback(async (): Promise<void> => {
    if (!token || !chainId1 || !library1 || !account1) {
      return
    }

    const gaslessContract = getGaslessContract(chainId1, library1, account1)
    const args = [token.address, amount?.raw.toString(), account1]
    console.log('args', args)

    // TODO used `synthesize` function. change to right function
    const estimate = gaslessContract.estimateGas.synthesize

    // eslint-disable-next-line consistent-return
    await estimate(...args).then((estimatedGasLimit) => {
      // TODO used `synthesize` function. change to right function
      gaslessContract.synthesize(...args, {
        gasLimit: calculateGasMargin(estimatedGasLimit),
      })
          .then((response: TransactionResponse) => {
            console.log(response)
          })
          .catch((err: Error) => {
            console.error('Failed to run gassless', err)
            throw err
          })
    })
  }, [account1, chainId1, library1, amount, token])

  return (
      <>
        <CardNav activeIndex={2}/>
        <AppBody>
          <Wrapper>
            <CardBody>
              <AutoColumn gap="20px">
                {connection?.chainId && <ColumnCenter>
                  {NETWORK_NAMES[connection.chainId]}
                </ColumnCenter>}
                {!account1 ? (
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
                      <Dots>Approving {token?.symbol}</Dots>
                  ) : (
                      `Approve ${token?.symbol}`
                  )}
                </Button>
                }
                <Button
                    disabled={approval !== ApprovalState.APPROVED}
                    onClick={() => run()}>
                  Run
                </Button>
              </>)}
              </AutoColumn>
            </CardBody>
          </Wrapper>
        </AppBody>
      </>
  )
}
