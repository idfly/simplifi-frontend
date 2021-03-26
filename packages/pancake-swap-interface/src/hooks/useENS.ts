// eslint-disable-next-line import/no-unresolved
import {Web3ReactContextInterface} from "@web3-react/core/dist/types";
import {Web3Provider} from "@ethersproject/providers";
import { isAddress } from '../utils'
import useENSAddress from './useENSAddress'
import useENSName from './useENSName'

/**
 * Given a name or address, does a lookup to resolve to an address and name
 * @param connection connection
 * @param nameOrAddress ENS name or address
 */
export default function useENS(
  connection: Web3ReactContextInterface<Web3Provider>,
  nameOrAddress?: string | null
): { loading: boolean; address: string | null; name: string | null } {
  const validated = isAddress(nameOrAddress)
  const reverseLookup = useENSName(connection, validated || undefined)
  const lookup = useENSAddress(connection, nameOrAddress)

  return {
    loading: reverseLookup.loading || lookup.loading,
    address: validated || lookup.address,
    name: reverseLookup.ENSName ? reverseLookup.ENSName : !validated && lookup.address ? nameOrAddress || null : null
  }
}
