import {
    Blockfrost,
    C,
    Constr,
    Data,
    Lucid,
    SpendingValidator,
    applyDoubleCborEncoding,
    applyParamsToScript,
    TxHash,
    Datum,
    fromHex,
    toHex,
    fromText,
    utf8ToHex,
    OutRef,
    Redeemer,
  } from "https://deno.land/x/lucid@0.10.7/mod.ts";
  import * as cbor from "https://deno.land/x/cbor@v1.4.1/index.js";
   
  const lucid = await Lucid.new(
    new Blockfrost(
      "https://cardano-preview.blockfrost.io/api/v0",
      "previewUGvbckCZYrUgeaY0TiDivTHJPINq1Nk9"
    ),
    "Preview"
  );
  
  const Datum = Data.Object({
    filehash: Data.Bytes(), 
    checkcount: Data.Integer(), 
  });
  
  const redeemer = Data.to(new Constr(0, []));
  console.log(redeemer);
  lucid.selectWalletFromPrivateKey(await Deno.readTextFile("./me.sk"));
  
  function hexToUtf8(hexString: string): string {
    const hexArray = hexString.match(/.{1,2}/g);
    if (!hexArray) {
      throw new Error('Invalid hex string');
    }
  
    const utf8Array = new Uint8Array(hexArray.map(byte => parseInt(byte, 16)));
  
    const decoder = new TextDecoder();
    return decoder.decode(utf8Array);
  }  

  const ownerPublicKeyHash = lucid.utils.getAddressDetails(
    await lucid.wallet.address()
  ).paymentCredential.hash;
  console.log("ownerPublicKeyHash: " + ownerPublicKeyHash);
   
  async function readValidator(): Promise<SpendingValidator> {
    const validator = JSON.parse(await Deno.readTextFile("plutus.json"))
      .validators[0];
    return {
      type: "PlutusV2",
      script: applyParamsToScript(applyDoubleCborEncoding(validator.compiledCode), [ownerPublicKeyHash]),
    };
  }
  
  const utxo: OutRef = { txHash: Deno.args[0], outputIndex: 0 };

  const [utxoinfo] = await lucid.utxosByOutRef([utxo]);
  console.log(utxoinfo);
  const serializedData: Datum =  utxoinfo.datum;
  const deserializedData = Data.from(serializedData, Datum);
  const filehashfromdatum:string = hexToUtf8(deserializedData.filehash);
  const checkcountfromdatum = Number(deserializedData.checkcount);
  console.log("filehashfromdatum: " + filehashfromdatum);
  console.log("checkcountfromdatum:" + checkcountfromdatum);
  
  const new_datum = await Data.to<Datum>(
    {
        filehash: fromText(filehashfromdatum), 
        checkcount: BigInt(checkcountfromdatum+1), 
    },
    Datum
  );

  const validator = await readValidator();
  const txLock = await unlock(1000000, utxo, {
    from: validator,
    using: redeemer,
  });
   
  async function unlock(
    lovelace,
    ref: OutRef,
    { from, using }: { from: SpendingValidator; using: Redeemer }
  ): Promise<TxHash> {
    const [utxo] = await lucid.utxosByOutRef([ref]);
    console.log("utxo done");
    const tx = await lucid
      .newTx()
      .addSigner(ownerPublicKeyHash)
      .collectFrom([utxo], using)
      .payToContract(lucid.utils.validatorToAddress(from), { inline: new_datum }, lovelace)
      .attachSpendingValidator(from)
      .complete();

    console.log("tx done");
   
    const signedTx = await tx
      .sign()
      .complete();

    console.log("signed tx done");
   
    return signedTx.submit(); 
  }
  
  console.log(`1 tADA locked into the contract
        Link: https://preview.cexplorer.io/tx/${txLock}
        Tx ID: ${txLock}
    `);
