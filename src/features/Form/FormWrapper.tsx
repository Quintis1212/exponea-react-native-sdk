import { Form } from './Form';
import { FormErrorBoundary } from './FormErrorBoundary';
import { useFormFetch } from './useFormFetch';
import { type FormWrapperProps } from './types';
 
const FormWrapperInner = ({
  placeholderId,
  onSuccessSubmit,
  onErrorSubmit,
  onFetchError,
  renderDuringLoading,
  onClose,
}: FormWrapperProps) => {
  const { data, loading } = useFormFetch(placeholderId, onFetchError);

  if (loading) {
    return renderDuringLoading?.() ?? null;
  }

  if (data === null) {
    return null;
  }

  return (
    <Form
      inputList={data.inputList}
      submitButtonTitle={data.submitButtonTitle}
      placeholderId={placeholderId}
      onSuccessSubmit={onSuccessSubmit}
      onErrorSubmit={onErrorSubmit}
      backgroundColor={data.backgroundColor}
      backgroundImage={data.backgroundImage}
      onClose={onClose}
    />
  );
};

export const FormWrapper = (props: FormWrapperProps,fallback: React.ReactNode) => (
  <FormErrorBoundary fallback={fallback}>
    <FormWrapperInner {...props} />
  </FormErrorBoundary>
);
