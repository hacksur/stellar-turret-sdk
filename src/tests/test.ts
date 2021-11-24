require('dotenv').config()

import test from 'ava';
import { TurretSDK } from '../index';
import path from 'path';


test('Upload a contract', async (t) => {
  const turret = new TurretSDK({ config: {domain_name: process.env.TURRET_URL || 'https://tss.hacksur.workers.dev', auth_key: process.env.ACCOUNT_SECRET_KEY }});
  await turret.setup()
  const contractPath = path.join(__dirname, '..', '..', 'contracts', 'txFunction-raw.js');

  const res = await turret.uploadContract(contractPath, [
    {
      name: 'name',
      type: 'string',
      description: 'This is a param',
      rule: 'Required'
    }
  ]);
  console.log(res)

  t.pass();
});