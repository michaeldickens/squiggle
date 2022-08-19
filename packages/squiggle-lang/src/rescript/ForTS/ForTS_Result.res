open ForTS__Types

@genType let isError = (r: result_<'a, 'e>): bool => Belt.Result.isError(r)
@genType let isOk = (r: result_<'a, 'e>): bool => Belt.Result.isOk(r)

@genType
let getError = (r: result_<'a, 'e>): option<'e> =>
  switch r {
  | Ok(_) => None
  | Error(e) => Some(e)
  }

@genType
let getValue = (r: result_<'a, 'e>): option<'a> =>
  switch r {
  | Ok(v) => Some(v)
  | Error(_) => None
  }

@module("ForTS_Result_tag") @scope("ResultTag")
external rtOk_: int = "RtOk"

@module("ForTS_Result_tag") @scope("ResultTag")
external rtError_: int = "RtError"

@genType
let getTag = (r: result_<'a, 'e>): int =>
  switch r {
  | Ok(_) => rtOk_
  | Error(_) => rtError_
  }
