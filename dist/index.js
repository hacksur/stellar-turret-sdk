"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TurretSDK = void 0;
const node_fetch_1 = __importDefault(require("node-fetch"));
const toml_1 = __importDefault(require("toml"));
const stellar_sdk_1 = require("stellar-sdk");
const form_data_1 = __importDefault(require("form-data"));
const fs_1 = __importDefault(require("fs"));
const bignumber_js_1 = __importDefault(require("bignumber.js"));
const HORIZON_URL = 'https://horizon-testnet.stellar.org';
const server = new stellar_sdk_1.Server(HORIZON_URL);
const STELLAR_NETWORK = 'TESTNET';
class TurretSDK {
    constructor(config) {
        this.config = config;
    }
    async setup() {
        try {
            const { domain_name } = this.config;
            const response = await (0, node_fetch_1.default)(`${domain_name}/.well-known/stellar.toml`);
            const data = await response.text();
            const { TSS } = toml_1.default.parse(data);
            if (TSS.TURRETS) {
                const promises = TSS.TURRETS.map(async (account) => {
                    return await this.getAccountData(account);
                });
                const turrets = await Promise.all(promises);
                // Validate if Turrets the same.
                const checkVersion = turrets.map((turret) => {
                    return turret.info.version === turrets[0].info.version;
                });
                const checkTrust = turrets.map((turret) => {
                    return turret.toml.find((account) => account === turrets[0].toml[0]) && true;
                });
                const checkNetwork = turrets.map((turret) => {
                    return turret.info.network === turrets[0].info.network;
                });
                const isSameVersion = checkVersion.every(Boolean);
                const isTrustedBySiblings = checkTrust.every(Boolean);
                const isSameNetwork = checkNetwork.every(Boolean);
                // if (!isSameVersion) {
                //   throw { message: 'Turrets must run the same version.'}
                // } else if (!isTrustedBySiblings) {
                //   throw { message: 'Turrets must trust each others.'}
                // } else if (!isSameNetwork) {
                //   throw { message: 'Turrets must run in the same Network'}
                // } else {
                //   this.turrets = turrets;
                // }
                this.turrets = turrets;
            }
        }
        catch (error) {
            console.log(error);
        }
    }
    async getAccountData(account) {
        try {
            const response = await (0, node_fetch_1.default)(`${HORIZON_URL}/accounts/${account}`);
            const { home_domain, account_id } = await response.json();
            if (home_domain) {
                const { TURRETS: toml } = await this.getTurretToml(home_domain);
                const TURRET_INFO = await this.getTurretInfo(home_domain);
                if (TURRET_INFO.account_id === account_id) {
                    return { home_domain, account_id, toml, info: TURRET_INFO };
                }
            }
            else {
                throw { message: 'Turrets must add Home Domain' };
            }
        }
        catch (error) {
            console.log(error);
        }
    }
    async getTurretToml(home_domain) {
        try {
            const response = await (0, node_fetch_1.default)(`https://${home_domain}/.well-known/stellar.toml`);
            const data = await response.text();
            const { TSS } = toml_1.default.parse(data);
            return TSS;
        }
        catch (error) {
            console.log(error);
        }
    }
    async getTurretInfo(home_domain) {
        try {
            const response = await (0, node_fetch_1.default)(`https://${home_domain}/`);
            const { turret: account_id, version, fee, divisor, horizon, network, runner } = await response.json();
            return { account_id, version, fee, divisor, horizon, network, runner };
        }
        catch {
        }
    }
    async getTxFunction(txFunctionsHash) {
        try {
        }
        catch (error) {
            console.log(error);
        }
    }
    async uploadContract(path, fields) {
        try {
            const { turrets } = this;
            if (turrets) {
                const turret = turrets[0].account_id;
                const file = await this.readFile(path);
                const txFunctionFields = Buffer.from(JSON.stringify(fields)).toString('base64');
                const cost = await this.getTxCost(file, txFunctionFields);
                const xdr = await this.getContractFeeXDR(turrets[0].account_id, cost);
                const formData = new form_data_1.default();
                formData.append('txFunction', file);
                formData.append('txFunctionFields', txFunctionFields);
                formData.append('txFunctionFee', xdr);
                const response = await this.postContract(formData);
                if (response?.status === 200) {
                    const { data } = response;
                    const transaction = await this.addContractSigner({ signer: data.signer, turret });
                    return { hash: data.hash, signer: data.signer, transaction: transaction };
                }
                else {
                    return response;
                }
            }
        }
        catch (error) {
            console.log(error);
        }
    }
    async addContractSigner(addSigner) {
        try {
            const { auth_key } = this.config;
            if (auth_key) {
                const sourceKeypair = stellar_sdk_1.Keypair.fromSecret(auth_key);
                const transaction = await server.loadAccount(sourceKeypair.publicKey()).then((account) => {
                    return new stellar_sdk_1.TransactionBuilder(account, {
                        fee: stellar_sdk_1.BASE_FEE,
                        networkPassphrase: stellar_sdk_1.Networks[STELLAR_NETWORK],
                    })
                        .addOperation(stellar_sdk_1.Operation.setOptions({
                        signer: {
                            ed25519PublicKey: addSigner.signer,
                            weight: 1,
                        },
                    }))
                        .addOperation(stellar_sdk_1.Operation.manageData({
                        name: `TSS_${addSigner.turret}`,
                        value: addSigner.signer,
                    }))
                        .setTimeout(0)
                        .build();
                });
                transaction.sign(sourceKeypair);
                return await server.submitTransaction(transaction);
            }
            else {
                throw { message: 'Must initialize config with secret key.' };
            }
        }
        catch {
        }
    }
    async readFile(path) {
        return new Promise((resolve, reject) => {
            fs_1.default.readFile(path, function (error, data) {
                if (error) {
                    reject(error);
                }
                else {
                    resolve(data);
                }
            });
        });
    }
    async postContract(formData) {
        try {
            if (formData instanceof form_data_1.default) {
                const response = await (0, node_fetch_1.default)(`${this.config.domain_name}/tx-functions`, { method: 'POST', body: formData });
                const data = response ? await response.json() : { message: "Error while uploading contract" };
                const status = response ? response.status : 400;
                return { status, data };
            }
            else {
                return { status: 400, data: { message: 'invalid FormData' } };
            }
        }
        catch (error) {
            console.log(error);
        }
    }
    async getTxCost(txFunctionBuffer, txFunctionFields) {
        try {
            const { turrets } = this;
            if (turrets) {
                const UPLOAD_DIVISOR = turrets[0].info.divisor.upload;
                const txFunctionFieldsBuffer = Buffer.from(JSON.stringify(txFunctionFields), 'base64');
                const txFunctionConcat = Buffer.concat([txFunctionBuffer, txFunctionFieldsBuffer]);
                return new bignumber_js_1.default(txFunctionConcat.length).dividedBy(UPLOAD_DIVISOR).toFixed(7);
            }
        }
        catch (error) {
            console.log(error);
        }
    }
    async getContractFeeXDR(turret, cost) {
        try {
            const { auth_key } = this.config;
            if (auth_key) {
                const sourceKeypair = stellar_sdk_1.Keypair.fromSecret(auth_key);
                const transaction = await server.loadAccount(sourceKeypair.publicKey()).then((account) => {
                    return new stellar_sdk_1.TransactionBuilder(account, {
                        fee: stellar_sdk_1.BASE_FEE,
                        networkPassphrase: stellar_sdk_1.Networks[STELLAR_NETWORK],
                    })
                        .addOperation(stellar_sdk_1.Operation.payment({
                        destination: turret,
                        asset: stellar_sdk_1.Asset.native(),
                        amount: cost,
                    }))
                        .setTimeout(0)
                        .build();
                });
                transaction.sign(sourceKeypair);
                return transaction.toXDR();
            }
            else {
                throw { message: 'Must initialize config with secret key to get a Signed XDR' };
            }
        }
        catch {
        }
    }
}
exports.TurretSDK = TurretSDK;
//# sourceMappingURL=index.js.map