import { InjectedConnector } from '@web3-react/injected-connector';
import { WalletConnectConnector } from '@web3-react/walletconnect-connector';
import { BscConnector } from '@binance-chain/bsc-connector';
import {Buffer} from 'buffer';
Buffer.from('anything','base64');


const POLLING_INTERVAL = 12000

const chainIds = [1, 4, 5,  56, 97];

export const injected = new InjectedConnector({ supportedChainIds: chainIds })

export const walletconnector = new WalletConnectConnector({
  rpc: { 1: "https://mainnet.infura.io/v3/66b1fd9daec44fbeb94eca2b0386b455"},
  bridge: 'https://bridge.walletconnect.org',
  supportedChainIds:[1,4,5,56,97],
  qrcode: true,
});

export const bsc = new BscConnector({ supportedChainIds: chainIds })
