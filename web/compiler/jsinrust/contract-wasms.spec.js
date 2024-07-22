import { byteArrayToBase64 } from "../../near/near.js";
import { getContractSimulationInstance, getJSEnvProperties, loadContractWasmIntoSimulator } from "./contract-wasms.js";
import * as nearenv from "./wasm-near-environment.js";

describe('contract-wasms', () => {
    it('should get built-in properties of NFT contract', async function() {
        this.timeout(10000);
        await loadContractWasmIntoSimulator('nft');
        const properties = await getJSEnvProperties();
        expect(properties).to.include.members(["panic", "value_return", "input", "block_timestamp_ms", "current_account_id",
            "signer_account_id", "verify_signed_message", "store_signing_key", "base64_encode",
            "sha256_utf8_to_base64", "get_content_base64", "contract_owner", "nft_token", "nft_supply_for_owner", "nft_tokens"]);
    });

    it('should get built-in properties of minimum-web4 contract', async function() {
        this.timeout(10000);
        await loadContractWasmIntoSimulator('minimum-web4');
        const properties = await getJSEnvProperties();
        expect(properties).to.include.members(["panic",
            "value_return",
            "input",
            "block_timestamp_ms",
            "current_account_id",
            "signer_account_id",
            "verify_signed_message",
            "store_signing_key",
            "base64_encode",
            "sha256_utf8_to_base64",
            "get_content_base64"]);
    });

    it('should simulate the NFT contract', async function() {
        this.timeout(10000);
        await loadContractWasmIntoSimulator('nft');
        const instanceExports = await getContractSimulationInstance();

        nearenv.set_args({
            javascript: `

export function nft_mint() {
    const args = JSON.parse(env.input());
    const mediastring = 'mediastring';
    
    const title = args.title;
    const description = args.description;
    return JSON.stringify({
        title: title,
        description: description,
        media: mediastring,
        media_hash: env.sha256_utf8_to_base64(mediastring),
        extra: args.extra
    });
}
    
export function nft_payout() {
    const args = JSON.parse(env.input());
    const balance = BigInt(args.balance);
    const payout = {};
    const token_obj = JSON.parse(env.nft_token(args.token_id));
    const token_owner_id = token_obj.owner_id;
    const contract_owner = env.contract_owner();
    
    const addPayout = (account, amount) => {
        if (!payout[account]) {
            payout[account] = 0n;
        }
        payout[account] += amount;
    };

    try {
        const royalties = JSON.parse(token_obj.metadata.extra).filter(extradata => extradata.trait_type == 'royalty');
        let remainingbalance = balance;
        for(const royalty of royalties) {            
            const amount = balance * BigInt(royalty.value.numerator) / BigInt(10000);
            remainingbalance -= amount;
            addPayout(royalty.value.account_id, amount);
        }
        addPayout(token_owner_id, remainingbalance);
    } catch (e) {
        const contractRoyaltyAmount = balance * BigInt(2000) / BigInt(10000);        
        addPayout(contract_owner, contractRoyaltyAmount);
        addPayout(token_owner_id, balance - contractRoyaltyAmount);
    }

    Object.keys(payout).forEach(k => payout[k] = payout[k].toString());
    return JSON.stringify({ payout });
}
`
        });
        instanceExports.post_javascript();
        nearenv.set_attached_deposit(6660000000000000000010n);
        nearenv.set_args({
            token_id: 'abc', description: 'hello',
            token_owner_id: 'lalala.near',
            extra: JSON.stringify([
                {
                    "trait_type": "website",
                    "display_type": "website",
                    "value": "https://petersalomonsen.com/"
                },
                {
                    "trait_type": "royalty",
                    "display_type": "royalty",
                    "value": { numerator: 1500, account_id: 'peter.near' }
                },
                {
                    "trait_type": "royalty",
                    "display_type": "royalty",
                    "value": { numerator: 2000, account_id: 'salomonsen.near' }
                }
            ])
        });
        instanceExports.nft_mint();
        expect(nearenv.latest_transfer_amount).to.equal(10n);
        nearenv.set_args({
            balance: 10_0000_0000n.toString(),
            token_id: "abc"
        });
        instanceExports.nft_payout();
        expect(JSON.parse(nearenv.latest_return_value)).to.deep.equal({
            "payout":
            {
                "peter.near": "150000000",
                "salomonsen.near": "200000000",
                "lalala.near": "650000000"
            }
        });
        instanceExports.nft_token();
        const tokenObj = JSON.parse(nearenv.latest_return_value);

        expect(tokenObj.metadata.media_hash).to.equal(
            await byteArrayToBase64(new Uint8Array('c8 19 f0 5b b2 b7 e9 18 cd 9 7b 6b f2 24 f d3 7a 6 a5 4 3e b3 ef 26 7d b1 19 19 a0 20 7e f0'
            .split(' ')
            .map(r => parseInt(r,16))
            )
        ));
    });
});
