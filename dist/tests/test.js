"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require('dotenv').config();
const ava_1 = __importDefault(require("ava"));
const index_1 = require("../index");
const path_1 = __importDefault(require("path"));
(0, ava_1.default)('Upload a contract', async (t) => {
    const turret = new index_1.TurretSDK({ domain_name: process.env.TURRET_URL || 'https://tss.hacksur.com', auth_key: process.env.ACCOUNT_SECRET_KEY });
    await turret.setup();
    const contractPath = path_1.default.join(__dirname, '..', '..', 'contracts', 'txFunction-raw.js');
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
    console.log(res);
    t.pass();
});
//# sourceMappingURL=test.js.map