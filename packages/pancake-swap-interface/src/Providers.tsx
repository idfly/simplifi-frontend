import React from 'react'
import { createWeb3ReactRoot, Web3ReactProvider } from '@web3-react/core'
import { Provider } from 'react-redux'
import { ModalProvider } from '@pancakeswap-libs/uikit'
import { NetworkContextName, NetworkContextName2 } from './constants'
import store from './state'
import getLibrary from './utils/getLibrary'
import { ThemeContextProvider } from './ThemeContext'

const Web3ProviderNetwork = createWeb3ReactRoot(NetworkContextName)
const Web3ProviderNetwork2 = createWeb3ReactRoot(NetworkContextName2)

const Providers: React.FC = ({ children }) => {
  return (
    <Web3ReactProvider getLibrary={getLibrary}>
      <Web3ProviderNetwork getLibrary={getLibrary}>
        <Web3ProviderNetwork2 getLibrary={getLibrary}>
          <Provider store={store}>
            <ThemeContextProvider>
              <ModalProvider>{children}</ModalProvider>
            </ThemeContextProvider>
          </Provider>
        </Web3ProviderNetwork2>
      </Web3ProviderNetwork>
    </Web3ReactProvider>
  )
}

export default Providers
