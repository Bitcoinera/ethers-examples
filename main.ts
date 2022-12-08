import * as ethers from "ethers";
import { BytesLike } from "ethers";
import dotenv from "dotenv";

dotenv.config();

/// Create priv & public keys pair
const signingKey = new ethers.utils.SigningKey(
  <BytesLike>process.env.PRIVATE_KEY
);

// Derive public key from private key
const publicKey = ethers.utils.computePublicKey(
  <BytesLike>process.env.PRIVATE_KEY
);
console.log(
  `Comparing that both public keys are the same:\n${signingKey.publicKey}\n${publicKey}\n`
);

// Derive address from public key
const address = ethers.utils.computeAddress(publicKey);
const addressFromPrivateKey = ethers.utils.computeAddress(
  signingKey.privateKey
);
console.log(
  `Comparing that both addresses are the same:\n${address}\n${addressFromPrivateKey}\n`
);

// Sign a transaction
(async () => {
  const provider = new ethers.providers.AlchemyProvider(
    "goerli",
    process.env.ALCHEMY_GOERLI_KEY
  );
  const wallet = new ethers.Wallet(signingKey.privateKey);
  const rawTx = {
    to: "0xddB51f100672Cb252C67D516eb79931bf27cE3E6",
    value: ethers.utils.parseEther("0.001"),
    data: ethers.utils.toUtf8Bytes("Hello World"),
    nonce: await provider.getTransactionCount(wallet.address),
    gasLimit: 25000,
    gasPrice: await provider.getGasPrice(),
  };

  const signedTx = await wallet.signTransaction(rawTx);
  console.log(`signedTx: ${signedTx}\n`);

  const tx = await provider.sendTransaction(signedTx);
  console.log(`Transaction hash: ${tx.hash}\n`);

  // Validate a transaction
  const castTx = await provider.getTransaction(tx.hash);
  console.log(
    `Check that the transaction is sent by our address:\n${castTx.from}\n${address}\n`
  );
})();
