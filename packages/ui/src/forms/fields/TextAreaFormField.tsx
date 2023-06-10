import { FieldPath, FieldValues } from "react-hook-form";

import { FormField } from "../common/FormField.js";
import { CommonStringFieldProps } from "../common/types.js";
import {
  StyledTextArea,
  type StyledTextAreaProps,
} from "../styled/StyledTextArea.js";

export function TextAreaFormField<
  TValues extends FieldValues,
  TName extends FieldPath<TValues> = FieldPath<TValues>
>({
  placeholder,
  ...fieldProps
}: CommonStringFieldProps<TValues, TName> &
  Pick<StyledTextAreaProps, "placeholder">) {
  return (
    <FormField {...fieldProps}>
      {(inputProps) => (
        <StyledTextArea {...inputProps} placeholder={placeholder} />
      )}
    </FormField>
  );
}
