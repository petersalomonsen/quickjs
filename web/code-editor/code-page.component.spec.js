import '@material/mwc-top-app-bar';
import '@material/mwc-icon-button';
import '@material/mwc-button';
import '@material/mwc-dialog';
import '@material/mwc-drawer';
import '@material/mwc-list';
import '@material/mwc-textfield';
import '@material/mwc-select';
import '@material/mwc-snackbar';

import { getNearConfig, viewStandaloneContract, clearWalletConnection, APP_NAME } from '../near/near.js';
import './code-page.component.js';

async function waitForElement(rootElement, selector) {
    return await new Promise(resolve => {
        const findElement = () => rootElement.shadowRoot.querySelector(selector);
        const foundElement = findElement();
        if (foundElement) {
            resolve(foundElement);
        }
        const observer = new MutationObserver((mutationsList, observer) => {
            const foundElement = findElement();
            if (foundElement) {
                observer.disconnect();
                resolve(foundElement);
            }
        });
        
        observer.observe(rootElement.shadowRoot, {
            childList: true,
            subtree: true,
            attributes: true
        });
    });
}

describe('codepage-component', function () {
    this.timeout(60000);

    it.skip('should deploy minimum-web4 js contract to new account', async () => {
        const randomNumber = Math.floor(Math.random() * (99999999999999 - 10000000000000) + 10000000000000);

        const accountId = `dev-${Date.now()}-${randomNumber}`;

        const nearConfig = getNearConfig();
        const keyPair = await nearApi.KeyPair.fromRandom('ed25519');
        const near = await nearApi.connect(nearConfig);
        await near.accountCreator.createAccount(accountId, keyPair.publicKey);
        const keyStore = new nearApi.keyStores.BrowserLocalStorageKeyStore();
        await keyStore.setKey(nearConfig.networkId, accountId, keyPair);
        localStorage.setItem('lastSelectedBundleType', 'minimum-web4');
        localStorage.setItem('loggedincontractname', accountId);
        localStorage.setItem(`${APP_NAME}_wallet_auth_key`, JSON.stringify({ accountId: accountId, allKeys: [keyPair.publicKey] }));
        clearWalletConnection();

        const codePageElement = document.createElement('code-page');
        document.body.appendChild(codePageElement);

        const sourcecodeeditor = await waitForElement(codePageElement, '#sourcecodeeditor');
        await codePageElement.readyPromise;

        const src = `export function web4_get() {
            const request = JSON.parse(env.input()).request;
        
            let response;
        
            if (request.path == '/index.html') {
                response = {
                    contentType: "text/html; charset=UTF-8",
                    body: env.base64_encode('hello')
                };
            }
            env.value_return(JSON.stringify(response));
        }
        `;
        sourcecodeeditor.value = src;
        expect(sourcecodeeditor.value).to.equal(src);

        const deployButton = codePageElement.shadowRoot.querySelector('#deploybutton');

        const deployContractDialog = codePageElement.shadowRoot.querySelector('#deploy-contract-dialog');
        deployButton.click();
        await new Promise(r => setTimeout(() => r(), 300));
        deployContractDialog.querySelector('mwc-button[dialogAction=deploy]').click();

        const successDeploySnackbar = codePageElement.shadowRoot.querySelector('#successDeploySnackbar');
        await new Promise(resolve => {
            new MutationObserver((mutationsList, observer) => {
                observer.disconnect();
                resolve();
            }).observe(successDeploySnackbar, { attributeFilter: ['open'] });
        });

        const response = await viewStandaloneContract(accountId, 'web4_get', { request: { path: '/index.html' } });
        expect(response).to.deep.equal({ contentType: 'text/html; charset=UTF-8', body: 'aGVsbG8=' });
        console.log('web4-minimum contract is deployed');
    });

    it.skip('should deploy minimum nft js contract to new account', async () => {
        const randomNumber = Math.floor(Math.random() * (99999999999999 - 10000000000000) + 10000000000000);

        const accountId = `dev-${Date.now()}-${randomNumber}`;

        const nearConfig = getNearConfig();
        const keyPair = await nearApi.KeyPair.fromRandom('ed25519');
        const near = await nearApi.connect(nearConfig);
        await near.accountCreator.createAccount(accountId, keyPair.publicKey);
        const keyStore = new nearApi.keyStores.BrowserLocalStorageKeyStore();
        await keyStore.setKey(nearConfig.networkId, accountId, keyPair);
        localStorage.setItem('lastSelectedBundleType', 'nft');
        localStorage.setItem('loggedincontractname', accountId);
        localStorage.setItem(`${APP_NAME}_wallet_auth_key`, JSON.stringify({ accountId: accountId, allKeys: [keyPair.publicKey] }));
        clearWalletConnection();

        const codePageElement = document.createElement('code-page');
        document.body.appendChild(codePageElement);

        const sourcecodeeditor = await waitForElement(codePageElement, '#sourcecodeeditor');
        await codePageElement.readyPromise;

        const src = `export function web4_get() {
            const request = JSON.parse(env.input()).request;
        
            let response;
        
            if (request.path == '/index.html') {
                response = {
                    contentType: "text/html; charset=UTF-8",
                    body: env.base64_encode('hello from nft')
                };
            }
            env.value_return(JSON.stringify(response));
        }
        `;
        sourcecodeeditor.value = src;
        expect(sourcecodeeditor.value).to.equal(src);

        const deployButton = codePageElement.shadowRoot.querySelector('#deploybutton');
        const deployContractDialog = codePageElement.shadowRoot.querySelector('#deploy-contract-dialog');
        deployButton.click();
        
        await new Promise(r => setTimeout(() => r(), 300));
        deployContractDialog.querySelector('mwc-button[dialogAction=deploy]').click();

        const successDeploySnackbar = codePageElement.shadowRoot.querySelector('#successDeploySnackbar');
        await new Promise(resolve => {
            new MutationObserver((mutationsList, observer) => {
                observer.disconnect();
                resolve();
            }).observe(successDeploySnackbar, { attributeFilter: ['open'] });
        });

        const nft_tokens_response = await viewStandaloneContract(accountId, 'nft_tokens', {});
        console.log(nft_tokens_response);
        expect(nft_tokens_response.length).to.equal(0);
        const response = await viewStandaloneContract(accountId, 'web4_get', { request: { path: '/index.html' } });
        console.log(response);
        expect(response).to.deep.equal({ contentType: 'text/html; charset=UTF-8', body: 'aGVsbG8gZnJvbSBuZnQ=' });
        console.log('nft contract is deployed');
    });
    it('deploy dialog should be possible to cancel', async () => {
        localStorage.setItem('lastSelectedBundleType', 'nft');

        const codePageElement = document.createElement('code-page');
        document.body.appendChild(codePageElement);

        const sourcecodeeditor = await waitForElement(codePageElement, '#sourcecodeeditor');
        await codePageElement.readyPromise;

        const src =`export function web4_get() {
            const request = JSON.parse(env.input()).request;
        
            let response;
        
            if (request.path == '/index.html') {
                response = {
                    contentType: "text/html; charset=UTF-8",
                    body: env.base64_encode('hello from nft')
                };
            }
            env.value_return(JSON.stringify(response));
        }
        `;
        sourcecodeeditor.value = src;
        expect(sourcecodeeditor.value).to.equal(src);

        const deployButton = codePageElement.shadowRoot.querySelector('#deploybutton');
        const deployContractDialog = codePageElement.shadowRoot.querySelector('#deploy-contract-dialog');
        deployButton.click();

        await new Promise(r => setTimeout(() => r(), 300));
        expect(deployContractDialog.open).to.be.true;

        deployContractDialog.querySelector('mwc-button[dialogAction=cancel]').click();
        await new Promise(r => setTimeout(() => r(), 300));
        expect(deployContractDialog.open).to.be.false;

        deployButton.click();
        await new Promise(r => setTimeout(() => r(), 300));
        expect(deployContractDialog.open).to.be.true;

        deployContractDialog.querySelector('mwc-button[dialogAction=cancel]').click();
        expect(deployContractDialog.open).to.be.false;
    })
});
