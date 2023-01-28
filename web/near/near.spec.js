import { LOGGED_IN_CONTRACT_NAME, checkSignedin, clearWalletConnection, createWalletConnection, getNearConfig } from "./near.js";

describe('near', () => {
    beforeEach(() => {
        const appRootElement = document.createElement('app-root');
        document.documentElement.appendChild(appRootElement);
    });
    afterEach(() => {
        document.querySelector('app-root').remove();
    });

    it('should sign out if loggedincontractname is not in localstorage', async () => {
        clearWalletConnection();
        localStorage.setItem('undefined_wallet_auth_key', '{"accountId":"psalomo.testnet","allKeys":["ed25519:eNRiyM1MhKyM3bof1XvAEoLfP75YgY8D3EbKfa1yMxb"]}');
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
        localStorage.setItem('undefined_wallet_auth_key', '{"accountId":"psalomo.testnet","allKeys":["ed25519:eNRiyM1MhKyM3bof1XvAEoLfP75YgY8D3EbKfa1yMxb"]}');
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
});