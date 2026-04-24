import { Text } from 'react-native';
import { View } from 'react-native';
import { TextInput } from 'react-native';
import type { FormInputProps } from './types';
import { debugWarn } from './debug';

export const FormInput = ({
  input,
  onChangeText,
  titleStyle,
  inputTextStyle,
  required,
}: FormInputProps) => {
  if (input.type === 'text') {
    return (
      <View>
        <Text style={titleStyle}>{input.title}</Text>
        {required && <Text style={{ color: 'red' }}>*</Text>}
        <TextInput
          onChangeText={onChangeText}
          placeholder={input.placeholder}
          keyboardType={input.keyboardType}
          placeholderTextColor={inputTextStyle?.color}
          style={{ fontSize: inputTextStyle?.fontSize }}
        />
      </View>
    );
  }
  debugWarn('[FormInput] Unknown input type:', input.type);
  return null;
};
