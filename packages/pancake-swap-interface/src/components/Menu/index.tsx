import React, { useContext } from 'react'
import { Menu as UikitMenu} from '@pancakeswap-libs/uikit'
import { useWeb3React } from '@web3-react/core'
import { allLanguages } from 'constants/localisation/languageCodes'
import { LanguageContext } from 'hooks/LanguageContext'
import useTheme from 'hooks/useTheme'
import useGetPriceData from 'hooks/useGetPriceData'
import useGetLocalProfile from 'hooks/useGetLocalProfile'
import useAuth from 'hooks/useAuth'
import links from './config'
import {
  NETWORK_NAMES,
  NetworkContextName,
  NetworkContextName2
} from "../../constants";

const Menu: React.FC = (props) => {
  const { account, chainId } = useWeb3React(NetworkContextName)
  const { login, logout } = useAuth(NetworkContextName)

  const { account: account2, chainId: chainId2 } = useWeb3React(NetworkContextName2)
  const { login: login2, logout: logout2 } = useAuth(NetworkContextName2)

  const { selectedLanguage, setSelectedLanguage } = useContext(LanguageContext)
  const { isDark, toggleTheme } = useTheme()
  const priceData = useGetPriceData()
  const cakePriceUsd = priceData ? Number(priceData.prices.Cake) : undefined
  const profile = useGetLocalProfile()

  return (
    <UikitMenu
      links={links}
      account={account as string}
      account2={account2 as string}
      networkName={chainId ? NETWORK_NAMES[chainId] || '' : ''}
      networkName2={chainId2 ? NETWORK_NAMES[chainId2] || '' : ''}
      login={login}
      login2={login2}
      logout={logout}
      logout2={logout2}
      isDark={isDark}
      toggleTheme={toggleTheme}
      currentLang={selectedLanguage?.code || ''}
      langs={allLanguages}
      setLang={setSelectedLanguage}
      cakePriceUsd={cakePriceUsd}
      profile={profile}
      {...props}
    />
  )
}

export default Menu
