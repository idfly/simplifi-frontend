import React from 'react'
import {Button, CardBody} from '@pancakeswap-libs/uikit'
import { Link } from 'react-router-dom'
import CardNav from 'components/CardNav'
import { useFirstWeb3React } from 'hooks'
import PageHeader from 'components/PageHeader'
import AppBody from '../AppBody'
import {AutoColumn} from "../../components/Column";

export default function Synthesis() {
  const connection = useFirstWeb3React()
  const { chainId } = connection

  const rinkeby = 4
  const nativeCurrency = chainId && chainId > rinkeby ? 'BNB' : 'ETH'

  return (
    <>
      <CardNav activeIndex={2} />
      <AppBody>
        <PageHeader
          connection={connection}
          title="Synthesis"
          description="Synthesize a token in the first chain and get its synthetic representation in another chain"
        />
        <AutoColumn gap="lg" >
          <CardBody>
              <Button id="join-pool-button" as={Link} to={`/synthesize/${nativeCurrency}`}>
                Synthesize
              </Button>
              {' '}
              <Button id="join-pool-button" as={Link} to={`/unsynthesize/${nativeCurrency}`}>
                Unsynthesize
              </Button>
          </CardBody>
        </AutoColumn>
      </AppBody>
    </>
  )
}
