import '../app.component.js';
import { LOGGED_IN_CONTRACT_NAME, APP_NAME, byteArrayToBase64, checkSignedin, clearWalletConnection, createFunctionCallTransaction, createWalletConnection, getNearConfig, getProvider } from "./near.js";

describe('near', function () {
    this.timeout(60000);
    beforeEach(() => {
        const appRootElement = document.createElement('app-root');
        document.documentElement.appendChild(appRootElement);
    });
    afterEach(() => {
        document.querySelector('app-root').remove();
    });

    it('should sign out if loggedincontractname is not in localstorage', async () => {
        clearWalletConnection();
        localStorage.setItem(`${APP_NAME}_wallet_auth_key`, '{"accountId":"psalomo.testnet","allKeys":["ed25519:eNRiyM1MhKyM3bof1XvAEoLfP75YgY8D3EbKfa1yMxb"]}');
        localStorage.setItem('near-api-js:keystore:psalomo.testnet:testnet', 'ed25519:QVuKCUH8AHt6WqxFnsjbaR8pSdjJBXAsnwfB83C5dgsmCMEP6EAmfULWm6bXWNQXCecGcsv2ATBeJKjJjFdEooG');
        localStorage.removeItem('loggedincontractname');

        const wc = await createWalletConnection();
        console.log(getNearConfig().contractName);

        console.log(wc.account().accountId);
        if (!wc._signOut) {
            wc._signOut = wc.signOut;
        }
        let signedOut = false;
        wc.signOut = () => {
            signedOut = true;
            wc._signOut();
        }

        const appRootElement = document.querySelector('app-root');

        let dialogObservedPromise = new Promise(resolve => {
            const observer = new MutationObserver((mutationsList, observer) => {
                const neardialog = appRootElement.shadowRoot.querySelector('near-dialogs');
                if (neardialog) {
                    observer.disconnect();
                    resolve(neardialog);
                }
            });
            observer.observe(appRootElement.shadowRoot, {
                childList: true,
                subtree: true,
                attributes: true
            });
        });

        checkSignedin();

        const neardialog = await dialogObservedPromise;

        expect(signedOut).to.eq(true);
        const loginButton = await new Promise(resolve => {
            const observer = new MutationObserver((mutationsList, observer) => {
                const loginButton = neardialog.shadowRoot.querySelector('mwc-button[dialogAction="login"]');
                if (loginButton) {
                    observer.disconnect();
                    resolve(loginButton);
                }
            });
            observer.observe(neardialog.shadowRoot, {
                childList: true,
                subtree: true,
                attributes: true
            });
        });
        expect(loginButton).to.not.be.undefined;
        clearWalletConnection();
    });

    it('should not sign out if loggedincontractname is in localstorage', async () => {
        clearWalletConnection();
        localStorage.setItem(`${APP_NAME}_wallet_auth_key`, '{"accountId":"psalomo.testnet","allKeys":["ed25519:eNRiyM1MhKyM3bof1XvAEoLfP75YgY8D3EbKfa1yMxb"]}');
        localStorage.setItem('near-api-js:keystore:psalomo.testnet:testnet', 'ed25519:QVuKCUH8AHt6WqxFnsjbaR8pSdjJBXAsnwfB83C5dgsmCMEP6EAmfULWm6bXWNQXCecGcsv2ATBeJKjJjFdEooG');
        localStorage.setItem(LOGGED_IN_CONTRACT_NAME, 'psalomo.testnet');

        const wc = await createWalletConnection();

        expect(wc.account().accountId).to.equal('psalomo.testnet');
        if (!wc._signOut) {
            wc._signOut = wc.signOut;
        }
        let signedOut = false;
        wc.signOut = () => {
            signedOut = true;
            console.log('signout');
            wc._signOut();
        }

        expect((await checkSignedin()).isSignedIn()).to.be.true;
        expect(signedOut).to.not.be.true;
        clearWalletConnection();
    });

    it('should create a function call transaction and sign it, and send it separately', async () => {
        clearWalletConnection();
        const testaccount = await fetch(new URL('../testnet/testaccount.json', import.meta.url)).then(r => r.json());
        localStorage.setItem(`${APP_NAME}_wallet_auth_key`, `{"accountId":"${testaccount.account_id}","allKeys":["${testaccount.public_key}"]}`);
        localStorage.setItem(`near-api-js:keystore:${testaccount.account_id}:testnet`, testaccount.private_key);
        localStorage.setItem(LOGGED_IN_CONTRACT_NAME, 'psalomo.testnet');
        const { txHash, signedTx } = await createFunctionCallTransaction({ receiverId: 'jsinrust.testnet', methodName: 'fs_store' });
        const txBase64 = await byteArrayToBase64(signedTx.encode());

        let transactionAlreadyPublished = false;
        try {
            await getProvider().sendJsonRpc("tx", [txHash, signedTx.transaction.signerId]);
            transactionAlreadyPublished = true;
        } catch (e) {

        }
        expect(transactionAlreadyPublished).to.be.false;

        await getProvider().sendJsonRpc("broadcast_tx_commit", [txBase64]);
        const onchaintx = await getProvider().sendJsonRpc("tx", [txHash, signedTx.transaction.signerId]);
        expect(onchaintx.status.SuccessValue).to.not.be.undefined;
    });
});