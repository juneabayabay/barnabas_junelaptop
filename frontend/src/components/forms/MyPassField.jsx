import * as React from 'react';
import '../../App.css';

import IconButton from '@mui/material/IconButton';
import OutlinedInput from '@mui/material/OutlinedInput';
import InputLabel from '@mui/material/InputLabel';
import InputAdornment from '@mui/material/InputAdornment';
import FormControl from '@mui/material/FormControl';
import { FormHelperText } from '@mui/material';

import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';

import { Controller } from 'react-hook-form';

export default function MyPassField(props) {
  const { label, name, control } = props;
  const [showPassword, setShowPassword] = React.useState(false);

  const handleClickShowPassword = () => setShowPassword((show) => !show);

  const handleMouseDownPassword = (event) => {
    event.preventDefault();
  };

  const handleMouseUpPassword = (event) => {
    event.preventDefault();
  };

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error }, formState }) => (
        <FormControl variant="outlined" className="myForm">
          <InputLabel htmlFor="outlined-adornment-password">{label}</InputLabel>
          <OutlinedInput
            {...field} // spreads onChange, value, name, ref
            id="outlined-adornment-password"
            error={!!error}
            type={showPassword ? 'text' : 'password'}
            value={field.value ?? ''} 
            endAdornment={
              <InputAdornment position="end">
                <IconButton
                  aria-label={
                    showPassword ? 'hide the password' : 'display the password'
                  }
                  onClick={handleClickShowPassword}
                  onMouseDown={handleMouseDownPassword}
                  onMouseUp={handleMouseUpPassword}
                  edge="end"
                >
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            }
            label={label}
          />
          <FormHelperText sx={{ color: 'md34f2f' }}>
            {error?.message}
          </FormHelperText>
        </FormControl>
      )}
    />
  );
}
