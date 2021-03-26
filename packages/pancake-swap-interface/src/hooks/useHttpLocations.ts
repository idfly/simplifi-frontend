import { useMemo } from 'react'
import contenthashToUri from '../utils/contenthashToUri'
import { parseENSAddress } from '../utils/parseENSAddress'
import uriToHttp from '../utils/uriToHttp'
import useENSContentHash from './useENSContentHash'
import {useFirstWeb3React} from "./index";

export default function useHttpLocations(uri: string | undefined): string[] {
  const connection = useFirstWeb3React();
  const ens = useMemo(() => (uri ? parseENSAddress(uri) : undefined), [uri])
  const resolvedContentHash = useENSContentHash(connection, ens?.ensName)
  return useMemo(() => {
    if (ens) {
      return resolvedContentHash.contenthash ? uriToHttp(contenthashToUri(resolvedContentHash.contenthash)) : []
    } 
      return uri ? uriToHttp(uri) : []
    
  }, [ens, resolvedContentHash.contenthash, uri])
}
