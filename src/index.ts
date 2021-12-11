import fetch from 'node-fetch';
import toml from 'toml'
import { Server, Networks, BASE_FEE, Operation, TransactionBuilder, Asset, Keypair } from 'stellar-sdk';
import FormData from 'form-data';
import fs from 'fs'
import BigNumber from 'bignumber.js'
const HORIZON_URL = 'https://horizon-testnet.stellar.org';
const server = new Server(HORIZON_URL);
const STELLAR_NETWORK = 'TESTNET';

interface TurretInfoI {
  account_id: string,
  version: string,
  horizon: string,
  network: string,
  runner: string,
  fee: {
    min: string,
    max: string
  },
  divisor: {
    upload: string;
    run: string
  }
}

interface TurretConfigI {
  domain_name: string;
  auth_key?: string;
}

interface TurretDataI {
  home_domain: string,
  account_id: string,
  toml: string[],
  info: any
}

interface TurretSetupI {
  config: TurretConfigI;
  turrets?: TurretDataI[];
}

export class TurretSDK implements TurretSetupI {
  config: TurretConfigI
  turrets?: TurretDataI[];
  

  constructor(config: {domain_name: string, auth_key?: string}) {
    this.config = config;
  }

  async setup() {
    try {
      const { domain_name } = this.config;
      const response = await fetch(`${domain_name}/.well-known/stellar.toml`);
      const data = await response.text();
      const { TSS } = toml.parse(data);
      if (TSS.TURRETS) {
        const promises = TSS.TURRETS.map(async (account: any) => {
          return await this.getAccountData(account)
        })
        
        const turrets: TurretDataI[] = await Promise.all(promises);
          // Validate if Turrets the same.

        const checkVersion = turrets.map((turret: any) => {
          return turret.info.version === turrets[0].info.version;
        })
        const checkTrust = turrets.map((turret: any) => {
          return turret.toml.find((account: string) => account === turrets[0].toml[0]) && true
        })
        const checkNetwork = turrets.map((turret: any) => {
          return turret.info.network === turrets[0].info.network;
        })

        const isSameVersion = checkVersion.every(Boolean)
        const isTrustedBySiblings = checkTrust.every(Boolean)
        const isSameNetwork = checkNetwork.every(Boolean)

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
    } catch (error) {
      console.log(error);
    }
  }

  async getAccountData(account: string) {
    try {
      const response = await fetch(`${HORIZON_URL}/accounts/${account}`)
      const { home_domain, account_id }: {home_domain: string, account_id:string } = await response.json();
      if (home_domain) {
        const { TURRETS: toml }: { TURRETS: string[] } = await this.getTurretToml(home_domain)
        const TURRET_INFO: any = await this.getTurretInfo(home_domain)
        if (TURRET_INFO.account_id === account_id) {
          return { home_domain, account_id, toml, info: TURRET_INFO };
        } 
      } else {
        throw { message: 'Turrets must add Home Domain' }
      }
    } catch (error) {
      console.log(error);
    }
  }

  async getTurretToml(home_domain: string) {
    try {
      const response = await fetch(`https://${home_domain}/.well-known/stellar.toml`);
      const data = await response.text();
      const { TSS } = toml.parse(data);
      return TSS;
    } catch (error) {
      console.log(error);
    }
  }

  async getTurretInfo(home_domain: string) {
    try {
      const response = await fetch(`https://${home_domain}/`);
      const { turret: account_id, version, fee, divisor, horizon, network, runner } = await response.json();
      return { account_id, version, fee, divisor, horizon, network, runner  }
    } catch {

    }
  }

  async getTxFunction(txFunctionsHash: string) {
    try {
      
    } catch (error) {
      console.log(error);
    }
  }
  
  async uploadContract(path: any, fields: any[]) {
    try {
      const { turrets } = this;
      if (turrets) {
        const turret = turrets[0].account_id;
        const file = await this.readFile(path);
        const txFunctionFields = Buffer.from(JSON.stringify(fields)).toString('base64');
        const cost = await this.getTxCost(file, txFunctionFields)
        const xdr = await this.getContractFeeXDR(turrets[0].account_id, cost!);
        const formData = new FormData();
        formData.append('txFunction', file);
        formData.append('txFunctionFields', txFunctionFields);
        formData.append('txFunctionFee', xdr);
        const response = await this.postContract(formData)
        if (response?.status === 200) {
          const { data } = response;
          const transaction = await this.addContractSigner({signer: data.signer, turret})
          return { hash: data.hash, signer: data.signer, transaction: transaction}
        } else {
          return response;
        }
      }
    } catch (error) {
      console.log(error);
    }
  }

  async addContractSigner(addSigner: {signer: string, turret: string}){
    try {
      const { auth_key } = this.config;
      if (auth_key) {
        const sourceKeypair = Keypair.fromSecret(auth_key);
        const transaction = await server.loadAccount(sourceKeypair.publicKey()).then((account) => {
          return new TransactionBuilder(account, {
            fee: BASE_FEE,
            networkPassphrase: Networks[STELLAR_NETWORK],
          })
          .addOperation(
            Operation.setOptions({
              signer: {
                ed25519PublicKey: addSigner.signer,
                weight: 1,
              },
            })
          )
          .addOperation(
            Operation.manageData({
              name: `TSS_${addSigner.turret}`,
              value: addSigner.signer,
            })
          )
            .setTimeout(0)
            .build()
        });
        transaction.sign(sourceKeypair);
        return await server.submitTransaction(transaction);
      } else {
        throw { message: 'Must initialize config with secret key.'}
      }
    } catch {

    }
  }

  async readFile (path: any) {
    return new Promise((resolve, reject) => {
      fs.readFile(path, function (error, data ) {
        if (error) {
          reject(error)
        } else {
          resolve(data)
        }
      });
    })
  }

  async postContract(formData: any) {
    try {
      if (formData instanceof FormData) {
        const response = await fetch(`${this.config.domain_name}/tx-functions`, { method: 'POST', body: formData });
        const data: any = response ? await response.json() : { message: "Error while uploading contract" }
        const status: number = response ? response.status : 400
        return { status, data };
      } else {
        return { status: 400, data: { message: 'invalid FormData'} };
      }
    } catch (error) {
      console.log(error);
    }
  }

  async getTxCost(txFunctionBuffer: any, txFunctionFields: any) {
    try {
      const { turrets } = this;
      if (turrets) {
        const UPLOAD_DIVISOR = turrets[0].info.divisor.upload;
        const txFunctionFieldsBuffer = Buffer.from(JSON.stringify(txFunctionFields), 'base64');
        const txFunctionConcat = Buffer.concat([txFunctionBuffer, txFunctionFieldsBuffer])
        return new BigNumber(txFunctionConcat.length).dividedBy(UPLOAD_DIVISOR).toFixed(7)
      }
    } catch (error) {
      console.log(error);
    }
  }

  async getContractFeeXDR(turret: string, cost: string) {
    try {
      const { auth_key } = this.config;
      if (auth_key) {
        const sourceKeypair = Keypair.fromSecret(auth_key);
        const transaction = await server.loadAccount(sourceKeypair.publicKey()).then((account) => {
          return new TransactionBuilder(account, {
            fee: BASE_FEE,
            networkPassphrase: Networks[STELLAR_NETWORK],
          })
            .addOperation(
              Operation.payment({
                destination: turret,
                asset: Asset.native(),
                amount: cost,
              })
            )
            .setTimeout(0)
            .build()
        });
        transaction.sign(sourceKeypair);
        return transaction.toXDR();
      } else {
        throw { message: 'Must initialize config with secret key to get a Signed XDR'}
      }
    } catch {

    }
  }

}