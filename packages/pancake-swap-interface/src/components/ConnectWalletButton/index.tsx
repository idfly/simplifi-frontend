import React from 'react'
import { Button, ButtonProps, useWalletModal} from '@pancakeswap-libs/uikit'
import useI18n from 'hooks/useI18n'
import useAuth from 'hooks/useAuth'
import {NetworkContextName} from "../../constants";

interface NetworkNameProps {
  networkContextName?: string;
}

const UnlockButton: React.FC<NetworkNameProps & ButtonProps> = (props) => {
  const TranslateString = useI18n()

  const {networkContextName} = props
  const { login, logout } = useAuth(networkContextName || NetworkContextName)
  const { onPresentConnectModal } = useWalletModal(login, logout)

  return (
    <Button onClick={onPresentConnectModal} {...props}>
      {TranslateString(292, 'Unlock Wallet')}
    </Button>
  )
}

export default UnlockButton
