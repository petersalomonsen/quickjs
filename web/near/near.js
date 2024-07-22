import nearApi from 'near-api-js';
import { showLoginDialog } from './near.component.js';

export const APP_NAME = 'js-in-rust';

const networkId = (location.origin == 'https://jsinrust.near.page' ? 'mainnet' : 'testnet');
const accountPostFix = (networkId == 'testnet' ? networkId : 'near');
const contracts = [`jsinrust.${accountPostFix}`]

export const LOGGED_IN_CONTRACT_NAME = 'loggedincontractname';
const nearconfig = {
    nodeUrl: `https://rpc.${networkId}.near.org`,
    archiveNodeUrl: `https://archival-rpc.${networkId}.near.org`,
    contractName: `jsinrust.${accountPostFix}`,
    walletUrl: networkId == 'testnet' ? 'https://testnet.mynearwallet.com/' : 'https://app.mynearwallet.com/',
    helperUrl: `https://helper.${networkId}.near.org`,
    networkId: networkId,
    keyStore: null
};
let walletConnection;

function b64DecodeUnicode(str) {
    return decodeURIComponent(atob(str).split('').map(function (c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
}

export function getNearConfig() {
    return nearconfig;
}

export async function byteArrayToBase64(data) {
    return await new Promise(r => {
        const fr = new FileReader();
        fr.onload = () => r(fr.result.split('base64,')[1]);
        fr.readAsDataURL(new Blob([data]));
    });
}

export function createWalletConnection() {
    if (walletConnection) {
        return walletConnection;
    }
    walletConnection = new Promise(async resolve => {
        nearconfig.keyStore = new nearApi.keyStores.BrowserLocalStorageKeyStore();
        nearconfig.contractName = localStorage.getItem(LOGGED_IN_CONTRACT_NAME);

        const near = await nearApi.connect(nearconfig);
        const wc = new nearApi.WalletConnection(near, APP_NAME);
        resolve(wc);
    });
    return walletConnection;
}

export function clearWalletConnection() {
    walletConnection = null;
}

export async function checkSignedin() {
    const wc = await createWalletConnection();
    const acc = wc.account();

    if (!(await acc.connection.signer.getPublicKey(acc.accountId, acc.connection.networkId))
        || !nearconfig.contractName
    ) {
        wc.signOut();
    }

    if (!wc.isSignedIn()) {
        const contractId = await showLoginDialog(contracts);
        if (contractId) {
            localStorage.setItem(LOGGED_IN_CONTRACT_NAME, contractId);
            await wc.requestSignIn({
                contractId
            });
        } else {
            return null;
        }
    }
    return wc;
}

export function getSuggestedDepositForContract(contractbytelength) {
    return nearApi.utils.format.parseNearAmount(`${contractbytelength / 1000}`);
}

export async function deployJScontract(javascriptsource, deposit = undefined, deployMethodName = 'post_javascript') {
    const wc = await createWalletConnection();
    if (await checkSignedin()) {
        if (deployMethodName == 'deploy_js_contract') {
            await wc.account().functionCall({
                contractId: nearconfig.contractName,
                methodName: deployMethodName,
                args: contractbytes,
                attachedDeposit: deposit
            });
        } else {
            await wc.account().functionCall({
                contractId: nearconfig.contractName,
                methodName: deployMethodName,
                args: {
                    "javascript": javascriptsource
                }, gas: '300000000000000', attachedDeposit: deposit
            });
        }
    }
}

export async function initNFTContract() {
    const wc = await createWalletConnection();
    if (await checkSignedin()) {
        console.log('initializing NFT contract');
        await wc.account().functionCall({ contractId: nearconfig.contractName, methodName: 'new', args: {} });
    }
}

export async function isStandaloneMode() {
    const account = (await createWalletConnection()).account();
    return (await account.findAccessKey()).accessKey.permission == 'FullAccess';
}

export async function deployStandaloneContract(wasmbytes) {
    const wc = await createWalletConnection();
    if (await checkSignedin()) {
        if (await isStandaloneMode()) {
            const result = await wc.account().deployContract(wasmbytes);
            console.log(result);
        } else {
            throw ('Full access key is required to deploy standalone contracts');
        }
    }
}

export async function callJSContract(contractAccount, methodName, args, deposit) {
    const wc = await checkSignedin();
    if (wc) {
        let input = Buffer.concat([Buffer.from(contractAccount), Buffer.from([0]), Buffer.from(methodName), Buffer.from([0]), Buffer.from(args)]);
        return await wc.account().functionCall({ contractId: nearconfig.contractName, methodName: 'call_js_contract', args: input, attachedDeposit: deposit ? nearApi.utils.format.parseNearAmount(deposit) : undefined });
    }
}

export async function callStandaloneContract(contractAccount, methodName, args, deposit, gas) {
    const wc = await checkSignedin();
    if (wc) {
        return await wc.account().functionCall({
            contractId: contractAccount, methodName, args, gas: gas ? gas : (30n * 100_00000_00000n).toString(),
            attachedDeposit: deposit ? typeof deposit === 'bigint' ? deposit.toString() : nearApi.utils.format.parseNearAmount(deposit) : undefined
        });
    }
}

export async function createContractCallTransaction(contractAccount, methodName, args, deposit, gas) {
    const wc = await checkSignedin();
    if (wc) {
        return await wc.account().functionCall({
            contractId: contractAccount, methodName, args, gas: gas ? gas : (30n * 100_00000_00000n).toString(),
            attachedDeposit: deposit ? typeof deposit === 'bigint' ? deposit.toString() : nearApi.utils.format.parseNearAmount(deposit) : undefined
        });
    }
}

export async function createFunctionCallTransaction({ receiverId, methodName, args = {}, gas = '300000000000000', attachedDeposit = '0', walletMeta, walletCallbackUrl, stringify, jsContract }) {
    const walletConnection = await createWalletConnection();

    const senderAccount = walletConnection.account();

    const publicKey = await senderAccount.connection.signer.getPublicKey(senderAccount.accountId, senderAccount.connection.networkId);

    const accessKey = (await senderAccount.findAccessKey()).accessKey;
    const nonce = ++accessKey.nonce;
    const recentBlockHash = nearApi.utils.serialize.base_decode(
        accessKey.block_hash
    );

    const transaction = nearApi.transactions.createTransaction(
        senderAccount.accountId,
        publicKey,
        receiverId,
        nonce,
        [nearApi.transactions.functionCall(methodName, args, gas, attachedDeposit)],
        recentBlockHash
    );
    const [txHash, signedTx] = await nearApi.transactions.signTransaction(transaction, senderAccount.connection.signer, senderAccount.accountId, senderAccount.connection.networkId);
    return {
        txHash: nearApi.utils.serialize.base_encode(txHash), signedTx
    }
}

export async function viewStandaloneContract(account_id, method_name, args) {
    const wc = await checkSignedin();
    if (wc) {
        const contract  = new nearApi.Contract(
            wc.account(),
            account_id, {
            viewMethods: [method_name]
        });

        return await contract[method_name](args);
    }
}

export async function logout() {
    const wc = await createWalletConnection();
    await wc.signOut();
    console.log('logged out');
    clearWalletConnection();
}

export async function getTargetContractName() {
    return (await createWalletConnection()).account().accountId;
}

export function getProvider() {
    return new nearApi.providers.JsonRpcProvider(
        `https://rpc.${networkId}.near.org`
    );
}