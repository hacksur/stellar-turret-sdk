const {
  TransactionBuilder,
  Server,
  Networks,
  BASE_FEE,
  Operation,
  Asset
} = require('stellar-sdk');

const server = new Server(HORIZON_URL);

module.exports = async (body) => {
  const { source, destination } = body;
  try {
    return server.loadAccount(source).then((account) => {
      return new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: Networks[STELLAR_NETWORK]
      })
        .addOperation(
          Operation.payment({
            destination: destination,
            asset: Asset.native(),
            amount: '1'
          })
        )
        .setTimeout(0)
        .build()
        .toXDR();
    });
  } catch (e) {
    console.error(e);
  }
};
