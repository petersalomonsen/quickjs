import './app.component.js';
import { APP_NAME, LOGGED_IN_CONTRACT_NAME, clearWalletConnection, getNearConfig } from './near/near.js';
import nearApi from 'near-api-js';

describe('app-component', () => {
    it('should show the logout button if logged in', async () => {
        localStorage.setItem(`${APP_NAME}_wallet_auth_key`, '{"accountId":"psalomo.testnet","allKeys":["ed25519:eNRiyM1MhKyM3bof1XvAEoLfP75YgY8D3EbKfa1yMxb"]}');
        localStorage.setItem('near-api-js:keystore:psalomo.testnet:testnet', 'ed25519:QVuKCUH8AHt6WqxFnsjbaR8pSdjJBXAsnwfB83C5dgsmCMEP6EAmfULWm6bXWNQXCecGcsv2ATBeJKjJjFdEooG');
        clearWalletConnection();
        const appRootElement = document.createElement('app-root');
        document.documentElement.appendChild(appRootElement);

        const logoutMenuItem = await new Promise(resolve => {
            const observer = new MutationObserver((mutationsList, observer) => {
                const logoutMenuItemElement = appRootElement.shadowRoot.querySelector('#logout-menuitem');
                if (logoutMenuItemElement) {
                    observer.disconnect();
                    resolve(logoutMenuItemElement);
                }
            });
            observer.observe(appRootElement.shadowRoot, {
                childList: true,
                subtree: true,
                attributes: true
            });
        });
        expect(logoutMenuItem).not.to.be.undefined;
        expect(appRootElement.shadowRoot.querySelector('#login-menuitem')).to.be.null;
        document.documentElement.removeChild(appRootElement);
    });
    it('should display the login button if not logged in', async () => {
        localStorage.removeItem(`${APP_NAME}_wallet_auth_key`);
        clearWalletConnection();
        const appRootElement = document.createElement('app-root');
        document.documentElement.appendChild(appRootElement);
        const loginMenuItem = await new Promise(resolve => {
            const observer = new MutationObserver((mutationsList, observer) => {
                const loginMenuItemElement = appRootElement.shadowRoot.querySelector('#login-menuitem');
                if (loginMenuItemElement) {
                    observer.disconnect();
                    resolve(loginMenuItemElement);
                }
            });
            observer.observe(appRootElement.shadowRoot, {
                childList: true,
                subtree: true,
                attributes: true
            });
        });
        expect(loginMenuItem).not.to.be.undefined;
        expect(appRootElement.shadowRoot.querySelector('#logout-menuitem')).to.be.null;
        document.documentElement.removeChild(appRootElement);
    });
    it('should logout if clicking logout button', async () => {
        localStorage.setItem(`${APP_NAME}_wallet_auth_key`, '{"accountId":"psalomo.testnet","allKeys":["ed25519:eNRiyM1MhKyM3bof1XvAEoLfP75YgY8D3EbKfa1yMxb"]}');
        localStorage.setItem('near-api-js:keystore:psalomo.testnet:testnet', 'ed25519:QVuKCUH8AHt6WqxFnsjbaR8pSdjJBXAsnwfB83C5dgsmCMEP6EAmfULWm6bXWNQXCecGcsv2ATBeJKjJjFdEooG');
        clearWalletConnection();
        const appRootElement = document.createElement('app-root');
        document.documentElement.appendChild(appRootElement);

        const logoutMenuItem = await new Promise(resolve => {
            const observer = new MutationObserver((mutationsList, observer) => {
                const logoutMenuItemElement = appRootElement.shadowRoot.querySelector('#logout-menuitem');
                if (logoutMenuItemElement) {
                    observer.disconnect();
                    resolve(logoutMenuItemElement);
                }
            });
            observer.observe(appRootElement.shadowRoot, {
                childList: true,
                subtree: true,
                attributes: true
            });
        });
        expect(logoutMenuItem).not.to.be.undefined;

        logoutMenuItem.click();
        await new Promise(resolve => {
            const observer = new MutationObserver((mutationsList, observer) => {
                if (appRootElement.shadowRoot.querySelector('#logout-menuitem') == null) {
                    observer.disconnect();
                    resolve();
                }
            });
            observer.observe(appRootElement.shadowRoot, {
                childList: true,
                subtree: true,
                attributes: true
            });
        });
        while (localStorage.getItem(`${APP_NAME}_wallet_auth_key`)) {
            await new Promise(r => setTimeout(r, 0));
        }
        expect(localStorage.getItem(`${APP_NAME}_wallet_auth_key`)).to.be.null;
        expect(appRootElement.shadowRoot.querySelector('#logout-menuitem')).to.be.null;
        expect(appRootElement.shadowRoot.querySelector('#login-menuitem')).not.to.be.null;

        document.documentElement.removeChild(appRootElement);
    });
    it('should receive key from wallet when logging in', async () => {
        localStorage.removeItem(`${APP_NAME}_wallet_auth_key`);

        const randomNumber = Math.floor(Math.random() * (99999999999999 - 10000000000000) + 10000000000000);

        const accountId = `dev-${Date.now()}-${randomNumber}`;
        localStorage.setItem(LOGGED_IN_CONTRACT_NAME, accountId);
        const nearConfig = getNearConfig();
        const keyPair = await nearApi.KeyPair.fromRandom('ed25519');

        const keyStore = new nearApi.keyStores.BrowserLocalStorageKeyStore();
        await keyStore.setKey(nearConfig.networkId, 'pending_key' + keyPair.publicKey, keyPair);

        history.pushState(null, null, `/?account_id=${accountId}&public_key=${keyPair.publicKey}&all_keys=${keyPair.publicKey}`);
        const appRootElement = document.createElement('app-root');
        document.documentElement.appendChild(appRootElement);
        await appRootElement.readyPromise;

        expect(localStorage.getItem(`${APP_NAME}_wallet_auth_key`)).not.to.be.null;
        expect(appRootElement.shadowRoot.getElementById('loggedinuserspan').innerHTML).to.equal(`${accountId} @ ${accountId}`);
    })
});