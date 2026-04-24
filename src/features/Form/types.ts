import type { ImageBackgroundProps } from 'react-native';
import type { ViewStyle } from 'react-native';
import type { KeyboardTypeOptions, TextStyle } from 'react-native';

export type FormTextInput = {
  type: 'text';
  id: string;
  title: string;
  placeholder: string;
  required?: boolean;
  keyboardType?: KeyboardTypeOptions;
  titleStyle?: {
    fontSize: TextStyle['fontSize'];
    color: TextStyle['color'];
  };
  inputTextStyle?: {
    fontSize: TextStyle['fontSize'];
    color: TextStyle['color'];
  };
};

// FormSelectInput | FormCheckboxInput
export type FormInput = FormTextInput;

export type FormProps = {
  inputList: FormInput[];
  submitButtonTitle: string;
  backgroundColor?: ViewStyle['backgroundColor'];
  backgroundImage?: {
    source: ImageBackgroundProps['source'];
    resizeMode: ImageBackgroundProps['resizeMode'];
    style?: ImageBackgroundProps['style'];
  };
  onSuccessSubmit?: () => void;
  onErrorSubmit?: (error: unknown) => void;
  placeholderId: string;
  onClose?: () => void;
};

export type FormInputProps = {
  input: FormInput;
  onChangeText: (text: string) => void;
  titleStyle?: {
    fontSize: TextStyle['fontSize'];
    color: TextStyle['color'];
  };
  inputTextStyle?: {
    fontSize: TextStyle['fontSize'];
    color: TextStyle['color'];
  };
  required?: boolean;
};

export type FormResponse = {
  inputList: FormInput[];
  submitButtonTitle: string;
  placeholderId: string;
  backgroundColor?: ViewStyle['backgroundColor'];
  backgroundImage?: {
    source: ImageBackgroundProps['source'];
    resizeMode: ImageBackgroundProps['resizeMode'];
    style?: ImageBackgroundProps['style'];
  };
};

export type FormWrapperProps = {
  placeholderId: string;
  onSuccessSubmit?: () => void;
  onErrorSubmit?: (error: unknown) => void;
  onFetchError?: (error: unknown) => void;
  renderDuringLoading?: () => React.ReactElement;
  onClose?: () => void;
}

export function isFormResponse(
  value: unknown
): asserts value is FormResponse {
  if (!value || typeof value !== 'object') {
    throw new Error('Invalid response: payload is not an object');
  }
  const v = value as Partial<FormResponse>;
  if (
    !Array.isArray(v.inputList) ||
    typeof v.submitButtonTitle !== 'string' ||
    typeof v.placeholderId !== 'string' ||
    v.placeholderId.trim() === '' ||
    v.submitButtonTitle.trim() === ''
  ) {
    throw new Error('Invalid response: missing required fields');
  }
  if (v.inputList.length <= 0) {
    throw new Error('Invalid response: inputList is empty');
  }
}
