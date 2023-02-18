import { useState, useRef, useEffect } from 'react'
import { useWeb3React } from '@web3-react/core'
import Modal from 'react-modal'
import { ethers } from "ethers";

import { injected, walletconnector, bsc } from './utils/connector'
import { wallets } from './components/constants'

import './App.css';
import './style.css';

import { ToastsContainer, ToastsStore } from 'react-toasts';
import { MerkleTree } from "merkletreejs";


import 'swiper/swiper.min.css'
import 'swiper/modules/pagination/pagination.min.css'

import UnicornsABI from "./contracts/Unicorn.json";

import whiteListAddresses from './utils/whitelists.json'

const Cancel = 'images/cancel.svg';
const UnicornAddress = "0x5A5dDF94B6DD86d2914c5c496107026D878927df";

function App() {
  const [isOpen, setOpen] = useState(false);
  // const [modalOpen, setModalOpen] = useState(false);
  const [mintAmount, setMintAmount] = useState(1);
  const [txnState, setTxnState] = useState(false);

  const { account, chainId, activate, deactivate } = useWeb3React();

  //if mintstep is 1, it is presale. else that is 2 it is public sale.
  const [mintStep, setMintStep] = useState(0);
  const [busy, setBusy] = useState(false);

  const [tokenIdList, setTokenIdList] = useState([]);
  const [stakedTokenIds, setStakedTokenIds] = useState([]);
  const [activeNumber, setActiveNumber] = useState([]);
  const [claimState, setClaimState] = useState(false);
  const [updateState, setUpdateState] = useState(false);
  const [mintSuccess, setMintSuccess] = useState(false);

  // console.log(whiteListAddresses);

  useEffect(async () => {

    const { ethereum } = window;
    if (ethereum && account) {
      let provider = new ethers.providers.Web3Provider(ethereum);
      const accounts = await provider.listAccounts();
      if (accounts.length > 0) {
        const { chainId } = await provider.getNetwork();
        if (chainId !== 0x1) {
          ToastsStore.error("Please set network properly.");
          return;
        }
      }
    }
  }, [account])


  const getMintStep = async () => {
    let unix_presale_time = 1676750400;
    let unix_public_time = 1676772000;

    let date1 = new Date(unix_presale_time * 1000)
    let date2 = new Date(unix_public_time * 1000)
    let date = new Date();

    var seconds = (date1 - date) / 1000;
    // console.log(seconds);


    if (date > date1)
      setMintStep(1);
    else if (date > date2)
      setMintStep(2);

  }

  setInterval(getMintStep, 1000);


  const customStyles = {
    content: {
      top: '50%',
      left: '50%',
      right: 'auto',
      bottom: 'auto',
      marginRight: '-50%',
      transform: 'translate(-50%, -50%)',
      width: '20%',
      height: '300px',
      borderRadius: '15px',
      background: 'rgba(0, 0, 0, 0.95)',
      paddingTop: '10px',
      minWidth: '250px',
    },
  }

  const walletModalOpen = async () => {
    setOpen(true);
  }

  const walletDisconnect = async () => {
    setTokenIdList([]);
    deactivate();
  }

  const closeModal = () => {
    setOpen(false)
  }

  const handleLogin = async (wname) => {
    let sign = 1;
    if (wname === 'Wallet Connect') {
      await activate(walletconnector);
    } else if (wname === 'Binance Wallet') {
      await activate(bsc)
    } else if (wname === 'Metamask') {
      await activate(injected);
    } else {
      ToastsStore.error("This supports only Metamask and Wallet Connect");
    }
    setOpen(false);
    tokenInitFunction();
  }

  const subMintNumber = async () => {
    if (mintAmount - 1 <= 1)
      setMintAmount(1);
    else
      setMintAmount(mintAmount - 1);
  }

  const addMintNumber = async () => {
    if (mintAmount >= 5)
      setMintAmount(5);
    else
    setMintAmount(mintAmount + 1);
  }

  const buf2hex = async (x) => {
    return '0x' + x.toString('hex');
  }

  const mintNow = async () => {
    const { ethereum } = window;
    if (txnState) {
      ToastsStore.error("Transaction is performing now. Please wait and try again");
      return;
    }
    if (ethereum) {
      let provider = new ethers.providers.Web3Provider(ethereum);
      const accounts = await provider.listAccounts();
      if (accounts.length > 0) {
        const { chainId } = await provider.getNetwork();
        if (chainId !== 0x1) {
          return;
        }

        setTxnState(true);

        const signer = provider.getSigner();
        const UnicornContract = new ethers.Contract(UnicornAddress, UnicornsABI, signer);
        const presalePrice = await UnicornContract.preSalePrice();
        const publicSalePrice = await UnicornContract.publicSalePrice();

        let balance = await provider.getBalance(accounts[0]);
        balance = Number(balance);

        if (mintStep == 1) {
          let price = mintAmount * presalePrice;
          console.log(price, balance);

          if (balance <= mintAmount * presalePrice) {
            ToastsStore.error("Sorry. Fund is insufficient.");
            setTxnState(false);
            tokenInitFunction();
            return;
          }

          const { keccak256 } = ethers.utils;

          const leaves = whiteListAddresses.map(x => keccak256(x));
          const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });

          const root = '0x' + tree.getRoot().toString('hex');
          const leaf = keccak256(account);
          const proof = tree.getProof(leaf).map(x => '0x' + x.data.toString('hex'));

          try {
            const nftTxn = await UnicornContract.preSale(mintAmount, proof, { value: `${price}` });
            ToastsStore.success("Minting...please wait.");
            await nftTxn.wait();
            setMintSuccess(true);
            // ToastsStore.success(`Minted, see transaction: https://goerli.etherscan.io/tx/${nftTxn.hash}`);
          } catch (e) {
            console.log(e)
            ToastsStore.error("Sorry. NFT not performed.");
            setTxnState(false);
            tokenInitFunction();
            return;
          }
        }
        else if (mintStep == 2) {
          let price = mintAmount * publicSalePrice;
          if (balance <= mintAmount * publicSalePrice) {
            ToastsStore.error("Sorry. NFT Mint did not work.");
            setTxnState(false);
            tokenInitFunction();
            return;
          }

          try {
            const nftTxn = await UnicornContract.publicSale(mintAmount, { value: `${price}` });
            await nftTxn.wait();
            ToastsStore.success("Minting...please wait.");
            // ToastsStore.success(`Minted, see transaction: https://goerli.etherscan.io/tx/${nftTxn.hash}`);
            setMintSuccess(true);
          } catch (e) {
            console.log(e)
            ToastsStore.error("Sorry. Error occured.");
            setTxnState(false);
            tokenInitFunction();
            return;
          }
        }
        ToastsStore.error("Sorry. It is not presale time yet.");
      } else {
        ToastsStore.error("Please connect the wallet");
      }
    } else {
      ToastsStore.error("Please install Metamask!");
    }
    setTxnState(false);
    tokenInitFunction();
  }

  const tokenInitFunction = async () => {
    const { ethereum } = window;
    if (ethereum) {
      let provider = new ethers.providers.Web3Provider(ethereum);
      const accounts = await provider.listAccounts();
      if (accounts.length > 0) {
        const { chainId } = await provider.getNetwork();
        if (chainId !== 0x1) {
          ToastsStore.error("Please set network properly.");
          return;
        }
      } else {
        ToastsStore.error("Please connect the wallet");
      }
    } else {
      ToastsStore.error("Please install Metamask!");
    }
  }


  return (
    <div className={'background overflow-y-scroll navbar_container'}>
      <nav className={'py-5 hidden xl:flex justify-between items-center  px-3 z-10 '}>
        <img src={require('./assets/images/main.png').default} className={'w-12 object-contain logo_img'} />
        <div className={'flex items-center'}>
          <div className={'flex items-center space-x-7'}>
            {!account ? (
              <button onClick={walletModalOpen} className={'flex justify-center items-center rounded-full px-6 py-2 text-sm text-white relative h-10'}>
                <img src={require('./assets/images/btn.png').default} className={'absolute h-14 w-48'} style={{ zIndex: -1 }} />
                CONNECT WALLET
              </button>
            ) : (
              <button onClick={walletDisconnect} className={'flex justify-center items-center rounded-full px-6 py-2 text-sm text-white relative h-10'}>
                <img src={require('./assets/images/btn.png').default} className={'absolute h-14 w-48'} style={{ zIndex: -1 }} />
                {account.slice(0, 9) + '...' + account.slice(account.length - 7, account.length)}
              </button>
            )}

          </div>
        </div>
      </nav>
      <nav className={'px-5 py-2 items-center xl:hidden'} style={{ backgroundColor: 'rgba(0,0,0, .6)' }}>
        <div className={'flex justify-between items-center'}>
          <img
            src={require('./assets/images/logo.png').default} className={'w-12 object-contain'} />
          <a className={'border border-gray-500 px-4 py-2 rounded-md cursor-pointer'} onClick={() => setOpen(!isOpen)}>
            <img src={require('./assets/images/menu-icon.svg').default} alt={''} className={'w-4'} />
          </a>
        </div>

        {isOpen && <div className={'flex items-center space-x-10 mt-4 mb-4'}>

          <button className={'flex justify-center items-center rounded-full px-6 py-2 text-sm text-white relative h-10'}>
            <img src={require('./assets/images/btn.png').default} className={'absolute h-14 w-48'} style={{ zIndex: -1 }} />
            CONNECT WALLET
          </button>

        </div>}
      </nav>

      <div className={'pt-10 pb-16'} id={'nfts'}>
        <img src={require('./assets/images/main.png').default} className="mainImage" />
        <div className={'flex justify-center items-center text-5xl font-semibold text-color-purple my-10'}>WELCOME TO CRAZYTOWN</div>

        <div className="mint_container">

          {account ? (
            <>
              {txnState ? (
                <div className="mint-area flex justify-center flex-col items-center ">
                  <div className="spinner-container">
                    <img width={300} src={require('./assets/images/loading.gif').default} />
                  </div>
                  <div className={'mt-5 text-center text-2xl text-white font-medium loading-character'}>Pending Transaction now...</div>
                </div>
              ) : (
                <div className="mint-area flex justify-center flex-col items-center ">
                  <div className={'flex w-full justify-center items-center text-5xl font-semibold text-color my-10'}>MINT</div>
                  {mintSuccess == false ? 
                  <div className='flex w-1/3 justify-center items-center flex-col w-100'>
                    <div className='mint_amount flex flex-row'>
                      <button className="rounded-full w-8 ctrl-number" onClick={subMintNumber}>
                        -
                      </button>
                      <input
                        type="number"
                        id="first_name"
                        value={mintAmount}
                        readOnly
                        className="rounded flex text-black ml-5 mr-5" required />
                      <button className="rounded-full w-8 ctrl-number" onClick={addMintNumber}>
                        +
                      </button>
                    </div>
                    <div className='flex flex-row description'>
                      <b>Max Amount:</b> &nbsp;&nbsp; <b>5</b>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                    </div>
                    <div className='flex flex-row description'>
                      <b>Mint Step:</b> &nbsp;&nbsp; <b>{mintStep == 1 ? "Presale" : mintStep == 2 ? "PublicSale" : "Wating for Presale now."}</b>
                    </div>
                    <div className='flex flex-row description'>
                      <b>Mint Price:</b> &nbsp;&nbsp; <b>{mintStep == 1 ? "0.1 TBA" : mintStep == 2 ? "0.15 TBA" : ""}</b>
                    </div>
                    <div className='mintnow'>
                      <button onClick={mintNow} className={'flex justify-center items-center rounded-full px-6 py-2 mt-10 text-sm text-white relative h-10 cta-button'}>
                        <img src={require('./assets/images/btn.png').default} className={'absolute h-14 w-48'} style={{ zIndex: 1 }} />
                        <font>MINT NOW</font>
                      </button>
                    </div>
                  </div>
                  :
                  <h4>
                    AWESOME! I just joined the Crazy Little Unicorns fam! If you’re busy chasing your dreams + working on living your best life, come join us. a little crazy goes a long way! 🦄🔥🚀 www.mint.crazylittleunicorns.com
                  </h4>
                }
                </div>
              )}

            </>
          ) : (
            <>
              <p>
                A little crazy goes a long way.
              </p>
              <button onClick={walletModalOpen} className={'component_wallet'}>
                CONNECT WALLET
              </button>
            </>
          )}
        </div>
        <Modal
          isOpen={isOpen}
          closeModal={closeModal}
          style={customStyles}
          contentLabel="Example Modal"
          onRequestClose={closeModal}
        >
          <div style={{ borderBottom: '1px solid silver', padding: '3px' }}>
            <img
              src={Cancel}
              style={{
                background: 'transparent',
                width: '25px',
                color: 'white',
                border: '0',
                float: 'right',
              }}
              onClick={closeModal}
            />
            <br />
            Connect Wallet
          </div>
          <br />
          {wallets.map((wallet) => (
            <div
              key={wallet.name}
              className="wallet-modal__list__item"
              onClick={() => handleLogin(wallet.name)}
            >
              <font className="font-size-14">{wallet.name}</font>
              <img src={wallet.icon} alt={wallet.name} />
            </div>
          ))}
        </Modal>
      </div>
      <ToastsContainer store={ToastsStore} />
    </div>
  );
}

export default App;
