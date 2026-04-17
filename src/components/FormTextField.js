import React from "react";
import { Controller } from "react-hook-form";
import { HelperText, TextInput } from "react-native-paper";

const FormTextField = ({ control, name, label, secureTextEntry = false, keyboardType = "default" }) => (
  <Controller
    control={control}
    name={name}
    render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
      <>
        <TextInput
          mode="outlined"
          label={label}
          value={value?.toString() || ""}
          onBlur={onBlur}
          onChangeText={onChange}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          error={Boolean(error?.message)}
          style={{ marginBottom: 2 }}
          right={error ? <TextInput.Icon icon="alert-circle" /> : null}
        />
        <HelperText type="error" visible={Boolean(error?.message)} style={{ marginBottom: 2 }}>
          {error?.message || " "}
        </HelperText>
      </>
    )}
  />
);

export default FormTextField;
