import * as React from 'react';
import TextField from '@mui/material/TextField';
import { Controller } from 'react-hook-form';
import '../../App.css';

export default function MyTextField(props) {
  const { label, name, control } = props;

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error }, formState }) => (
        <TextField
            {...field}
            id="outlined-basic"
            label={label}
            variant="outlined"
            className="myForm"
            error={!!error}
            helperText={error?.message}
            value={field.value ?? ''}   // ✅ ensures controlled from the start
        />

      )}
    />
  );
}
