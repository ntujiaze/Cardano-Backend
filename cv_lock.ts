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

const validator = await readValidator();
   
  async function readValidator(): Promise<SpendingValidator> {
    const validator = JSON.parse(await Deno.readTextFile("plutus.json")).validators[0];
    return {
      type: "PlutusV2",
      script: toHex(cbor.encode(fromHex(validator.compiledCode))),
    };
  }

let userfilehash:string = "hello world";

const Datum = Data.Object({
    filehash: Data.Bytes(), 
    checkcount: Data.Integer(), 
  }, {
    hasConstr: false,
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