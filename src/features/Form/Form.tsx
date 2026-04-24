import { ImageBackground, Text, View } from 'react-native';
import type { FormProps } from './types';
import { FormInput } from './FormInput';
import { TouchableOpacity } from 'react-native';
import { Exponea } from '../../ExponeaImpl';
import { useEffect, useRef, useState } from 'react';
import { debugLog } from './debug';

export const Form = ({
  inputList,
  submitButtonTitle,
  backgroundColor,
  backgroundImage,
  onSuccessSubmit,
  onErrorSubmit,
  placeholderId,
  onClose,
}: FormProps) => {
  const data = useRef<Record<string, string>>({});
   const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const inputHandler = (text: string, inputId: string) => {
    data.current[inputId] = text;
  };

  useEffect(() => {
    Exponea.trackEvent('form_shown', { placeholderId });
  }, []);

  const validationHandler = (): boolean => {
    const missingFields = inputList.filter(
      (input) => input.required && !data.current[input.id]?.trim()
    );
    if (missingFields.length > 0) {
      setValidationError('Please fill in all required fields.');
      return false;
    }
    setValidationError(null);
    return true;
  };

  const submitHandler = async () => {
    if (submitting) return;
    if (!validationHandler()) return;
     setSubmitting(true);

    try {
      await Exponea.trackEvent('form_submit', {
        formData: data.current,
        placeholderId: placeholderId,
      });
      debugLog('[Form] submitted payload:', data.current);

      onSuccessSubmit?.();
    } catch (error) {
      onErrorSubmit?.(error);
      return;
    } finally {
      setSubmitting(false);
    }
  };

  const content = (
    <>
      {inputList.map((input) => (
        <FormInput
          key={input.id}
          input={input}
          onChangeText={(text) => inputHandler(text, input.id)}
          titleStyle={input.titleStyle}
          inputTextStyle={input.inputTextStyle}
          required={input.required}
        />
      ))}
      {validationError && (
        <Text style={{ color: 'red' }}>{validationError}</Text>
      )}
      <TouchableOpacity onPress={submitHandler} disabled={submitting}>
        <Text>{submitButtonTitle}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onClose} disabled={submitting}>
        <Text>Close</Text>
      </TouchableOpacity>
    </>
  );

  if (backgroundImage) {
    return (
      <ImageBackground
        source={backgroundImage.source}
        resizeMode={backgroundImage.resizeMode}
        style={[{ flex: 1 }, backgroundImage.style]}
      >
        {content}
      </ImageBackground>
    );
  }

  return (
    <View style={{ backgroundColor: backgroundColor, flex: 1 }}>{content}</View>
  );
};
