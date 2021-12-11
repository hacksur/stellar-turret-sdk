require('dotenv').config()

import test from 'ava';
import { TurretSDK } from '../index';
import path from 'path';


test('Upload a contract', async (t) => {
  const turret = new TurretSDK({domain_name: process.env.TURRET_URL || 'https://tss.hacksur.com', auth_key: process.env.ACCOUNT_SECRET_KEY });
  await turret.setup()
  const contractPath = path.join(__dirname, '..', '..', 'contracts', 'txFunction-raw.js');


  const res = await turret.uploadContract(contractPath, [
    {
      name: 'source',
      type: 'string',
      description: 'This is a source',
      rule: 'Required'
    },
    {
      name: 'destination',
      type: 'string',
      description: 'This is a destination',
      rule: 'Required'
    }
  ]);
  console.log(res)

  t.pass();
});