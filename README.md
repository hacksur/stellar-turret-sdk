# stellar-turret-sdk

[![build status](https://img.shields.io/travis/com/hacksur/stellar-turret-sdk.svg)](https://travis-ci.com/hacksur/stellar-turret-sdk)
[![code coverage](https://img.shields.io/codecov/c/github/hacksur/stellar-turret-sdk.svg)](https://codecov.io/gh/hacksur/stellar-turret-sdk)
[![code style](https://img.shields.io/badge/code_style-XO-5ed9c7.svg)](https://github.com/sindresorhus/xo)
[![styled with prettier](https://img.shields.io/badge/styled_with-prettier-ff69b4.svg)](https://github.com/prettier/prettier)
[![made with lass](https://img.shields.io/badge/made_with-lass-95CC28.svg)](https://lass.js.org)
[![license](https://img.shields.io/github/license/hacksur/stellar-turret-sdk.svg)](LICENSE)
[![npm downloads](https://img.shields.io/npm/dt/stellar-turret-sdk.svg)](https://npm.im/stellar-turret-sdk)

> An SDK to interact with stellar-turrets

## Table of Contents


## Install

[npm][]:

```sh
npm install stellar-turret-sdk
```

[yarn][]:

```sh
yarn add stellar-turret-sdk
```


## Usage

```js
import { TurretSDK } from 'stellar-turret-sdk';
import path from 'path';

(async () => {
  // Turret configuration to initialize.
  const config = { domain_name: 'WORKER URL', auth_key: 'ACCOUNT SECRET KEY' }
  const turret = new TurretSDK(config);
  // After creating the class you need to run setup method.
  await turret.setup()

  // Path to contract file.
  const contractPath = path.join(__dirname, "path/to/file")

  // Array with function fields.
  const txFunctionFields = [
      {
          name: 'name',
          type: 'string',
          description: 'This is a param',
          rule: 'Required'
      }
  ]
  return await turret.uploadContract(contractPath, txFunctionFields);
})()
// script
```


## Contributors


## License


##

[npm]: https://www.npmjs.com/

[yarn]: https://yarnpkg.com/
