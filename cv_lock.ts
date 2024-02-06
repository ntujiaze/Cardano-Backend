import {
    Blockfrost,
    C,
    Constr,
    Data,
    Lucid,
    SpendingValidator,
    TxHash,
    fromHex,
    toHex,
    fromText,
    utf8ToHex,
    applyParamsToScript,
    applyDoubleCborEncoding,
  } from "https://deno.land/x/lucid@0.10.7/mod.ts";
  import * as cbor from "https://deno.land/x/cbor@v1.4.1/index.js";
   
  const lucid = await Lucid.new(
    new Blockfrost(
      "https://cardano-preview.blockfrost.io/api/v0",
      "previewUGvbckCZYrUgeaY0TiDivTHJPINq1Nk9"
    ),
    "Preview"
  );

  lucid.selectWalletFromPrivateKey(await Deno.readTextFile("./me.sk"));

const ownerPublicKeyHash = lucid.utils.getAddressDetails(
  await lucid.wallet.address()
).paymentCredential.hash;
console.log("ownerPublicKeyHash: " + ownerPublicKeyHash);

const pkh = Data.to(new Constr<Data>(0, [ownerPublicKeyHash]));

const validator = await readValidator();

async function readValidator(): Promise<SpendingValidator> {
  const validator = JSON.parse(await Deno.readTextFile("plutus.json"))
    .validators[0];
  const param_validator = applyParamsToScript(validator.compiledCode, [pkh]);
  return {
    type: "PlutusV2",
    script: applyDoubleCborEncoding(param_validator),
  };
}

//placeholder
let userfilehash:string = "hello world";

const Datum = Data.Object({
    filehash: Data.Bytes(), 
    checkcount: Data.Integer(), 
  });

type Datum = Data.Static<typeof Datum>;

const datum = Data.to<Datum>(
    {
        filehash: fromText(userfilehash), 
        checkcount: BigInt(0), 
    },
    Datum
  );

  const txLock = await lock(1000000, { into: validator, datum: datum });
   
  await lucid.awaitTx(txLock);
   
  console.log(`1 tADA locked into the contract
      Link: https://preview.cexplorer.io/tx/${txLock}
      Tx ID: ${txLock}
      Datum: ${datum}
      Filehash: ${userfilehash}
  `);

  async function lock(lovelace, { into, datum }): Promise<TxHash> {
    const contractAddress = lucid.utils.validatorToAddress(into);
   
    const tx = await lucid
      .newTx()
      .payToContract(contractAddress, { inline: datum }, { lovelace })
      .complete();
   
    const signedTx = await tx.sign().complete();
   
    return signedTx.submit();
  }
