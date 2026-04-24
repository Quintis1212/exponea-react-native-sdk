export const mockFormInputList = [
  {
    type: 'text',
    id: 'email',
    title: 'Email',
    placeholder: 'you@example.com',
    keyboardType: 'email-address',
  },
  {
    type: 'text',
    id: 'first_name',
    title: 'First name',
    placeholder: 'Jane',
  },
  {
    type: 'text',
    id: 'last_name',
    title: 'Last name',
    placeholder: 'Doe',
  },
];

export const mockFormResponse = (placeholderId: string) => ({
  inputList: mockFormInputList,
  submitButtonTitle: 'Subscribe',
  placeholderId,
});
