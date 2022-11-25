//FIXME accessor methods or not opaque?
@genType.opaque
type genericDist =
  | PointSet(PointSetTypes.pointSetDist)
  | SampleSet(SampleSetDist.t)
  | Symbolic(SymbolicDistTypes.symbolicDist)

type asAlgebraicCombinationStrategy = AsDefault | AsSymbolic | AsMonteCarlo | AsConvolution

@genType
module DistributionOperation = {
  @genType
  type pointsetXSelection = [#Linear | #ByWeight]

  type toFloat = [
    | #Mode
    | #Stdev
    | #Variance
  ]
}
