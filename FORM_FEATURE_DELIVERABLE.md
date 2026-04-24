## Table of Contents

1. [Architecture & Design Choices](#1-architecture--design-choices)
2. [Data Flow](#2-data-flow)
3. [Programmatic Interface](#3-programmatic-interface)
4. [API / Payload Specification](#4-api--payload-specification)
5. [Quality Assurance Strategy](#5-quality-assurance-strategy)
6. [List Handling for Large Input Sets](#6-list-handling-for-large-input-sets)
7. [Code Sharing with Submodules](#7-code-sharing-with-submodules)
8. [Developer Experience](#8-developer-experience)

---

## 1. Architecture

### 1.1 Problem

Marketeers need to collect a few text inputs from customers . The form configuration ( labels, styles) is created in Bloomreach Engagement profile. The SDK must fetch it, render it natively, track submitted values, and call success/error callbacks.

### 1.2 Component tree

```
FormWrapper        ← entry point , fetch data
  │
  │
  └─ Form         ← state , tracking  features
       │
       └─ FormInput ← render input
```

| File                                | Responsibility                                                                                                                      |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `src/features/Form/FormWrapper.tsx` | Fetch data from `useFormFetch`, shows `renderDuringLoading` while loading, calls `onFetchError` on failure, passes data to `Form`.  |
| `src/features/Form/Form.tsx`        | Renders form layout, stores input values in `useRef`, calls `form_shown` and `form_submit` tracking events, prevents double-submit. |
| `src/features/Form/FormInput.tsx`   | Renders a single input. Returns `null` for unknown types.                                                                           |
| `src/features/Form/types.ts`        | Type definitions (`FormResponse`, `FormInput`, `FormProps`) + runtime assertion function `isFormResponse`.    


### 1.3 Why `useRef` for input values 

`useRef` stores values without triggering a re-render on every key press, so the whole form doesn't re-render on each character. The submit handler send useRef object with all values to server.

### 1.4 Form Validation

`validationHandler` runs inside `submitHandler`.

```ts
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
  if (!validationHandler()) return; // exit before trackEvent if invalid
  setSubmitting(true);
  // ...
};
```

If validation fails, a generic error message is shown above the submit button and `trackEvent('form_submit')` is not called . The `required` prop comes from the server response for each input.

### 1.5 Preventing Multiple Submissions

```tsx
const [submitting, setSubmitting] = useState(false);

const submitHandler = async () => {
  if (submitting) return;
  setSubmitting(true);
  try {
    await Exponea.trackEvent('form_submit', {
      formData: data.current,
      placeholderId: placeholderId,
    });
    onSuccessSubmit?.();
  } catch (error) {
    onErrorSubmit?.(error);
  } finally {
    setSubmitting(false);
  }
};

<TouchableOpacity onPress={submitHandler} disabled={submitting}>
  <Text>{submitButtonTitle}</Text>
</TouchableOpacity>;
```

### 1.7 Runtime assertion

```ts
 function isFormResponse(value: unknown): asserts value is FormResponse {
  if (!value || typeof value !== 'object')
    throw new Error('Invalid response: payload is not an object');
  const v = value as Partial<FormResponse>;
  if (
    !Array.isArray(v.inputList) ||
    typeof v.submitButtonTitle !== 'string'  ||
    typeof v.placeholderId !== 'string' ||
    v.placeholderId.trim() === '' ||
    v.submitButtonTitle.trim() === ''

  )
    throw new Error('Invalid response: missing required fields');
  if (v.inputList.length <= 0)
    throw new Error('Invalid response: inputList is empty');
}
```
### 1.8 Web SDK — axios and `isConfigured` check

We need to check `isConfigured()` before making request to server.

`axios` throws errors on HTTP errors (4xx, 5xx status codes) , has interceptors and baseURL config

```ts
static async fetchForm(
  placeholderId: string,
  signal?: AbortSignal
): Promise<FormResponse> {
  if (!(await this.isConfigured())) {
    throw new Error('Exponea SDK is not configured');
  }
  const { baseUrl, projectToken, applicationId, authorizationToken } = this.config;
  const res = await axios.get(
    `${baseUrl}/v2/projects/${projectToken}/forms/${placeholderId}`,
    {
      params: { applicationId },
      headers: {
        Authorization: `Bearer ${authorizationToken}`,
        'X-Exponea-SDK-Version': 'web-1.0.0',
        'X-Request-Id': crypto.randomUUID(),
      },
      signal,
    }
  );
  const body: unknown = res.data;
  isFormResponse(body);
  return body;
}
```


### 1.9 Abort request on unmount

- **React Native:** Using `useRef` for preventing state update on unmount

  ```ts
  const isMounted = useRef(true);

  useEffect(() => {
    const init = async () => {
      try {
        const jsonData = await Exponea.fetchForm(placeholderId);
        isFormResponse(jsonData);
        if (isMounted.current) setData(jsonData);
      } catch (error) {
        if (isMounted.current) onFetchError?.(error);
      } finally {
        if (isMounted.current) setLoading(false);
      }
    };
    init();
    return () => {
      isMounted.current = false;
    };
  }, [placeholderId]);
  ```

- **Web SDK:** Uses `AbortController` — the signal is passed directly to `fetch()`, which cancels the HTTP request at the browser level.

  ```ts
  useEffect(() => {
    const controller = new AbortController();
    await Exponea.fetchForm(placeholderId, controller.signal).then(setData);
    return () => controller.abort();
  }, [placeholderId]);
  ```

---

## 2. Data Flow

```
 App
  │   
  ▼
FormWrapper
  │  
  ▼
useFormFetch → Exponea.fetchForm(placeholderId)
  │  
  ▼
FormResponse  ──► isFormResponse()  ──► setData(response)
                                              │
                                              ▼
                                         <Form …/>
                                                         │
                                              trackEvent('form_shown', { placeholderId })
                                                         │
                                              user fills fields (ref updated per keystroke)
                                                         │
                                              user taps submit
                                                         │
                                              trackEvent('form_submit', { placeholderId, formData })
                                                         │
                                              ┌──────────┴──────────┐
                                              ▼                     ▼
                                        onSuccessSubmit()     onErrorSubmit(err)
```

---

## 3. Programmatic Interface

### 3.1 React Native

```tsx
import { FormWrapper } from 'exponea-react-native-sdk';

<FormWrapper
  placeholderId="signup-newsletter"
  onSuccessSubmit={() => navigation.navigate('ThankYou')}
  onErrorSubmit={(error) => showToast('Could not submit')}
  onFetchError={(error) => showToast('Could not load form')}
  renderDuringLoading={() => <ActivityIndicator />}
/>;
```

### 3.2 Props

| Prop                  | Type                       | Required | Description                                                                                   |
| --------------------- | -------------------------- | -------- | --------------------------------------------------------------------------------------------- |
| `placeholderId`       | `string`                   | yes      | ID from marketeer Engagement.                                  |
| `onSuccessSubmit`     | `() => void`               | no       | Called after a successful `form_submit` call.                                        |
| `onErrorSubmit`       | `(error: unknown) => void` | no       | Called if  submit call throwed error.                                              |
| `onFetchError`        | `(error: unknown) => void` | no       | Called if `fetchForm` or `isFormResponse` throwed error  , show a fallback UI on fetch failure. |
| `renderDuringLoading` | `() => React.ReactElement` | no       | Rendered during loading.                                                                      |
| `onClose`             | `() => void`               | no       | Called when the user taps the close button.                                                   |

### 3.3 Low-level method (advanced use)

```ts
import { fetchForm } from 'exponea-react-native-sdk';

const config = await fetchForm('signup-newsletter');
```

---

## 4. API / Payload Specification

### 4.1 Endpoint

```
GET /v2/projects/{projectToken}/forms/{placeholderId}/
```

### 4.2 Request

**Query parameters**

| Name            | Required | Description                |
| --------------- | -------- | -------------------------- |
| `applicationId` | yes      | Identifies the calling app (marketeer can have multiple apps) |

**Maximum input count**

The maximum number of inputs per form is configured in Bloomreach Engagement per project and enforced by the server.

**Headers**

| Header                  | Value                         |
| ----------------------- | ----------------------------- |
| `Authorization`         | `Bearer <authorizationToken>` |
| `X-Exponea-SDK-Version` | SDK version.   |
| `X-Request-Id`          | UUID for debug.   |
| `Content-Type`  | `application/json; charset=utf-8`                |
| `Accept`  | `application/json; charset=utf-8`                |



**Example request**

```
GET /v2/projects/abc123/forms/signup-newsletter?applicationId=com.example.app
Authorization: Bearer public-token-xyz
Accept: application/json; charset=utf-8
X-Exponea-SDK-Version: 3.0.0
X-Request-Id: 5f2a1d5d-3d7e-4f2a-9a0c-1f7e2b9c8a33
Content-Type: application/json; charset=utf-8
```

### 4.3 Success response

**Status:** `200`

**Response headers**

| Header          | Purpose                                          |
| --------------- | ------------------------------------------------ |
| `Content-Type`  | `application/json; charset=utf-8`                |
| `Cache-Control` | `public, max-age=60, stale-while-revalidate=120` |

**Example body**

```json
{
  "placeholderId": "signup-newsletter",
  "submitButtonTitle": "Subscribe",
  "backgroundColor": "#F7F7F9",
  "inputList": [
    {
      "type": "text",
      "id": "email",
      "title": "Email",
      "placeholder": "you@example.com",
      "keyboardType": "email-address",
      "required": true,
      "titleStyle": { "fontSize": 14, "color": "#111" },
      "inputTextStyle": { "fontSize": 16, "color": "#222" }
    },
  ]
}
```

### 4.4 Error responses

All errors use a consistent JSON schema:

```ts
type ApiError = {
  error: {
    code: string;
    message: string;
    requestId?: string;
    details?: Record<string, unknown>;
  };
};
```

| HTTP | `error.code`            | When                                |
| ---- | ----------------------- | ----------------------------------- |
| 400  | `invalid_request`       | Missing query params.     |
| 401  | `unauthorized`          | Missing Authorization.              |
| 404  | `placeholder_not_found` | Unknown or unpublished placeholder. |
| 5xx  | `internal_error`        | Server error                        |

### 4.5 Versioning policy

- **v1 is append-only.** New fields can be added to the response; existing fields are never removed or renamed.
- **Breaking changes** require a new major version with `v3` url prefix. Server must continue serving `v2` for a 3 month.
- **Unknown type handling:** SDK renders null for unknown `FormInput.type` values, so old SDK do not crash on new input variants the server has started sending.

---

## 5. Quality Assurance Strategy

### 5.1 TurboModule tests

Check that `fetchForm('id')` serializes to `'["id"]'` , check responce body.

```ts
test('fetchForm', () => {
  const response = mockExponea.fetchForm('mock-placeholder-id');
  expect(mockExponea.lastArgumentsJson).toBe('["mock-placeholder-id"]');
  expect(response).toEqual(mockFormResponse('mock-placeholder-id'));
});
```

### 5.2 Unit tests — `isFormResponse`

| Case                              | Expected                           |
| --------------------------------- | ---------------------------------- |
| `null`                            | error                              |
| non-object                        | error                             |
| `inputList` not an array          | error                             |
| missing/empty `inputList`         | error                             |
| missing/empty `submitButtonTitle` | error                             |
| missing/empty `placeholderId`     | error                             |
| unknown extra fields              | passes                             |
| valid payload             | passes                             |

### 5.3 Unit tests — `useFormFetch`

Mock `Exponea.fetchForm` .
| Scenario                                   | Assertion                                                     |
| ------------------------------------------ | ------------------------------------------------------------- |
| fetch resolves with valid payload          | `data` equals the payload, `loading` is `false`               |
| fetch rejects                              | `onFetchError` called, `data` is `null`, `loading` is `false` |
| `loading` is `true` while fetch in progress| `loading` is `true` during request                            |
| unmount before fetch resolves              | `onFetchError` and `setData` are not called after unmount |
| `placeholderId` changes                    | new fetch is triggered with the updated id                    |

### 5.4 Component tests — `Form`

Using React Native Testing Library:

| Scenario                                    | Assertion                                              |
| ------------------------------------------- | ------------------------------------------------------ |
| Renders all inputs from `inputList`         | input titles visible                                   |
| `form_shown` called on mount                | `trackEvent` called once with correct args             |
| Typing trigger updates in  ref          | ref value matches typed text                           |
| Submit button is calling `form_submit`      | `trackEvent` called with `{ placeholderId, formData }` |
| `onSuccessSubmit` called on success         | callback called                                        |
| `onErrorSubmit` called on error             | callback called with error                             |
| Double-tap on submit button                 | `trackEvent` called exactly once                       |
| Submit button disabled while submitting     | `disabled={true}` on button                            |
| `backgroundColor` applied to container      | style prop correct                                     |
| `backgroundImage` renders `ImageBackground` | component is rendered                                  |

### 5.5 Component tests — `FormInput`

Using React Native Testing Library:

| Scenario                                     | Assertion                    |
| -------------------------------------------- | ---------------------------- |
| `type: 'text'` renders label and `TextInput` | both are rendered            |
| `required` renders asterisk                  | `*` visible next to label    |
| `titleStyle` applied to label                | style prop matches           |
| `inputTextStyle` applied to `TextInput`      | `fontSize` and `color` match |
| `keyboardType` applied to `TextInput`        | `keyboardType` prop matches  |
| `onChangeText` called on input               | callback receives typed text |
| unknown `type` renders nothing               | component returns `null`     |

### 5.6 Integration test — `FormWrapper`

Mock `useFormFetch` to return a valid `FormResponse`.

- `Form` is rendered after the promise resolves.
- `renderDuringLoading` component is visible while the promise is pending.
- `onFetchError` is called if `useFormFetch` throwed error.
- Unmounting during fetch does not call `onFetchError` or render `Form` after the promise resolves.

### 5.7 E2E — example app

**Submit flow:**

1. Mount FormWrapper in app.
2. Check if there is a loader.
3. Check if there are all inputs.
4. Check styles.
5. Submit the form.
6. Form is closed.

**Close flow:**

1. Mount FormWrapper in app.
2. Check if there is a loader.
3. Check if there are all inputs.
4. Check styles.
5. Close the form.
6. Form is closed.

## 6. List Handling for Large Input Sets

The current specification has 5 inputs, so using simple `map` is okay. If we are going to increase number of inputs we need to improve list handling.

### 6.1 React Native — FlatList

Replace `inputList.map(...)` in `Form` with `FlatList`:

```tsx
const keyExtractor = useCallback((item: FormInput) => item.id, []);

const renderItem = useCallback(
  ({ item }: { item: FormInput }) => (
    <FormInput
      input={item}
      onChangeText={(text) => inputHandler(text, item.id)}
      titleStyle={item.titleStyle}
      inputTextStyle={item.inputTextStyle}
    />
  ),
  [inputHandler]
);

const getItemLayout = useCallback(
  (_data: unknown, index: number) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  }),
  []
);

<FlatList
  data={formConfig.inputList}
  keyExtractor={keyExtractor}
  renderItem={renderItem}
  initialNumToRender={5}
  getItemLayout={getItemLayout}
/>
```

`FlatList` virtualises the list, so only visible items are mounted.

### 6.2 Web — react-virtualized

On the Web SDK, use `react-virtualized`

```tsx
import { List } from 'react-virtualized';

<List
  width={containerWidth}
  height={600}
  rowCount={formConfig.inputList.length}
  rowHeight={80}
  rowRenderer={({ index, key, style }) => (
    <div key={key} style={style}>
      <FormInputWeb input={formConfig.inputList[index]} />
    </div>
  )}
/>;
```

---

## 7. Code Sharing with Submodules

The shared submodule do not contains platform imports. Platform-specific components are imported from outside, so the same component logic runs on both React Native and Web.

### 7.1 What can be shared

**`types.ts`** — Pure TypeScript. `FormResponse`, `FormInput`, `FormProps`,  `isFormResponse`.

**`Form.tsx` and `FormInput.tsx`** — The layout logic, input state management, submit handling, and tracking calls. The only difference is which primitive components are used (`View` vs `div`, `TextInput` vs `input`). This can be solved by importing UI components from outside

```tsx
// React Native
import { Box } from '@exponea/ui-components';
<Box  ... /> // View

// Web
import { Box } from '@exponea/ui-components';
<Box  ... /> // div
```

### 7.2 What stays platform-specific

- Primitive implementations — `View` / `div`, `TextInput` / `input`, `ImageBackground` / CSS `background-image`
- Style types — `ViewStyle` / `TextStyle` (RN) vs. `React.CSSProperties` (Web)
- List rendering — `FlatList` with `getItemLayout` (RN) vs. `react-virtualized` (Web)
- Data fetching — TurboModule  (RN) vs. browser `axios` with `AbortController` (Web)

---

## 8. Developer Experience

### 8.1 `__DEV__` console logs

All logs are managed by `__DEV__`. In dev mode  __DEV__ = true, in prod mode  __DEV__ = false. For  prod build, the dev logs are removed by the bundler.

| Location                               | Log                                                 |
| -------------------------------------- | --------------------------------------------------- |
| `FormWrapper` — after successful fetch | `[FormWrapper] Fetched form data: {...}`            |
| `Form` — after successful submit       | `[Form] submitted payload: {...}`                   |
| `FormInput` — unknown `input.type`     | `[FormInput] Unknown input type: "dropdown"` (warn) |
| `FormErrorBoundary` — in case render error   | `[FormErrorBoundary] Render error:', error, info.componentStack"` (error) |

### 8.2 Error boundary

If any component inside the form tree cause error during render, the boundary catches it, logs the full component stack in dev mode, and renders fallback component instead of crashing the app.

```tsx
<FormErrorBoundary fallback={fallback}>
  <FormWrapperInner ... />
</FormErrorBoundary>
```

---
