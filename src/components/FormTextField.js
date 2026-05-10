import React from "react";
import { Controller } from "react-hook-form";
import AnimatedInput from "./AnimatedInput";

const FormTextField = ({
  control,
  name,
  label,
  secureTextEntry = false,
  keyboardType = "default",
  autoCapitalize = "none",
  editable = true
}) => (
  <Controller
    control={control}
    name={name}
    render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
      <AnimatedInput
        label={label}
        value={value}
        onBlur={onBlur}
        onChangeText={onChange}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        editable={editable}
        error={error?.message}
      />
    )}
  />
);

export default FormTextField;
