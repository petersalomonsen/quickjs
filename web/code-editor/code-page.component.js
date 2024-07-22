import './code-editor.component.js';
import './args-editor.component.js';
import { initNFTContract, deployJScontract, deployStandaloneContract, getSuggestedDepositForContract, isStandaloneMode, callStandaloneContract, createWalletConnection } from '../near/near.js';
import { toggleIndeterminateProgress } from '../common/progressindicator.js';
import html from './code-page.component.html.js';
import css from './code-page.component.css.js';
import { WASM_URLS, getContractSimulationInstance, loadContractWasmIntoSimulator } from '../compiler/jsinrust/contract-wasms.js';
import * as nearenv from '../compiler/jsinrust/wasm-near-environment.js';

class CodePageComponent extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.readyPromise = this.loadHTML();
    }

    async loadHTML() {
        this.shadowRoot.innerHTML = `<style>${css}</style>${html}`;

        const sourcecodeeditor = this.shadowRoot.getElementById('sourcecodeeditor');
        await sourcecodeeditor.readyPromise;
        this.sourcecodeeditor = sourcecodeeditor;
        const lastSavedSourceCode = localStorage.getItem('lastSavedSourceCode');
        const lastSelectedBundleType = localStorage.getItem('lastSelectedBundleType');

        sourcecodeeditor.value = lastSavedSourceCode ? lastSavedSourceCode : `export function hello() {
            env.log("Hello Near");
        }`;
        sourcecodeeditor.addEventListener('save', () => this.save());

        const askAIButton = this.shadowRoot.getElementById('askaibutton');
        askAIButton.addEventListener('click', async () => {
            toggleIndeterminateProgress(true);

            const walletConnection = await createWalletConnection();
            await walletConnection.isSignedInAsync();

            const accountId = walletConnection.account().accountId;

            const messages = [
                {
                    "role": "user", "content": `The following Javascript code will return web content.
\`\`\`
export function web4_get() {
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
\`\`\`

And this will create an NFT payout structure with 80% to the token owner and 20% to the contract owner.
It also returns amount according to the input balance.

\`\`\`
export function nft_payout() {
    const args = JSON.parse(env.input());
    const balance = BigInt(args.balance);
    const payout = {};
    const token_owner_id = JSON.parse(env.nft_token(args.token_id)).owner_id;
    const contract_owner = env.contract_owner();
    
    const addPayout = (account, amount) => {
        if (!payout[account]) {
        payout[account] = 0n;
        }
        payout[account] += amount;
    };
    addPayout(token_owner_id, balance * BigInt(80_00) / BigInt(100_00));
    addPayout(contract_owner, balance * BigInt(20_00) / BigInt(100_00));
    Object.keys(payout).forEach(k => payout[k] = payout[k].toString());
    return JSON.stringify({ payout });
}
\`\`\`
                `},
                { "role": "user", "content": `In the next message I will show you some Javascript code. For those lines that starts with \`AI:\`, replace with javascript code according to the text on that line ( which can be in any human language ), and only give me the fully updated javascript code without any extra text before or after.` },
                { "role": "user", "content": sourcecodeeditor.value }
            ];

            const messagesStringified = JSON.stringify(messages);
            const deposit = BigInt(messagesStringified.length) * 10000000000000000000n;

            const message_hash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(messagesStringified))))
                .map((b) => b.toString(16).padStart(2, "0"))
                .join("");
            const result = await callStandaloneContract('jsinrust.near', 'ask_ai', {
                message_hash
            }, deposit);

            const airesponse = await fetch('https://near-openai.vercel.app/api/openai', {
                method: 'POST',
                body: JSON.stringify({
                    transaction_hash: result.transaction.hash,
                    sender_account_id: accountId,
                    messages: messages
                })
            }).then(r => r.json());
            sourcecodeeditor.value = airesponse.choices[0].message.content;
            toggleIndeterminateProgress(false);
        });
        const savebutton = this.shadowRoot.getElementById('savebutton');
        savebutton.addEventListener('click', () => this.save());

        const deploybutton = this.shadowRoot.getElementById('deploybutton');
        this.bundletypeselect = this.shadowRoot.getElementById('bundletypeselect');
        await new Promise(r => setTimeout(() => r(), 100));
        this.bundletypeselect.addEventListener('change', () => sourcecodeeditor.setEnvCompletions(this.bundletypeselect.value));
        this.bundletypeselect.value = lastSelectedBundleType;

        deploybutton.addEventListener('click', async () => {
            if (this.bundletypeselect.value == '') {
                this.shadowRoot.querySelector('#selectTargetContractTypeSnackbar').show();
                return;
            }

            const deployContractDialog = this.shadowRoot.getElementById('deploy-contract-dialog');
            deployContractDialog.show();
            if (await new Promise(resolve => {
                deployContractDialog.querySelectorAll('mwc-button').forEach(b => b.addEventListener('click', (e) => {
                    resolve(e.target.getAttribute('dialogaction'));
                }))
            }) == 'deploy') {
                toggleIndeterminateProgress(true);
                await this.save();
                const source = sourcecodeeditor.value;
                let deployMethodName = 'post_javascript';
                const deployContract = async (deposit = undefined) => {
                    let retryDeploying = true;
                    while (retryDeploying) {
                        try {
                            console.log('deploy contract with deposit', deposit);
                            await deployJScontract(source, deposit, deployMethodName);
                            this.shadowRoot.querySelector('#successDeploySnackbar').show();
                            retryDeploying = false;
                        } catch (e) {
                            console.error(e);
                            if (e.message.indexOf('insufficient deposit for storage') >= 0) {
                                await deployContract(getSuggestedDepositForContract(source.length));
                                toggleIndeterminateProgress(false);
                            } else if (
                                e.message.indexOf('Contract method is not found') >= 0 ||
                                e.message.indexOf('Cannot find contract code for account') >= 0
                            ) {
                                console.log(`Deploying ${this.bundletypeselect.value} contract wasm because of ${e.message}`);
                                let wasmUrl = WASM_URLS[this.bundletypeselect.value];

                                await deployStandaloneContract(
                                    new Uint8Array(await fetch(new URL(wasmUrl))
                                        .then(r => r.arrayBuffer()))
                                );
                            } else if (e.message.indexOf('The contract is not initialized') >= 0) {
                                await initNFTContract();
                            } else {
                                const errorDeployContractDialog = this.shadowRoot.getElementById('error-deploying-contract-dialog');
                                errorDeployContractDialog.querySelector('#errormessage').textContent = e.message;
                                errorDeployContractDialog.show();
                                retryDeploying = false;
                            }
                        }
                    }
                    toggleIndeterminateProgress(false);
                };

                deployMethodName = 'post_javascript';
                await deployContract();
            }
        });

        const simulatebutton = this.shadowRoot.getElementById('simulatebutton');
        this.simulationOutputArea = this.shadowRoot.querySelector('#simulationoutput');

        simulatebutton.addEventListener('click', async () => {
            nearenv.reset_output();
            const depositInputValue = this.shadowRoot.querySelector('#depositinput').value;
            const signer_account_id = this.shadowRoot.querySelector('#signeraccountidinput').value;

            const selectedMethod = this.shadowRoot.querySelector('#methodselect').value;
            if (selectedMethod) {
                try {
                    const simulationInstance = await getContractSimulationInstance();
                    const args = this.shadowRoot.querySelector('#argumentsinput').value;
                    if (depositInputValue) {
                        nearenv.set_attached_deposit(BigInt(depositInputValue));
                    } else {
                        nearenv.set_attached_deposit(0n);
                    }
                    nearenv.set_signer_account_id(signer_account_id);
                    
                    nearenv.set_args_string(args);
                    
                    simulationInstance[selectedMethod]();
                } catch (e) {
                    console.error(e);
                }
                this.simulationOutputArea.textContent = `${nearenv.log_output.join('\n')}
${nearenv.latest_return_value}
`;

                this.simulationContext = {
                    selectedMethod: selectedMethod,
                    arguments: this.shadowRoot.querySelector('#argumentsinput').value,
                    deposit: this.shadowRoot.querySelector('#depositinput').value,
                };
                localStorage.setItem('lastSimulationContext', JSON.stringify(this.simulationContext));
            } else {
                this.shadowRoot.querySelector('#selectMethodSnackbar').show();
            }
        });

        const lastSimulationContextJSON = localStorage.getItem('lastSimulationContext');
        if (lastSimulationContextJSON) {
            this.simulationContext = JSON.parse(lastSimulationContextJSON);
            this.shadowRoot.querySelector('#methodselect').value = this.simulationContext.selectedMethod;
            this.shadowRoot.querySelector('#argumentsinput').value = this.simulationContext.arguments;
            this.shadowRoot.querySelector('#depositinput').value = this.simulationContext.deposit;
        }
    }

    async save() {
        const source = this.sourcecodeeditor.value;
        localStorage.setItem('lastSavedSourceCode', source);
        localStorage.setItem('lastSelectedBundleType', this.bundletypeselect.value);
        const methodselect = this.shadowRoot.querySelector('#methodselect');
        await loadContractWasmIntoSimulator(this.bundletypeselect.value);

        try {
            const simulationInstance = await getContractSimulationInstance();
    
            const methodnames = Object.keys(simulationInstance);
            this.exportedMethodNames = methodnames;
            methodselect.querySelectorAll('mwc-list-item').forEach(li => li.remove());
            methodnames.forEach(methodname => {
                const option = document.createElement('mwc-list-item');
                option.innerHTML = methodname;
                option.value = methodname;
                methodselect.appendChild(option);
            });

            nearenv.set_args({
                javascript: source
            });
            nearenv.set_attached_deposit(0n);
            simulationInstance.post_javascript();

            this.simulationOutputArea.innerHTML = '';
            if (this.simulationContext) {
                setTimeout(() => methodselect.value = this.simulationContext.selectedMethod, 0);
            }
        } catch (e) {
            this.simulationOutputArea.innerHTML = e;
            const compileErrorSnackbar = this.shadowRoot.querySelector('#compileErrorSnackbar');
            compileErrorSnackbar.show();
        }
    }
}

customElements.define('code-page', CodePageComponent)