use aiken/hash.{Blake2b_224, Hash}
use aiken/list
use aiken/string
use aiken/transaction.{
  DatumHash, InlineDatum, Input, NoDatum, Output, OutputReference, ScriptContext,
  Spend, Transaction, TransactionId,
}
use aiken/transaction/credential.{VerificationKey}

type Datum {
  filehash: ByteArray,
  checkcount: Int,
}

type Redeemer {
  Increment
  Withdraw
}

//vkey is owner address
validator(vkey: Hash<Blake2b_224, VerificationKey>) {
  fn incrementOrCreate(
    datum: Datum,
    redeemer: Redeemer,
    context: ScriptContext,
  ) -> Bool {
    //2 ways to redeem utxo
    when redeemer is {
      Increment -> increment(datum, redeemer, context, vkey)
      //withdraw the ada
      Withdraw -> False
    }
  }
}

fn increment(
  datum: Datum,
  redeemer: Redeemer,
  context: ScriptContext,
  vkey: VerificationKey,
) -> Bool {
  let must_be_signed = list.has(context.transaction.extra_signatories, vkey)
  expect Spend(out_ref) = context.purpose
  let input: Input = get_input(out_ref, context)
  expect Some(output) =
    list.find(
      context.transaction.outputs,
      fn(output: Output) -> Bool { input.output.address == output.address },
    )
  //data is generic data type for plutus
  //: Datum is just for dev
  let out_datum: Datum = get_datum(output, context) |> to_datum
  let truth = out_datum.filehash == datum.filehash
  let increment_check = datum.checkcount == out_datum.checkcount + 1
  and {
    truth,
    increment_check,
  }
}

fn to_datum(data: Data) -> Datum {
  expect return_data: Datum = data
  //last line is to return data
  return_data
}

fn get_input(out_ref: OutputReference, context: ScriptContext) -> Input {
  expect Some(return_input) =
    list.find(
      context.transaction.inputs,
      fn(input: Input) -> Bool { input.output_reference == out_ref },
    )
  return_input
}

fn get_datum(output: Output, context: ScriptContext) -> Data {
  when output.datum is {
    DatumHash(hash) ->
      when
        transaction.find_datum(
          context.transaction.outputs,
          context.transaction.datums,
          hash,
        )
      is {
        Some(data) -> data
        _ -> fail
      }
    InlineDatum(data) -> data
    _ -> fail
  }
}
