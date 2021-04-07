import {useCallback, useEffect, useState} from 'react'
import {Token} from "@pancakeswap-libs/sdk";
import {invert} from "lodash";
// eslint-disable-next-line import/no-unresolved
import {Web3ReactContextInterface} from "@web3-react/core/dist/types";
import {Web3Provider} from "@ethersproject/providers";
import {useAllTokens} from "./Tokens";
import {getSynthesizeContract} from "../utils";

const useTokenMap = (connection1: Web3ReactContextInterface<Web3Provider>) => {
  const {chainId: chainId1, library: library1, account: account1} = connection1
  const [syntheticToken, setSyntheticToken] = useState<Token | undefined>(undefined)
  const [originalToken, setOriginalToken] = useState<Token | undefined>(undefined)
  const allTokens = useAllTokens(connection1)
  const [tokenMap, setTokenMap] = useState<{[string: string]:string}[]>([])

  const selectOriginalToken = useCallback((newOriginalToken: Token): Token => {
        setOriginalToken(newOriginalToken)

        const synthetic = allTokens[invert(tokenMap)[newOriginalToken.address]]
        setSyntheticToken(synthetic)
        return synthetic
      }, [allTokens, tokenMap])


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

  return {
    syntheticToken,
    originalToken,
    selectOriginalToken
  }
}

export default useTokenMap
